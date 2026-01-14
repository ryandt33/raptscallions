# E04-T002 Implementation Specification: OpenRouter Client with Streaming

**Epic:** E04 - Chat Infrastructure
**Task:** E04-T002
**Status:** ANALYZED
**Analyst:** analyst
**Date:** 2026-01-12

---

## 1. Overview

### 1.1 Purpose

Create a robust OpenRouter AI gateway client that provides streaming chat completions using the OpenAI SDK. This client will be the foundation for all AI-powered chat functionality in RaptScallions, supporting multiple models via OpenRouter's unified API.

### 1.2 Context

- OpenRouter provides a unified API gateway compatible with OpenAI's SDK
- The client must support streaming responses for real-time chat experiences
- This is a foundational component blocking chat runtime (E04-T003) and message handling (E04-T005)
- Will be used by both Chat and Product tool types
- Must handle rate limits, timeouts, and network errors gracefully

### 1.3 Success Criteria

- Zero TypeScript errors (strict mode compliance)
- 80%+ test coverage
- Streaming works end-to-end with mocked responses
- Usage metadata (tokens) captured correctly
- All error cases handled with typed errors

---

## 2. Technical Design

### 2.1 Package Location

**Package:** `@raptscallions/ai` (new package)

**Location:** `packages/ai/`

**Structure:**

```
packages/ai/
├── src/
│   ├── client.ts           # OpenRouterClient class
│   ├── types.ts            # TypeScript types
│   ├── errors.ts           # AI-specific errors
│   ├── config.ts           # Environment config
│   ├── index.ts            # Barrel exports
│   └── __tests__/
│       ├── client.test.ts  # Unit tests
│       └── fixtures/       # Test data
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 2.2 Dependencies

**Runtime Dependencies:**

- `openai` (^4.0.0) - OpenAI SDK with OpenRouter compatibility
- `zod` (^3.22.4) - Runtime validation
- `@raptscallions/core` (workspace:\*) - Shared errors and types

**Dev Dependencies:**

- `vitest` (^1.1.0)
- `typescript` (^5.3.0)
- `@types/node` (^20.10.0)

### 2.3 Environment Configuration

**Schema (using Zod):**

```typescript
// packages/ai/src/config.ts
import { z } from "zod";

export const aiConfigSchema = z.object({
  AI_GATEWAY_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
  AI_DEFAULT_MODEL: z.string().default("anthropic/claude-sonnet-4-20250514"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000), // 2 minutes
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

// Validate and export config
export const aiConfig = aiConfigSchema.parse({
  AI_GATEWAY_URL: process.env.AI_GATEWAY_URL,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_DEFAULT_MODEL: process.env.AI_DEFAULT_MODEL,
  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
});
```

### 2.4 Type Definitions

**Core Types:**

```typescript
// packages/ai/src/types.ts
import type OpenAI from "openai";

/**
 * Message role in conversation
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * Message structure compatible with OpenAI API
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Token usage metadata from AI response
 */
export interface UsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Streaming chunk types
 */
export type StreamChunk =
  | { type: "content"; content: string }
  | { type: "usage"; usage: UsageMetadata }
  | { type: "done" };

/**
 * Options for chat completion request
 */
export interface ChatCompletionOptions {
  /** AI model to use (e.g., 'anthropic/claude-sonnet-4-20250514') */
  model?: string;

  /** Maximum tokens in response */
  maxTokens?: number;

  /** Temperature (0-2, lower = more deterministic) */
  temperature?: number;

  /** Top-p sampling (0-1) */
  topP?: number;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Complete response after streaming finishes
 */
export interface ChatCompletionResult {
  /** Full assembled content */
  content: string;

  /** Token usage metadata */
  usage: UsageMetadata;

  /** Model that generated response */
  model: string;

  /** Response finish reason */
  finishReason: "stop" | "length" | "content_filter" | "error" | null;
}
```

### 2.5 Error Handling

**Custom Error Classes:**

```typescript
// packages/ai/src/errors.ts
import { AppError, ErrorCode } from "@raptscallions/core/errors";

/**
 * Base error for AI-related issues
 */
export class AiError extends AppError {
  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message, "AI_ERROR", statusCode, details);
    this.name = "AiError";
  }
}

/**
 * API rate limit exceeded
 */
export class RateLimitError extends AiError {
  constructor(retryAfter?: number) {
    super(
      "AI API rate limit exceeded",
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = "RateLimitError";
  }
}

/**
 * Request timeout
 */
export class TimeoutError extends AiError {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`, 504, { timeoutMs });
    this.name = "TimeoutError";
  }
}

/**
 * Invalid API response
 */
export class InvalidResponseError extends AiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Invalid AI API response: ${message}`, 502, details);
    this.name = "InvalidResponseError";
  }
}

/**
 * Authentication failure
 */
export class AuthenticationError extends AiError {
  constructor() {
    super("AI API authentication failed - check API key", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Model not available
 */
export class ModelNotAvailableError extends AiError {
  constructor(model: string) {
    super(`Model not available: ${model}`, 400, { model });
    this.name = "ModelNotAvailableError";
  }
}
```

### 2.6 Client Implementation

**OpenRouterClient Class:**

````typescript
// packages/ai/src/client.ts
import OpenAI from "openai";
import { aiConfig } from "./config.js";
import {
  AiError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AuthenticationError,
  ModelNotAvailableError,
} from "./errors.js";
import type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  StreamChunk,
  UsageMetadata,
} from "./types.js";

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
  }) {
    this.client = new OpenAI({
      apiKey: options?.apiKey ?? aiConfig.AI_API_KEY,
      baseURL: options?.baseURL ?? aiConfig.AI_GATEWAY_URL,
      timeout: aiConfig.AI_REQUEST_TIMEOUT_MS,
      maxRetries: aiConfig.AI_MAX_RETRIES,
    });

    this.defaultModel = options?.defaultModel ?? aiConfig.AI_DEFAULT_MODEL;
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
   *   } else if (chunk.type === 'usage') {
   *     console.log('Tokens:', chunk.usage);
   *   }
   * }
   * ```
   */
  async *streamChat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<StreamChunk, ChatCompletionResult, undefined> {
    const model = options.model ?? this.defaultModel;

    try {
      // Create streaming request
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages,
          stream: true,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          top_p: options.topP,
        },
        {
          signal: options.signal,
          timeout: options.timeoutMs ?? aiConfig.AI_REQUEST_TIMEOUT_MS,
        }
      );

      let fullContent = "";
      let usage: UsageMetadata | undefined;
      let finishReason: ChatCompletionResult["finishReason"] = null;
      let responseModel = model;

      // Process stream chunks
      for await (const chunk of stream) {
        // Extract content delta
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content;

        if (content) {
          fullContent += content;
          yield { type: "content", content };
        }

        // Extract finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0]
            .finish_reason as ChatCompletionResult["finishReason"];
        }

        // Extract usage (usually in final chunk)
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
          yield { type: "usage", usage };
        }

        // Track actual model used (may differ from requested)
        if (chunk.model) {
          responseModel = chunk.model;
        }
      }

      // Yield done signal
      yield { type: "done" };

      // Validate we got usage metadata
      if (!usage) {
        throw new InvalidResponseError("No usage metadata in response");
      }

      // Return complete result
      return {
        content: fullContent,
        usage,
        model: responseModel,
        finishReason,
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
    let result: ChatCompletionResult | undefined;
    for await (const chunk of stream) {
      // Generator return value becomes result
    }

    // TypeScript knows result is defined after generator completes
    return result!;
  }

  /**
   * Convert errors from OpenAI SDK to typed errors
   */
  private handleError(error: unknown, model: string): Error {
    // OpenAI SDK errors
    if (error instanceof OpenAI.APIError) {
      const status = error.status;

      // Rate limiting
      if (status === 429) {
        const retryAfter = error.headers?.["retry-after"];
        return new RateLimitError(
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }

      // Authentication
      if (status === 401 || status === 403) {
        return new AuthenticationError();
      }

      // Model not available
      if (status === 400 && error.message?.includes("model")) {
        return new ModelNotAvailableError(model);
      }

      // Gateway errors
      if (status && status >= 500) {
        return new AiError(`AI gateway error: ${error.message}`, status, {
          originalError: error.message,
        });
      }

      // Other API errors
      return new AiError(error.message, status ?? 500, {
        originalError: error.message,
      });
    }

    // Timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
    }

    // Network errors
    if (
      error instanceof Error &&
      (error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND"))
    ) {
      return new AiError("Network error connecting to AI gateway", 503, {
        originalError: error.message,
      });
    }

    // Unknown errors
    if (error instanceof Error) {
      return new AiError(`Unexpected error: ${error.message}`, 500, {
        originalError: error.message,
      });
    }

    return new AiError("Unknown error occurred", 500);
  }
}

// Export singleton instance with default config
export const openRouterClient = new OpenRouterClient();
````

### 2.7 Barrel Exports

```typescript
// packages/ai/src/index.ts
export { OpenRouterClient, openRouterClient } from "./client.js";
export { aiConfig, aiConfigSchema } from "./config.js";
export type { AiConfig } from "./config.js";
export {
  AiError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AuthenticationError,
  ModelNotAvailableError,
} from "./errors.js";
export type {
  MessageRole,
  ChatMessage,
  UsageMetadata,
  StreamChunk,
  ChatCompletionOptions,
  ChatCompletionResult,
} from "./types.js";
```

---

## 3. Testing Strategy

### 3.1 Test Coverage Requirements

- **Target:** 80%+ line coverage
- **Critical paths:** All error scenarios, streaming logic, usage metadata extraction
- **Mock strategy:** Mock OpenAI SDK responses, no real API calls

### 3.2 Test Structure

```typescript
// packages/ai/src/__tests__/client.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import OpenAI from "openai";
import { OpenRouterClient } from "../client.js";
import {
  RateLimitError,
  TimeoutError,
  AuthenticationError,
  ModelNotAvailableError,
  InvalidResponseError,
} from "../errors.js";

// Mock OpenAI SDK
vi.mock("openai", () => {
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
    APIError: class extends Error {
      status?: number;
      headers?: Record<string, string>;
      constructor(
        message: string,
        status?: number,
        headers?: Record<string, string>
      ) {
        super(message);
        this.status = status;
        this.headers = headers;
      }
    },
  };
});

describe("OpenRouterClient", () => {
  let client: OpenRouterClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create client with test config
    client = new OpenRouterClient({
      apiKey: "test-key",
      baseURL: "https://test.openrouter.ai",
      defaultModel: "test/model",
    });

    // Get reference to mocked create method
    mockCreate = (OpenAI as any).mock.results[0].value.chat.completions.create;
  });

  describe("streamChat", () => {
    it("should stream content chunks", async () => {
      // Arrange
      const mockStream = [
        {
          choices: [{ delta: { content: "Hello" } }],
          model: "test/model",
        },
        {
          choices: [{ delta: { content: " world" } }],
          model: "test/model",
        },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "test/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      const chunks: string[] = [];
      const stream = client.streamChat([{ role: "user", content: "Hi" }]);

      for await (const chunk of stream) {
        if (chunk.type === "content") {
          chunks.push(chunk.content);
        }
      }

      // Assert
      expect(chunks).toEqual(["Hello", " world"]);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "test/model",
          messages: [{ role: "user", content: "Hi" }],
          stream: true,
        }),
        expect.any(Object)
      );
    });

    it("should yield usage metadata", async () => {
      // Arrange
      const mockStream = [
        {
          choices: [{ delta: { content: "Test" } }],
          model: "test/model",
        },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "test/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      let usage: any;
      const stream = client.streamChat([{ role: "user", content: "Test" }]);

      for await (const chunk of stream) {
        if (chunk.type === "usage") {
          usage = chunk.usage;
        }
      }

      // Assert
      expect(usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it("should return complete result", async () => {
      // Arrange
      const mockStream = [
        { choices: [{ delta: { content: "Hello" } }], model: "test/model" },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "test/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      const stream = client.streamChat([{ role: "user", content: "Hi" }]);
      let result: any;

      for await (const chunk of stream) {
        // Consume stream
      }

      // Get return value
      const gen = client.streamChat([{ role: "user", content: "Hi" }]);
      for await (const chunk of gen) {
        // Generator completes
      }

      // Assert - we'll need to capture the return value differently
      // This is a known testing challenge with async generators
    });

    it("should throw RateLimitError on 429", async () => {
      // Arrange
      const error = new (OpenAI as any).APIError("Rate limit", 429, {
        "retry-after": "60",
      });
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat([{ role: "user", content: "Test" }]);

      await expect(async () => {
        for await (const chunk of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow(RateLimitError);
    });

    it("should throw AuthenticationError on 401", async () => {
      // Arrange
      const error = new (OpenAI as any).APIError("Unauthorized", 401);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat([{ role: "user", content: "Test" }]);

      await expect(async () => {
        for await (const chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AuthenticationError);
    });

    it("should throw ModelNotAvailableError on invalid model", async () => {
      // Arrange
      const error = new (OpenAI as any).APIError("Invalid model", 400);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat([{ role: "user", content: "Test" }], {
        model: "invalid/model",
      });

      await expect(async () => {
        for await (const chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(ModelNotAvailableError);
    });

    it("should throw TimeoutError on abort", async () => {
      // Arrange
      const error = new Error("Aborted");
      error.name = "AbortError";
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat([{ role: "user", content: "Test" }]);

      await expect(async () => {
        for await (const chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(TimeoutError);
    });

    it("should throw InvalidResponseError when no usage metadata", async () => {
      // Arrange - stream with no usage
      const mockStream = [
        { choices: [{ delta: { content: "Test" } }], model: "test/model" },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          model: "test/model",
        },
        // No usage!
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act & Assert
      const stream = client.streamChat([{ role: "user", content: "Test" }]);

      await expect(async () => {
        for await (const chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(InvalidResponseError);
    });

    it("should use default model when not specified", async () => {
      // Arrange
      const mockStream = [
        {
          choices: [{ delta: { content: "Test" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "test/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      const stream = client.streamChat([{ role: "user", content: "Test" }]);
      for await (const chunk of stream) {
        // Consume
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "test/model" }),
        expect.any(Object)
      );
    });

    it("should pass through completion options", async () => {
      // Arrange
      const mockStream = [
        {
          choices: [{ delta: { content: "Test" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "custom/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      const stream = client.streamChat([{ role: "user", content: "Test" }], {
        model: "custom/model",
        maxTokens: 100,
        temperature: 0.7,
        topP: 0.9,
      });

      for await (const chunk of stream) {
        // Consume
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom/model",
          max_tokens: 100,
          temperature: 0.7,
          top_p: 0.9,
        }),
        expect.any(Object)
      );
    });
  });

  describe("chat", () => {
    it("should return complete result from stream", async () => {
      // Arrange
      const mockStream = [
        {
          choices: [{ delta: { content: "Hello world" } }],
          model: "test/model",
        },
        {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: "test/model",
        },
      ];

      mockCreate.mockResolvedValue(createAsyncIterator(mockStream));

      // Act
      const result = await client.chat([{ role: "user", content: "Hi" }]);

      // Assert
      expect(result).toMatchObject({
        content: "Hello world",
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        model: "test/model",
        finishReason: "stop",
      });
    });
  });
});

// Test helper: create async iterator from array
async function* createAsyncIterator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}
```

### 3.3 Test Fixtures

```typescript
// packages/ai/src/__tests__/fixtures/index.ts

export const mockMessages = {
  simple: [{ role: "user" as const, content: "Hello" }],
  conversation: [
    { role: "system" as const, content: "You are a helpful assistant." },
    { role: "user" as const, content: "What is TypeScript?" },
    { role: "assistant" as const, content: "TypeScript is..." },
    { role: "user" as const, content: "Tell me more" },
  ],
};

export const mockStreamChunks = {
  complete: [
    {
      choices: [{ delta: { content: "Hello" } }],
      model: "test/model",
    },
    {
      choices: [{ delta: { content: " world" } }],
      model: "test/model",
    },
    {
      choices: [{ delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      model: "test/model",
    },
  ],

  withoutUsage: [
    { choices: [{ delta: { content: "Test" } }], model: "test/model" },
    { choices: [{ delta: {}, finish_reason: "stop" }], model: "test/model" },
  ],
};
```

---

## 4. Package Configuration

### 4.1 package.json

```json
{
  "name": "@raptscallions/ai",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist *.tsbuildinfo",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "openai": "^4.0.0",
    "zod": "^3.22.4",
    "@raptscallions/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.1.0"
  }
}
```

### 4.2 tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4.3 vitest.config.ts

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: "@raptscallions/ai",
      environment: "node",
    },
  })
);
```

---

## 5. Integration Points

### 5.1 Usage in Chat Runtime (E04-T003)

```typescript
// Future usage in apps/api/src/services/chat.service.ts
import { openRouterClient } from "@raptscallions/ai";

async function* streamChatResponse(sessionId: string, userMessage: string) {
  // Load session messages from DB
  const messages = await loadSessionMessages(sessionId);

  // Add user message
  messages.push({ role: "user", content: userMessage });

  // Stream response
  const stream = openRouterClient.streamChat(messages, {
    model: "anthropic/claude-sonnet-4-20250514",
  });

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      yield chunk.content;
    } else if (chunk.type === "usage") {
      // Store usage metadata
      await storeUsageMetadata(sessionId, chunk.usage);
    }
  }
}
```

### 5.2 Dependency Injection for Testing

```typescript
// Chat service can accept custom client for testing
export class ChatService {
  constructor(
    private db: DbClient,
    private aiClient: OpenRouterClient = openRouterClient
  ) {}

  // Service methods use this.aiClient
}
```

---

## 6. Environment Setup

### 6.1 Required Variables

Add to `.env.example`:

```bash
# AI Gateway Configuration
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# Optional: AI request settings
AI_REQUEST_TIMEOUT_MS=120000
AI_MAX_RETRIES=2
```

### 6.2 Local Development

For testing without real API:

```bash
# Use mock gateway (future: test server)
AI_GATEWAY_URL=http://localhost:3001/mock
AI_API_KEY=test-key
AI_DEFAULT_MODEL=test/model
```

---

## 7. Acceptance Criteria Mapping

| AC   | Requirement                                     | Implementation                                               |
| ---- | ----------------------------------------------- | ------------------------------------------------------------ |
| AC1  | OpenRouterClient class with chat method         | ✅ `OpenRouterClient` class with `streamChat()` and `chat()` |
| AC2  | Uses openai package with OpenRouter base URL    | ✅ OpenAI SDK initialized with `baseURL` from config         |
| AC3  | Streaming enabled via stream: true parameter    | ✅ `stream: true` passed to `completions.create()`           |
| AC4  | Model selection from tool config or env default | ✅ `options.model` or `defaultModel` from config             |
| AC5  | Error handling for rate limits, timeouts, etc   | ✅ Typed errors with `handleError()` method                  |
| AC6  | Returns async generator for streaming chunks    | ✅ `streamChat()` is `AsyncGenerator<StreamChunk>`           |
| AC7  | Final response includes usage metadata (tokens) | ✅ `ChatCompletionResult` with `UsageMetadata`               |
| AC8  | Environment variables setup                     | ✅ Config schema with validation                             |
| AC9  | Tests verify streaming and error handling       | ✅ Comprehensive test suite with mocked SDK                  |
| AC10 | TypeScript types for responses                  | ✅ Full type definitions in `types.ts`                       |

---

## 8. Implementation Checklist

- [ ] Create `packages/ai/` directory structure
- [ ] Add to workspace in `pnpm-workspace.yaml`
- [ ] Create `package.json` with dependencies
- [ ] Implement `config.ts` with Zod validation
- [ ] Implement `types.ts` with complete type definitions
- [ ] Implement `errors.ts` with typed error classes
- [ ] Implement `client.ts` with `OpenRouterClient` class
  - [ ] Constructor with config
  - [ ] `streamChat()` async generator
  - [ ] `chat()` convenience method
  - [ ] `handleError()` error converter
- [ ] Create `index.ts` barrel exports
- [ ] Write unit tests in `__tests__/client.test.ts`
  - [ ] Streaming tests (happy path)
  - [ ] Usage metadata tests
  - [ ] Error handling tests (all error types)
  - [ ] Options passing tests
  - [ ] Non-streaming `chat()` tests
- [ ] Create test fixtures
- [ ] Run `pnpm test` - achieve 80%+ coverage
- [ ] Run `pnpm typecheck` - zero errors
- [ ] Update root workspace config to include package
- [ ] Add environment variables to `.env.example`
- [ ] Document usage in package README (optional)

---

## 9. Non-Functional Requirements

### 9.1 Performance

- **Streaming latency:** < 100ms to first chunk
- **Memory:** Streaming should not buffer entire response
- **Timeout:** Default 2 minutes, configurable

### 9.2 Reliability

- **Retry logic:** Built into OpenAI SDK (max 2 retries)
- **Error recovery:** All errors mapped to typed exceptions
- **Graceful degradation:** Timeouts don't crash, throw `TimeoutError`

### 9.3 Security

- **API key:** Never logged or exposed in errors
- **Validation:** All config validated at startup with Zod
- **Secrets:** Use environment variables, never hardcode

### 9.4 Observability

- **Logging:** Use structured logging from `@raptscallions/telemetry` (future)
- **Metrics:** Track token usage, latency, error rates (future)
- **Tracing:** OpenTelemetry spans for AI requests (future)

---

## 10. Known Limitations

1. **Generator return value testing:** Testing the return value of an async generator is challenging in Vitest. The returned `ChatCompletionResult` may need integration tests.

2. **No retry visibility:** OpenAI SDK handles retries internally. We can't emit events for retry attempts without wrapping the SDK more extensively.

3. **Model availability:** OpenRouter's model availability can change. We detect 400 errors mentioning "model" but can't proactively validate.

4. **No request cancellation tracking:** While we support `AbortSignal`, we can't track partial progress when cancelled.

---

## 11. Future Enhancements

1. **Telemetry integration:** Add OpenTelemetry spans for AI requests
2. **Response caching:** Cache responses for identical requests (with TTL)
3. **Request queueing:** Rate limit requests across application
4. **Model routing:** Auto-select model based on prompt characteristics
5. **Cost tracking:** Track estimated costs per request
6. **Streaming SSE:** Direct Server-Sent Events support for frontend
7. **Prompt templates:** Built-in template system for common patterns
8. **Response validation:** Validate AI responses match expected schema

---

## 12. Dependencies and Blockers

### 12.1 Depends On

- ✅ E01-T002: Error infrastructure in `@raptscallions/core` (completed)
- ✅ Package infrastructure and monorepo setup (completed)

### 12.2 Blocks

- 🚧 E04-T003: Chat runtime service (needs AI client)
- 🚧 E04-T005: Message persistence and streaming (needs AI client)

### 12.3 Related Tasks

- E04-T004: SSE endpoint (will use streaming from client)
- E04-T006: Tool YAML parser (will use models from config)

---

## 13. Review Criteria

### 13.1 Code Review Checklist

- [ ] Zero TypeScript errors (`pnpm typecheck`)
- [ ] Zero linting errors (`pnpm lint`)
- [ ] 80%+ test coverage
- [ ] All tests passing
- [ ] No `any` types used
- [ ] Errors properly typed and handled
- [ ] Config validated with Zod
- [ ] Streaming tested with mocks
- [ ] Usage metadata extracted correctly
- [ ] All edge cases covered (rate limit, timeout, auth, etc.)
- [ ] Code follows conventions in `CONVENTIONS.md`
- [ ] No hardcoded secrets or API keys

### 13.2 QA Checklist

- [ ] Can create client with default config
- [ ] Can create client with custom config
- [ ] Streaming works end-to-end (with mocks)
- [ ] Non-streaming `chat()` works
- [ ] Rate limit errors thrown correctly
- [ ] Timeout errors thrown correctly
- [ ] Auth errors thrown correctly
- [ ] Invalid model errors thrown correctly
- [ ] Usage metadata present in final result
- [ ] Environment variables validated on startup

---

## 14. UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** ⚠️ **Needs Revision**

### Executive Summary

This specification defines an OpenRouter AI client for streaming chat completions. Since this is a backend SDK component, the review focuses on **Developer Experience (DX)**. The spec demonstrates strong type safety, error handling, and API design principles. However, there is one critical issue with the generator return value pattern that will cause confusion for developers consuming this API.

### Critical Issues (Must Fix)

#### 1. Generator Return Value is Inaccessible

**Issue:** The `streamChat` method returns `ChatCompletionResult` via the async generator's return value, but this is nearly impossible to access in JavaScript/TypeScript:

```typescript
async *streamChat(): AsyncGenerator<StreamChunk, ChatCompletionResult, undefined>
```

**Problem:**

```typescript
// ❌ Developer cannot easily access the return value
const stream = client.streamChat(messages);
for await (const chunk of stream) {
  // Can only see yielded chunks, not return value
}
// How do I get ChatCompletionResult with usage metadata?
```

**Impact:**

- Critical metadata (usage tokens, finish reason) is trapped in an inaccessible return value
- The spec itself acknowledges testing this is "challenging" (section 10.1, line 1158)
- Developers will be confused and frustrated
- Makes the `chat()` convenience method problematic (uses `result!` non-null assertion)

**Recommendation (Choose One):**

**Option A (Preferred): Yield final result as last chunk**

```typescript
export type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult }; // Contains everything

async *streamChat(): AsyncGenerator<StreamChunk> {
  // ... streaming logic ...

  yield { type: 'done', result: { content, usage, model, finishReason } };
}
```

**Option B: Return object with both stream and promise**

```typescript
export interface StreamingResponse {
  stream: AsyncGenerator<StreamChunk>;
  result: Promise<ChatCompletionResult>;
}

streamChat(): StreamingResponse {
  // Implementation tracks both
}
```

**Verdict:** 🔴 **Must Fix Before Implementation**

---

### Quality Issues (Should Fix)

#### 2. Inconsistent Streaming Patterns

**Issue:** Usage metadata appears both as a yielded chunk (line 370) and in the return value, creating two sources of truth:

```typescript
// During stream
yield { type: 'usage', usage };

// Also in return
return { content, usage, model, finishReason };
```

**Problem:** Developers won't know which to trust or when each is available.

**Recommendation:** If using Option A above, remove the intermediate `usage` chunk and only include it in the final `done` chunk. This makes the API more predictable.

**Verdict:** 🟡 **Should Fix** - Reduces cognitive load

---

#### 3. Non-Streaming `chat()` Method Implementation

**Issue:** The `chat()` method (lines 407-421) has several problems:

```typescript
async chat(messages, options): Promise<ChatCompletionResult> {
  const stream = this.streamChat(messages, options);
  let result: ChatCompletionResult | undefined;
  for await (const chunk of stream) {
    // Does nothing with chunks!
  }
  return result!; // Dangerous non-null assertion
}
```

**Problems:**

1. Non-null assertion will crash if generator fails unexpectedly
2. Discards all streamed chunks without using them
3. No error handling if stream ends early without usage metadata

**Recommendation:**

```typescript
async chat(messages, options): Promise<ChatCompletionResult> {
  const stream = this.streamChat(messages, options);

  let content = '';
  let usage: UsageMetadata | undefined;
  let finishReason: ChatCompletionResult['finishReason'] = null;
  let model = options.model ?? this.defaultModel;

  for await (const chunk of stream) {
    if (chunk.type === 'content') {
      content += chunk.content;
    } else if (chunk.type === 'done' && chunk.result) {
      return chunk.result;
    }
  }

  throw new InvalidResponseError('Stream ended without completion');
}
```

**Verdict:** 🟡 **Should Fix** - Improves reliability

---

### Suggestions (Nice-to-Have)

#### 4. Missing Cancellation Feedback

**Issue:** Developers using `AbortSignal` get no indication in the stream when cancellation occurs - the stream just stops.

**Recommendation:**

```typescript
export type StreamChunk =
  | { type: "content"; content: string }
  | { type: "cancelled" } // New type
  | { type: "done"; result: ChatCompletionResult };
```

**Verdict:** 🔵 **Suggestion** - Better DX but not critical

---

#### 5. Environment Variable Naming Consistency

**Issue:** Mixing generic (`AI_*`) with specific naming:

```bash
AI_GATEWAY_URL=...      # Generic
AI_DEFAULT_MODEL=...    # Why "DEFAULT"?
AI_MAX_RETRIES=...      # Generic
```

**Recommendation:** Be consistent - either all generic (`AI_MODEL`) or all specific (`OPENROUTER_*`).

**Verdict:** 🔵 **Suggestion** - Minor consistency improvement

---

### Strengths

1. **Excellent Type Safety** - Complete TypeScript types with proper inference
2. **Clear Error Taxonomy** - Well-defined error classes for each failure mode
3. **Flexible Configuration** - Supports environment variables and constructor overrides
4. **Good Documentation** - JSDoc comments with examples
5. **Consistent Patterns** - Follows project conventions (Zod validation, typed errors, AAA tests)
6. **Dependency Injection Ready** - Easy to mock for testing

---

### Consistency with Platform

**Aligned:**

- ✅ Uses Zod for config validation (CLAUDE.md requirement)
- ✅ Extends `AppError` from `@raptscallions/core`
- ✅ Follows functional style over OOP
- ✅ TypeScript strict mode compliant
- ✅ AAA test pattern

**Gaps:**

- Telemetry integration mentioned as "future" - should clarify timeline
- No integration with `@raptscallions/telemetry` logger yet

---

### Final Recommendation

**Status:** ⚠️ **Needs Revision**

**Blocking Issue:** The async generator return value pattern (Issue #1) must be addressed before implementation. Recommend using Option A (yield final result as last chunk) as it's more idiomatic for Node.js streams.

**Next Steps:**

1. Update `StreamChunk` type to include `done` variant with full result
2. Update `streamChat()` to yield final result instead of returning it
3. Update `chat()` implementation to handle new pattern
4. Update tests to verify new streaming pattern
5. Consider addressing Issues #2 and #3 for better quality

**Once revised, send back to analyst for spec update, then proceed to architect review.**

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** ✅ **APPROVED WITH RECOMMENDATIONS**

### Executive Summary

This specification defines the foundational AI client for OpenRouter integration using the OpenAI SDK. The architecture is sound and aligns well with the project's technology stack and conventions. However, there is one **critical issue** (async generator return value pattern) that was already identified by the UX review and must be addressed. Additionally, there are several architectural considerations that should be addressed before implementation.

### Critical Issues (Must Fix Before Implementation)

#### 1. Async Generator Return Value Anti-Pattern ⚠️

**Issue:** The designer correctly identified that using an async generator's return value is an anti-pattern in JavaScript/TypeScript. The spec shows:

```typescript
async *streamChat(): AsyncGenerator<StreamChunk, ChatCompletionResult, undefined>
```

**Problem:**

- Generator return values are nearly inaccessible in standard JavaScript iteration
- The `chat()` method uses a dangerous non-null assertion (`result!`)
- Critical metadata (usage, finish reason) trapped in return value
- The spec acknowledges this is "challenging" to test (section 10.1)

**Architectural Decision:** **Adopt Option A from UX Review**

Yield the complete result as the final chunk:

```typescript
export type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult };

async *streamChat(): AsyncGenerator<StreamChunk> {
  // ... streaming logic ...

  yield {
    type: 'done',
    result: { content: fullContent, usage, model, finishReason }
  };
}
```

**Rationale:**

- Idiomatic Node.js/JavaScript streaming pattern
- Consistent with industry practices (similar to `ReadableStream` done chunks)
- Easily testable and type-safe
- No dangerous non-null assertions needed
- All consumers can reliably access final metadata

**Impact on Implementation:**

- Update `StreamChunk` discriminated union
- Remove intermediate `usage` chunk (include only in final `done` chunk)
- Update `chat()` method to collect result from `done` chunk
- Update all tests to verify `done` chunk pattern

**Verdict:** 🔴 **MUST FIX** - Blocking architectural issue

---

### Architecture Compliance Review

#### ✅ **Aligned with Technology Stack**

| Requirement            | Compliance | Notes                                         |
| ---------------------- | ---------- | --------------------------------------------- |
| TypeScript strict mode | ✅ Yes     | No `any` types, proper type inference         |
| Zod validation         | ✅ Yes     | Config validated with Zod schema              |
| Functional style       | ✅ Yes     | Pure functions, class used appropriately      |
| Typed errors           | ✅ Yes     | Extends `AppError` from `@raptscallions/core` |
| OpenRouter gateway     | ✅ Yes     | OpenAI SDK configured for OpenRouter          |

#### ✅ **Package Structure**

The new `@raptscallions/ai` package follows monorepo conventions:

```
packages/ai/
├── src/
│   ├── client.ts           # Main implementation
│   ├── types.ts            # TypeScript types
│   ├── errors.ts           # Typed error classes
│   ├── config.ts           # Zod-validated config
│   ├── index.ts            # Barrel exports
│   └── __tests__/
│       ├── client.test.ts  # Unit tests
│       └── fixtures/       # Test data
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Recommendation:** Add this package to:

- `pnpm-workspace.yaml`
- Root `vitest.workspace.ts`
- Root `tsconfig.json` path mappings
- Root `vitest.config.ts` path aliases

---

### Quality Issues (Should Fix)

#### 2. OpenAI SDK Error Handling Incompleteness

**Issue:** The `handleError` method (lines 426-492) handles OpenAI SDK errors, but the error type checking could be more robust:

```typescript
if (error instanceof OpenAI.APIError) {
  // Handles API errors
} else if (error instanceof Error && error.name === "AbortError") {
  // Handles timeouts
}
```

**Architectural Concern:** What about network errors during streaming? The OpenAI SDK can throw various error types:

- `APIConnectionError` - Network/connection failures
- `APITimeoutError` - Request timeouts (different from AbortError)
- `APIUserAbortError` - User-initiated cancellation
- `RateLimitError` - Rate limiting (already handled via status code)

**Recommendation:**

```typescript
import OpenAI from 'openai';

private handleError(error: unknown, model: string): Error {
  // OpenAI SDK specific errors
  if (error instanceof OpenAI.APIError) {
    // ... existing logic
  }

  // Connection errors
  if (error instanceof OpenAI.APIConnectionError) {
    return new AiError(
      'Failed to connect to AI gateway',
      503,
      { originalError: error.message }
    );
  }

  // Timeout errors (SDK-specific)
  if (error instanceof OpenAI.APITimeoutError) {
    return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
  }

  // User abort
  if (error instanceof OpenAI.APIUserAbortError) {
    return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
  }

  // Generic abort (as fallback)
  if (error instanceof Error && error.name === 'AbortError') {
    return new TimeoutError(aiConfig.AI_REQUEST_TIMEOUT_MS);
  }

  // ... existing logic for other errors
}
```

**Verdict:** 🟡 **SHOULD FIX** - Improves reliability

---

#### 3. Configuration Validation Timing

**Issue:** The config schema validates immediately on module import (line 91-97):

```typescript
export const aiConfig = aiConfigSchema.parse({
  AI_GATEWAY_URL: process.env.AI_GATEWAY_URL,
  // ...
});
```

**Architectural Concern:**

- Fails on import rather than explicit initialization
- Makes testing harder (requires env vars to be set before import)
- Violates dependency injection principles

**Recommendation:**

```typescript
// Lazy initialization
let configInstance: AiConfig | undefined;

export function getAiConfig(): AiConfig {
  if (!configInstance) {
    configInstance = aiConfigSchema.parse({
      AI_GATEWAY_URL: process.env.AI_GATEWAY_URL,
      AI_API_KEY: process.env.AI_API_KEY,
      AI_DEFAULT_MODEL: process.env.AI_DEFAULT_MODEL,
      AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
      AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
    });
  }
  return configInstance;
}

// For testing
export function resetAiConfig(): void {
  configInstance = undefined;
}
```

**Alternative:** Keep eager validation but add explanation that apps must handle startup errors.

**Verdict:** 🟡 **SHOULD FIX** - Better testing DX and error handling

---

#### 4. Missing Telemetry Integration

**Issue:** The spec mentions telemetry as "future enhancement" (section 11), but `@raptscallions/telemetry` exists and should be integrated from the start.

**Architectural Concern:**

- OpenTelemetry is in the canonical tech stack (ARCHITECTURE.md line 39)
- AI requests are high-value tracing targets (cost, latency, errors)
- Adding telemetry later requires touching all methods again

**Recommendation:** Add basic tracing now:

```typescript
import { trace } from '@raptscallions/telemetry';

async *streamChat(messages, options) {
  const span = trace.startSpan('ai.chat.stream', {
    attributes: {
      'ai.model': options.model ?? this.defaultModel,
      'ai.message_count': messages.length,
    },
  });

  try {
    // ... streaming logic ...

    span.setAttributes({
      'ai.usage.prompt_tokens': usage.promptTokens,
      'ai.usage.completion_tokens': usage.completionTokens,
      'ai.finish_reason': finishReason,
    });

    span.end();
    yield { type: 'done', result };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
    throw this.handleError(error, model);
  }
}
```

**Verdict:** 🟡 **SHOULD FIX** - Aligns with architecture, easier to add now

---

### Suggestions (Nice-to-Have)

#### 5. Environment Variable Naming Consistency

**Issue:** Generic `AI_*` prefix may conflict with other AI integrations in the future.

**Suggestion:** Consider more specific naming:

```bash
# Current (generic)
AI_GATEWAY_URL=...
AI_DEFAULT_MODEL=...

# Suggested (specific)
OPENROUTER_API_URL=...
OPENROUTER_DEFAULT_MODEL=...

# Or keep generic with namespacing
AI_OPENROUTER_URL=...
AI_OPENROUTER_MODEL=...
```

**Rationale:** If the project later adds direct Claude API access or other providers, generic `AI_*` names become ambiguous.

**Verdict:** 🔵 **SUGGESTION** - Minor future-proofing

---

#### 6. Missing Model Validation

**Issue:** The client accepts any string as a model name. Invalid models only fail at runtime during API call.

**Suggestion:** Add optional model allowlist validation:

```typescript
const modelSchema = z
  .enum([
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-opus-4",
    "openai/gpt-4",
    // ...
  ])
  .or(z.string()); // Allow arbitrary strings as escape hatch

export interface ChatCompletionOptions {
  model?: z.infer<typeof modelSchema>;
  // ...
}
```

**Verdict:** 🔵 **SUGGESTION** - Catch-errors-early principle, but adds maintenance burden

---

### Strengths of This Design

1. **Clean Separation of Concerns**

   - Config, types, errors, client all properly separated
   - Each module has single responsibility

2. **Excellent Type Safety**

   - Discriminated union for `StreamChunk`
   - Proper generic constraints
   - No `any` types

3. **Comprehensive Error Handling**

   - All error cases mapped to typed exceptions
   - Clear error taxonomy (rate limit, timeout, auth, etc.)

4. **Testability**

   - Client accepts config in constructor (dependency injection)
   - Mock-friendly design
   - Comprehensive test plan

5. **Documentation**

   - JSDoc comments with examples
   - Clear usage patterns
   - Integration examples for future tasks

6. **Alignment with Conventions**
   - Follows functional-first approach (class used where appropriate)
   - Zod for runtime validation
   - Extends core error infrastructure
   - AAA test pattern

---

### Integration Considerations

#### Blocking Dependencies

**✅ All dependencies satisfied:**

- E01-T002: Error infrastructure (`@raptscallions/core/errors`) - Completed
- Monorepo setup with pnpm workspaces - Completed

#### Downstream Dependencies

**Tasks that depend on this client:**

- E04-T003: Chat runtime service (needs `streamChat()` method)
- E04-T005: Message persistence (needs usage metadata)
- E04-T004: SSE endpoint (needs streaming chunks)

**Impact of Required Changes:**

- The async generator fix (Issue #1) may require minor updates to E04-T003 spec
- Usage metadata access pattern will be clearer after fix

---

### Deployment Considerations

#### Docker Compatibility

**✅ Package is fully containerizable:**

- Pure Node.js package, no native dependencies
- Environment variables for configuration
- No file system dependencies beyond code
- Works in stateless containers

#### Environment Setup

**Required for all deployments:**

```bash
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514
```

**Recommendation:** Add to:

- `.env.example` (for local dev)
- Heroku config (for Heroku deployments)
- Kubernetes ConfigMap/Secret (for K8s deployments)
- Docker Compose `.env` file

---

### Security Review

#### API Key Handling

**✅ Secure:**

- API key from environment variable (never hardcoded)
- Not logged in errors or responses
- Passed to OpenAI SDK securely

**⚠️ Recommendation:** Add security note to documentation about API key rotation.

#### Input Validation

**✅ Adequate:**

- Message content validated at service layer (not here)
- Options validated by TypeScript types
- Model names validated by OpenRouter API

#### Error Disclosure

**✅ Safe:**

- Generic error messages for external failures
- No sensitive data in error details
- Stack traces not exposed (handled by error middleware)

---

### Performance Considerations

#### Streaming Efficiency

**✅ Good design:**

- True streaming (chunks yielded as received)
- No buffering of entire response
- Memory-efficient for large responses

**Potential Optimization:** Consider adding backpressure handling if downstream consumers are slow.

#### Connection Pooling

**Handled by OpenAI SDK:**

- SDK manages HTTP connection pooling
- No additional implementation needed
- Max retries (2) prevents cascading failures

#### Timeout Strategy

**✅ Appropriate:**

- 2-minute default timeout (reasonable for LLM requests)
- Configurable via environment variable
- Per-request override via `options.timeoutMs`

---

### Final Architectural Recommendation

**Status:** ✅ **APPROVED WITH REQUIRED CHANGES**

This specification is architecturally sound and aligns well with the system design. The package structure, error handling, type safety, and integration patterns all follow best practices.

**Required Changes Before Implementation:**

1. **Fix Async Generator Pattern** (Critical)

   - Adopt Option A from UX review
   - Yield final result as `done` chunk
   - Update `StreamChunk` type definition
   - Fix `chat()` method implementation
   - Update all tests

2. **Enhance Error Handling** (Recommended)

   - Add handling for `APIConnectionError`, `APITimeoutError`, `APIUserAbortError`
   - Ensure all OpenAI SDK error types are covered

3. **Add Telemetry Integration** (Recommended)
   - Basic OpenTelemetry tracing for AI requests
   - Track tokens, latency, errors

**Optional Improvements:**

- Lazy config initialization (better testing DX)
- More specific environment variable naming
- Model allowlist validation

**Next Steps:**

1. Update spec to incorporate required changes
2. Send back to analyst for spec revision
3. After revision, proceed to implementation

**Estimated Impact:** Required changes add ~0.5 day to implementation timeline but significantly improve API ergonomics and reliability.

---

**End of Architecture Review**
