/**
 * Test fixtures for AI client tests
 */

import type { ChatMessage } from '../../types.js';

export const mockMessages = {
  simple: [
    { role: 'user' as const, content: 'Hello' },
  ],
  conversation: [
    { role: 'system' as const, content: 'You are a helpful assistant.' },
    { role: 'user' as const, content: 'What is TypeScript?' },
    { role: 'assistant' as const, content: 'TypeScript is...' },
    { role: 'user' as const, content: 'Tell me more' },
  ],
} satisfies Record<string, ChatMessage[]>;

/**
 * Mock stream chunks following OpenAI SDK response format
 */
export const mockStreamChunks = {
  complete: [
    {
      id: 'chatcmpl-123',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: { content: 'Hello' }, index: 0, finish_reason: null }],
    },
    {
      id: 'chatcmpl-123',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: { content: ' world' }, index: 0, finish_reason: null }],
    },
    {
      id: 'chatcmpl-123',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    },
  ],

  withoutUsage: [
    {
      id: 'chatcmpl-456',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: { content: 'Test' }, index: 0, finish_reason: null }],
    },
    {
      id: 'chatcmpl-456',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: {}, index: 0, finish_reason: 'stop' }],
    },
  ],

  contentOnly: [
    {
      id: 'chatcmpl-789',
      object: 'chat.completion.chunk' as const,
      created: Date.now(),
      model: 'test/model',
      choices: [{ delta: { content: 'Single chunk response' }, index: 0, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
    },
  ],
};

/**
 * Helper to create async iterator from array
 */
export async function* createAsyncIterator<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}
