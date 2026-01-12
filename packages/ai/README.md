# @raptscallions/ai

OpenRouter AI client with streaming support for Raptscallions platform.

## Overview

This package provides a TypeScript-first client for OpenRouter's AI gateway, built on the OpenAI SDK. It supports streaming responses, comprehensive error handling, and full type safety.

**Key Features:**
- ✅ Streaming-first design with async generators
- ✅ Full TypeScript support with strict types
- ✅ Typed error classes for all failure modes
- ✅ Environment configuration with Zod validation
- ✅ Singleton and custom client instances
- ✅ Compatible with OpenAI SDK ecosystem

## Installation

This is a workspace package. Install dependencies:

```bash
pnpm install
```

## Configuration

Set required environment variables:

```bash
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# Optional
AI_REQUEST_TIMEOUT_MS=120000  # Default: 2 minutes
AI_MAX_RETRIES=2               # Default: 2
```

## Usage

### Streaming (Recommended for Chat)

```typescript
import { openRouterClient } from '@raptscallions/ai';

const stream = openRouterClient.streamChat(
  [{ role: 'user', content: 'Hello!' }],
  { model: 'anthropic/claude-sonnet-4-20250514' }
);

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    // Stream content to user
    process.stdout.write(chunk.content);
  } else if (chunk.type === 'done') {
    // Final result with usage metadata
    console.log('Tokens:', chunk.result.usage);
    console.log('Finish reason:', chunk.result.finishReason);
  }
}
```

### Non-Streaming (Convenience)

```typescript
import { openRouterClient } from '@raptscallions/ai';

const result = await openRouterClient.chat(
  [{ role: 'user', content: 'Generate a quiz' }],
  { model: 'anthropic/claude-sonnet-4-20250514' }
);

console.log(result.content);
console.log('Tokens used:', result.usage.totalTokens);
```

### Custom Client Instance

For testing or custom configuration:

```typescript
import { OpenRouterClient } from '@raptscallions/ai';

const customClient = new OpenRouterClient({
  apiKey: 'test-key',
  baseURL: 'https://test.openrouter.ai',
  defaultModel: 'test/model',
  timeout: 60000,
  maxRetries: 3,
});
```

### With Options

```typescript
const stream = openRouterClient.streamChat(
  [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain TypeScript' },
  ],
  {
    model: 'anthropic/claude-sonnet-4-20250514',
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
    timeoutMs: 30000,
  }
);
```

### With Cancellation

```typescript
const controller = new AbortController();

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000);

try {
  const stream = openRouterClient.streamChat(
    [{ role: 'user', content: 'Long request...' }],
    { signal: controller.signal }
  );

  for await (const chunk of stream) {
    // Process chunks
  }
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Request cancelled');
  }
}
```

## Types

### ChatMessage

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### StreamChunk

```typescript
type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult };
```

### ChatCompletionResult

```typescript
interface ChatCompletionResult {
  content: string;
  usage: UsageMetadata;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | null;
}
```

### UsageMetadata

```typescript
interface UsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

### ChatCompletionOptions

```typescript
interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}
```

## Error Handling

All errors are typed for easy handling:

```typescript
import {
  RateLimitError,
  AuthenticationError,
  ModelNotAvailableError,
  TimeoutError,
  InvalidResponseError,
  AiError,
} from '@raptscallions/ai';

try {
  const result = await openRouterClient.chat(messages);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limit hit, retry after:', error.details?.retryAfter);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof ModelNotAvailableError) {
    console.log('Model not found:', error.details?.model);
  } else if (error instanceof TimeoutError) {
    console.log('Request timed out');
  } else if (error instanceof InvalidResponseError) {
    console.log('Invalid response from API');
  } else if (error instanceof AiError) {
    console.log('Generic AI error:', error.message);
  }
}
```

### Error Types

| Error                    | HTTP Status | Description                          |
| ------------------------ | ----------- | ------------------------------------ |
| `RateLimitError`         | 429         | Rate limit exceeded                  |
| `AuthenticationError`    | 401/403     | Invalid API key                      |
| `ModelNotAvailableError` | 400         | Model not found or unavailable       |
| `TimeoutError`           | 504         | Request timeout or user cancellation |
| `InvalidResponseError`   | 502         | Malformed response or missing data   |
| `AiError`                | Various     | Generic errors (network, gateway)    |

## Testing

Run tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## Architecture Decisions

### Streaming Pattern

Following architecture review recommendations, the client yields the complete result as the final chunk (`type: 'done'`) rather than using an async generator return value. This pattern is:

- Idiomatic for Node.js streams
- Easily testable
- Accessible to all consumers
- Type-safe without non-null assertions

### Config Validation

Environment variables are validated at first client instantiation using Zod schemas. This ensures:

- Fail-fast behavior for missing/invalid config
- Clear error messages for configuration issues
- Type-safe access to configuration values

### Error Handling

The client wraps OpenAI SDK errors into typed error classes:

- All error scenarios have dedicated types
- Errors include relevant metadata (retry-after headers, model names, etc.)
- Consistent with `@raptscallions/core` error infrastructure

### Singleton Pattern

The package exports a lazy-initialized singleton (`openRouterClient`) for convenience:

- Deferred instantiation avoids config errors in test environments
- Custom instances available for testing and multi-tenant scenarios
- Uses Proxy for transparent lazy loading

## Integration

### With Chat Runtime

```typescript
// apps/api/src/services/chat.service.ts
import { openRouterClient } from '@raptscallions/ai';

export async function* streamChatResponse(sessionId: string, userMessage: string) {
  const messages = await loadSessionMessages(sessionId);
  messages.push({ role: 'user', content: userMessage });

  const stream = openRouterClient.streamChat(messages);

  for await (const chunk of stream) {
    if (chunk.type === 'content') {
      yield chunk.content;
    } else if (chunk.type === 'done') {
      await storeUsageMetadata(sessionId, chunk.result.usage);
    }
  }
}
```

### With Dependency Injection

```typescript
export class ChatService {
  constructor(
    private db: DbClient,
    private aiClient = openRouterClient // Default, replaceable for testing
  ) {}

  async processMessage(message: string) {
    const result = await this.aiClient.chat([{ role: 'user', content: message }]);
    return result;
  }
}

// In tests
const mockClient = new OpenRouterClient({
  apiKey: 'test',
  baseURL: 'http://localhost:3001/mock',
  defaultModel: 'test/model',
});

const service = new ChatService(mockDb, mockClient);
```

## Package Structure

```
packages/ai/
├── src/
│   ├── client.ts           # OpenRouterClient class
│   ├── types.ts            # TypeScript type definitions
│   ├── errors.ts           # Typed error classes
│   ├── config.ts           # Environment config with Zod
│   ├── index.ts            # Barrel exports
│   └── __tests__/
│       ├── client.test.ts  # Unit tests
│       ├── config.test.ts  # Config validation tests
│       ├── errors.test.ts  # Error class tests
│       └── fixtures/       # Test data
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md              # This file
```

## Related Documentation

- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - System architecture
- [CONVENTIONS.md](../../docs/CONVENTIONS.md) - Code conventions
- [Task E04-T002](../../backlog/tasks/E04/E04-T002.md) - Implementation task
- [Spec E04-T002](../../backlog/docs/specs/E04/E04-T002-spec.md) - Detailed specification

## License

See repository LICENSE file.
