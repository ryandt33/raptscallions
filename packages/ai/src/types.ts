/**
 * Type definitions for AI client
 *
 * This is a stub file for TDD - tests will fail until full implementation
 */

/**
 * Message role in conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

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
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | null;
}

/**
 * Streaming chunk types - includes final result in done chunk
 * Following architect review recommendation
 */
export type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult };

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
