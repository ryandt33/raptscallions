/**
 * Tests for OpenRouterClient
 *
 * Following TDD red phase - these tests will fail until implementation is complete
 */

import OpenAI, { APIError, APIConnectionError, APITimeoutError, APIUserAbortError } from 'openai';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { OpenRouterClient } from '../client.js';
import {
  RateLimitError,
  TimeoutError,
  AuthenticationError,
  ModelNotAvailableError,
  InvalidResponseError,
  AiError,
} from '../errors.js';

import { mockMessages, mockStreamChunks, createAsyncIterator } from './fixtures/index.js';

import type { StreamChunk } from '../types.js';

// Mock OpenAI SDK
vi.mock('openai', () => {
  const MockOpenAI = vi.fn(function (this: any, config: any) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.chat = {
      completions: {
        create: vi.fn(),
      },
    };
    return this;
  });

  // APIError class for error mocking
  class APIError extends Error {
    status?: number;
    headers?: Record<string, string>;

    constructor(message: string, status?: number, headers?: Record<string, string>) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.headers = headers;
    }
  }

  // Additional error types from OpenAI SDK
  class APIConnectionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIConnectionError';
    }
  }

  class APITimeoutError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APITimeoutError';
    }
  }

  class APIUserAbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIUserAbortError';
    }
  }

  return {
    default: MockOpenAI,
    APIError,
    APIConnectionError,
    APITimeoutError,
    APIUserAbortError,
  };
});

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create client with test config
    client = new OpenRouterClient({
      apiKey: 'test-key',
      baseURL: 'https://test.openrouter.ai',
      defaultModel: 'test/model',
    });

    // Get reference to the mocked OpenAI instance
    const OpenAIMock = OpenAI as any;
    mockOpenAIInstance = OpenAIMock.mock.results[OpenAIMock.mock.results.length - 1]?.value;
    mockCreate = mockOpenAIInstance?.chat?.completions?.create;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      const customClient = new OpenRouterClient({
        apiKey: 'custom-key',
        baseURL: 'https://custom.openrouter.ai',
        defaultModel: 'custom/model',
      });

      expect(customClient).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'custom-key',
          baseURL: 'https://custom.openrouter.ai',
        })
      );
    });

    it('should use environment config when not provided', () => {
      // Set environment variables
      process.env.AI_API_KEY = 'env-key';
      process.env.AI_GATEWAY_URL = 'https://env.openrouter.ai';
      process.env.AI_DEFAULT_MODEL = 'env/model';

      const envClient = new OpenRouterClient();

      expect(envClient).toBeDefined();
    });
  });

  describe('streamChat', () => {
    it('should stream content chunks', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const chunks: string[] = [];
      const stream = client.streamChat(mockMessages.simple);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content);
        }
      }

      // Assert
      expect(chunks).toEqual(['Hello', ' world']);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test/model',
          messages: mockMessages.simple,
          stream: true,
        }),
        expect.any(Object)
      );
    });

    it('should yield done chunk with complete result', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      let doneChunk: StreamChunk | undefined;
      const stream = client.streamChat(mockMessages.simple);

      for await (const chunk of stream) {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      }

      // Assert
      expect(doneChunk).toBeDefined();
      expect(doneChunk?.type).toBe('done');
      if (doneChunk?.type === 'done') {
        expect(doneChunk.result).toMatchObject({
          content: 'Hello world',
          usage: {
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
          },
          model: 'test/model',
          finishReason: 'stop',
        });
      }
    });

    it('should accumulate content correctly', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      let finalContent = '';
      const stream = client.streamChat(mockMessages.simple);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          finalContent += chunk.content;
        }
      }

      // Assert
      expect(finalContent).toBe('Hello world');
    });

    it('should handle single chunk response', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.contentOnly));

      // Act
      const chunks: StreamChunk[] = [];
      const stream = client.streamChat(mockMessages.simple);

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Assert
      const contentChunks = chunks.filter(c => c.type === 'content');
      const doneChunk = chunks.find(c => c.type === 'done');

      expect(contentChunks).toHaveLength(1);
      expect(doneChunk).toBeDefined();
      if (doneChunk?.type === 'done') {
        expect(doneChunk.result.content).toBe('Single chunk response');
      }
    });

    it('should throw InvalidResponseError when no usage metadata', async () => {
      // Arrange - stream with no usage
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.withoutUsage));

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw before completing
        }
      }).rejects.toThrow(InvalidResponseError);
    });

    it('should use default model when not specified', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const stream = client.streamChat(mockMessages.simple);

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'test/model' }),
        expect.any(Object)
      );
    });

    it('should pass through completion options', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const stream = client.streamChat(mockMessages.simple, {
        model: 'custom/model',
        maxTokens: 100,
        temperature: 0.7,
        topP: 0.9,
      });

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom/model',
          max_tokens: 100,
          temperature: 0.7,
          top_p: 0.9,
        }),
        expect.any(Object)
      );
    });

    it('should pass timeout option', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const stream = client.streamChat(mockMessages.simple, {
        timeoutMs: 60000,
      });

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('should pass abort signal', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));
      const abortController = new AbortController();

      // Act
      const stream = client.streamChat(mockMessages.simple, {
        signal: abortController.signal,
      });

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          signal: abortController.signal,
        })
      );
    });

    it('should track actual model used from response', async () => {
      // Arrange - mock response with different model
      const customChunks = [
        {
          ...mockStreamChunks.complete[0],
          model: 'actual/model-used',
        },
        {
          ...mockStreamChunks.complete[1],
          model: 'actual/model-used',
        },
        {
          ...mockStreamChunks.complete[2],
          model: 'actual/model-used',
        },
      ];
      mockCreate.mockResolvedValue(createAsyncIterator(customChunks));

      // Act
      const stream = client.streamChat(mockMessages.simple);
      let doneChunk: StreamChunk | undefined;

      for await (const chunk of stream) {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      }

      // Assert
      if (doneChunk?.type === 'done') {
        expect(doneChunk.result.model).toBe('actual/model-used');
      }
    });
  });

  describe('chat (non-streaming)', () => {
    it('should return complete result from stream', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const result = await client.chat(mockMessages.simple);

      // Assert
      expect(result).toMatchObject({
        content: 'Hello world',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
        model: 'test/model',
        finishReason: 'stop',
      });
    });

    it('should throw error when stream fails', async () => {
      // Arrange
      const error = new APIError('Test error', 500);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      await expect(client.chat(mockMessages.simple)).rejects.toThrow(AiError);
    });

    it('should pass options to streamChat', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      await client.chat(mockMessages.simple, {
        model: 'custom/model',
        maxTokens: 50,
      });

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom/model',
          max_tokens: 50,
        }),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should throw RateLimitError on 429', async () => {
      // Arrange
      const error = new APIError('Rate limit exceeded', 429, {
        'retry-after': '60',
      });
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw before yielding
        }
      }).rejects.toThrow(RateLimitError);
    });

    it('should include retry-after in RateLimitError', async () => {
      // Arrange
      const error = new APIError('Rate limit exceeded', 429, {
        'retry-after': '120',
      });
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      try {
        for await (const _chunk of stream) {
          // Should throw
        }
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        if (e instanceof RateLimitError) {
          expect(e.details).toMatchObject({ retryAfter: 120 });
        }
      }
    });

    it('should throw AuthenticationError on 401', async () => {
      // Arrange
      const error = new APIError('Unauthorized', 401);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError on 403', async () => {
      // Arrange
      const error = new APIError('Forbidden', 403);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AuthenticationError);
    });

    it('should throw ModelNotAvailableError on 400 with model error', async () => {
      // Arrange
      const error = new APIError('Invalid model specified', 400);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple, { model: 'invalid/model' });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(ModelNotAvailableError);
    });

    it('should throw TimeoutError on AbortError', async () => {
      // Arrange
      const error = new Error('Request aborted');
      error.name = 'AbortError';
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(TimeoutError);
    });

    it('should throw TimeoutError on APITimeoutError', async () => {
      // Arrange
      const error = new APITimeoutError('Request timeout');
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(TimeoutError);
    });

    it('should throw TimeoutError on APIUserAbortError', async () => {
      // Arrange
      const error = new APIUserAbortError('User aborted request');
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(TimeoutError);
    });

    it('should throw AiError on APIConnectionError', async () => {
      // Arrange
      const error = new APIConnectionError('Connection failed');
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AiError);
    });

    it('should throw AiError on 500+ status codes', async () => {
      // Arrange
      const error = new APIError('Internal server error', 500);
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AiError);
    });

    it('should throw AiError on network errors', async () => {
      // Arrange
      const error = new Error('ECONNREFUSED: Connection refused');
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AiError);
    });

    it('should throw AiError on unknown errors', async () => {
      // Arrange
      const error = new Error('Something unexpected happened');
      mockCreate.mockRejectedValue(error);

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AiError);
    });

    it('should handle non-Error objects gracefully', async () => {
      // Arrange
      mockCreate.mockRejectedValue({ message: 'Not an Error object' });

      // Act & Assert
      const stream = client.streamChat(mockMessages.simple);

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw
        }
      }).rejects.toThrow(AiError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message array', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const stream = client.streamChat([]);

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [] }),
        expect.any(Object)
      );
    });

    it('should handle multi-turn conversation', async () => {
      // Arrange
      mockCreate.mockResolvedValue(createAsyncIterator(mockStreamChunks.complete));

      // Act
      const stream = client.streamChat(mockMessages.conversation);

      for await (const _chunk of stream) {
        // Consume stream
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ messages: mockMessages.conversation }),
        expect.any(Object)
      );
    });

    it('should handle finish_reason variations', async () => {
      // Arrange - test different finish reasons
      const customChunks = [
        {
          ...mockStreamChunks.complete[0],
        },
        {
          ...mockStreamChunks.complete[2],
          choices: [{ delta: {}, index: 0, finish_reason: 'length' }],
        },
      ];
      mockCreate.mockResolvedValue(createAsyncIterator(customChunks));

      // Act
      const stream = client.streamChat(mockMessages.simple);
      let doneChunk: StreamChunk | undefined;

      for await (const chunk of stream) {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      }

      // Assert
      if (doneChunk?.type === 'done') {
        expect(doneChunk.result.finishReason).toBe('length');
      }
    });

    it('should handle empty content chunks gracefully', async () => {
      // Arrange
      const customChunks = [
        {
          ...mockStreamChunks.complete[0],
          choices: [{ delta: {}, index: 0, finish_reason: null }],
        },
        {
          ...mockStreamChunks.complete[1],
        },
        {
          ...mockStreamChunks.complete[2],
        },
      ];
      mockCreate.mockResolvedValue(createAsyncIterator(customChunks));

      // Act
      const chunks: string[] = [];
      const stream = client.streamChat(mockMessages.simple);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content);
        }
      }

      // Assert
      expect(chunks).toEqual([' world']);
    });
  });
});
