/**
 * Barrel exports for @raptscallions/ai package
 */

export { OpenRouterClient, openRouterClient } from './client.js';
export { aiConfig, aiConfigSchema } from './config.js';
export type { AiConfig } from './config.js';
export {
  AiError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AuthenticationError,
  ModelNotAvailableError,
} from './errors.js';
export type {
  MessageRole,
  ChatMessage,
  UsageMetadata,
  StreamChunk,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './types.js';
