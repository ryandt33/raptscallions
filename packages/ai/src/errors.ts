/**
 * AI-specific error classes
 *
 * This is a stub file for TDD - implementation will be completed later
 */

import { AppError } from '@raptscallions/core';

/**
 * Base error for AI-related issues
 */
export class AiError extends AppError {
  constructor(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message, 'AI_ERROR', statusCode, details);
    this.name = 'AiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * API rate limit exceeded
 */
export class RateLimitError extends AiError {
  constructor(retryAfter?: number) {
    super(
      'AI API rate limit exceeded',
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Request timeout
 */
export class TimeoutError extends AiError {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`, 504, { timeoutMs });
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Invalid API response
 */
export class InvalidResponseError extends AiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(`Invalid AI API response: ${message}`, 502, details);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Authentication failure
 */
export class AuthenticationError extends AiError {
  constructor() {
    super('AI API authentication failed - check API key', 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Model not available
 */
export class ModelNotAvailableError extends AiError {
  constructor(model: string) {
    super(`Model not available: ${model}`, 400, { model });
    this.name = 'ModelNotAvailableError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
