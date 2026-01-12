/**
 * OpenRouter AI client with streaming support
 */

import OpenAI, {
  APIError,
  APIConnectionError,
  APIUserAbortError,
} from 'openai';
import { aiConfig } from './config.js';
import {
  AiError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AuthenticationError,
  ModelNotAvailableError,
} from './errors.js';
import type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamChunk,
  UsageMetadata,
} from './types.js';

/**
 * OpenRouter AI client with streaming support
 */
export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(options?: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    // Use provided options or fallback to config
    // When all options are provided, aiConfig is not accessed (useful for testing)
    let apiKey: string;
    let baseURL: string;
    let timeout: number;
    let maxRetries: number;
    let defaultModel: string;

    if (options?.apiKey && options?.baseURL && options?.defaultModel) {
      // All required options provided - use them without accessing aiConfig
      apiKey = options.apiKey;
      baseURL = options.baseURL;
      defaultModel = options.defaultModel;
      timeout = options.timeout ?? 120000; // Default 2 minutes
      maxRetries = options.maxRetries ?? 2;
    } else {
      // Access aiConfig for missing options
      apiKey = options?.apiKey ?? aiConfig.AI_API_KEY;
      baseURL = options?.baseURL ?? aiConfig.AI_GATEWAY_URL;
      defaultModel = options?.defaultModel ?? aiConfig.AI_DEFAULT_MODEL;
      timeout = options?.timeout ?? aiConfig.AI_REQUEST_TIMEOUT_MS;
      maxRetries = options?.maxRetries ?? aiConfig.AI_MAX_RETRIES;
    }

    this.client = new OpenAI({
      apiKey,
      baseURL,
      timeout,
      maxRetries,
    });

    this.defaultModel = defaultModel;
  }

  /**
   * Stream chat completion
   *
   * @param messages - Conversation messages
   * @param options - Completion options
   * @returns Async generator yielding stream chunks
   *
   * @example
   * ```typescript
   * const client = new OpenRouterClient();
   * const stream = client.streamChat(
   *   [{ role: 'user', content: 'Hello!' }],
   *   { model: 'anthropic/claude-sonnet-4-20250514' }
   * );
   *
   * for await (const chunk of stream) {
   *   if (chunk.type === 'content') {
   *     process.stdout.write(chunk.content);
   *   } else if (chunk.type === 'done') {
   *     console.log('Tokens:', chunk.result.usage);
   *   }
   * }
   * ```
   */
  async *streamChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const model = options.model ?? this.defaultModel;

    try {
      // Create streaming request
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages,
          stream: true,
          max_tokens: options.maxTokens ?? null,
          temperature: options.temperature ?? null,
          top_p: options.topP ?? null,
        },
        {
          signal: options.signal,
          timeout: options.timeoutMs ?? aiConfig.AI_REQUEST_TIMEOUT_MS,
        }
      );

      let fullContent = '';
      let usage: UsageMetadata | undefined;
      let finishReason: ChatCompletionResult['finishReason'] = null;
      let responseModel = model;

      // Process stream chunks
      for await (const chunk of stream) {
        // Extract content delta
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content;

        if (content) {
          fullContent += content;
          yield { type: 'content', content };
        }

        // Extract finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason as ChatCompletionResult['finishReason'];
        }

        // Extract usage (usually in final chunk)
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }

        // Track actual model used (may differ from requested)
        if (chunk.model) {
          responseModel = chunk.model;
        }
      }

      // Validate we got usage metadata
      if (!usage) {
        throw new InvalidResponseError('No usage metadata in response');
      }

      // Yield done signal with complete result
      yield {
        type: 'done',
        result: {
          content: fullContent,
          usage,
          model: responseModel,
          finishReason,
        },
      };
    } catch (error) {
      throw this.handleError(error, model);
    }
  }

  /**
   * Non-streaming chat completion (convenience method)
   *
   * @param messages - Conversation messages
   * @param options - Completion options
   * @returns Complete chat result
   */
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    const stream = this.streamChat(messages, options);

    // Consume stream to get final result
    for await (const chunk of stream) {
      if (chunk.type === 'done') {
        return chunk.result;
      }
    }

    // This should never happen if streaming works correctly
    throw new InvalidResponseError('Stream ended without completion');
  }

  /**
   * Convert errors from OpenAI SDK to typed errors
   */
  private handleError(error: unknown, model: string): Error {
    // Already converted to our error types - pass through
    if (error instanceof AiError) {
      return error;
    }

    // OpenAI SDK errors
    if (error instanceof APIError) {
      const status = error.status;

      // Rate limiting
      if (status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        return new RateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }

      // Authentication
      if (status === 401 || status === 403) {
        return new AuthenticationError();
      }

      // Model not available
      if (status === 400 && error.message?.includes('model')) {
        return new ModelNotAvailableError(model);
      }

      // Gateway errors
      if (status && status >= 500) {
        return new AiError(
          `AI gateway error: ${error.message}`,
          status,
          { originalError: error.message }
        );
      }

      // Other API errors
      return new AiError(
        error.message,
        status ?? 500,
        { originalError: error.message }
      );
    }

    // Connection errors
    if (error instanceof APIConnectionError) {
      return new AiError(
        'Failed to connect to AI gateway',
        503,
        { originalError: error.message }
      );
    }

    // Timeout errors (check by name since export may vary by version)
    if (error instanceof Error && error.name === 'APITimeoutError') {
      return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
    }

    // User abort
    if (error instanceof APIUserAbortError) {
      return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
    }

    // Generic abort (as fallback)
    if (error instanceof Error && error.name === 'AbortError') {
      return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
    }

    // Network errors
    if (
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND'))
    ) {
      return new AiError(
        'Network error connecting to AI gateway',
        503,
        { originalError: error.message }
      );
    }

    // Unknown errors
    if (error instanceof Error) {
      return new AiError(
        `Unexpected error: ${error.message}`,
        500,
        { originalError: error.message }
      );
    }

    return new AiError('Unknown error occurred', 500);
  }
}

// Export singleton instance with default config
// Note: Singleton creation deferred to avoid config validation errors in tests
let clientInstance: OpenRouterClient | undefined;

export const openRouterClient = new Proxy({} as OpenRouterClient, {
  get(_target, prop) {
    if (!clientInstance) {
      clientInstance = new OpenRouterClient();
    }
    return clientInstance[prop as keyof OpenRouterClient];
  },
});
