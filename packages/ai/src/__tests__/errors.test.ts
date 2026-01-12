/**
 * Tests for AI-specific error classes
 */

import { describe, it, expect } from 'vitest';
import {
  AiError,
  RateLimitError,
  TimeoutError,
  InvalidResponseError,
  AuthenticationError,
  ModelNotAvailableError,
} from '../errors.js';
import { AppError } from '@raptscallions/core';

describe('AI Error Classes', () => {
  describe('AiError', () => {
    it('should create error with all properties', () => {
      const error = new AiError('Test error', 500, { key: 'value' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AiError');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ key: 'value' });
    });

    it('should default to 500 status code', () => {
      const error = new AiError('Test error');

      expect(error.statusCode).toBe(500);
    });

    it('should work with instanceof checks', () => {
      const error = new AiError('Test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof AiError).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('AI API rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
      expect(error.statusCode).toBe(429);
    });

    it('should include retryAfter when provided', () => {
      const error = new RateLimitError(60);

      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should not include retryAfter when not provided', () => {
      const error = new RateLimitError();

      expect(error.details).toBeUndefined();
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with timeout value', () => {
      const error = new TimeoutError(30000);

      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('AI request timed out after 30000ms');
      expect(error.name).toBe('TimeoutError');
      expect(error.statusCode).toBe(504);
      expect(error.details).toEqual({ timeoutMs: 30000 });
    });

    it('should format message correctly', () => {
      const error = new TimeoutError(120000);

      expect(error.message).toContain('120000ms');
    });
  });

  describe('InvalidResponseError', () => {
    it('should create invalid response error', () => {
      const error = new InvalidResponseError('Missing field');

      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('Invalid AI API response: Missing field');
      expect(error.name).toBe('InvalidResponseError');
      expect(error.statusCode).toBe(502);
    });

    it('should include details when provided', () => {
      const details = { field: 'usage', expected: 'object' };
      const error = new InvalidResponseError('Missing usage', details);

      expect(error.details).toEqual(details);
    });

    it('should work without details', () => {
      const error = new InvalidResponseError('Invalid format');

      expect(error.details).toBeUndefined();
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('AI API authentication failed - check API key');
      expect(error.name).toBe('AuthenticationError');
      expect(error.statusCode).toBe(401);
    });

    it('should have standard auth message', () => {
      const error = new AuthenticationError();

      expect(error.message).toContain('API key');
    });
  });

  describe('ModelNotAvailableError', () => {
    it('should create model not available error', () => {
      const error = new ModelNotAvailableError('gpt-4');

      expect(error).toBeInstanceOf(AiError);
      expect(error.message).toBe('Model not available: gpt-4');
      expect(error.name).toBe('ModelNotAvailableError');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ model: 'gpt-4' });
    });

    it('should include model name in message and details', () => {
      const error = new ModelNotAvailableError('anthropic/claude-3');

      expect(error.message).toContain('anthropic/claude-3');
      expect(error.details).toMatchObject({ model: 'anthropic/claude-3' });
    });
  });

  describe('Error serialization', () => {
    it('should serialize AiError to JSON', () => {
      const error = new AiError('Test', 500, { key: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        message: 'Test',
        code: 'AI_ERROR',
        statusCode: 500,
        details: { key: 'value' },
      });
    });

    it('should serialize RateLimitError to JSON', () => {
      const error = new RateLimitError(60);
      const json = error.toJSON();

      expect(json.code).toBe('AI_ERROR');
      expect(json.statusCode).toBe(429);
      expect(json.details).toEqual({ retryAfter: 60 });
    });

    it('should serialize errors without details', () => {
      const error = new AuthenticationError();
      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper prototype chain', () => {
      const errors = [
        new AiError('test'),
        new RateLimitError(),
        new TimeoutError(1000),
        new InvalidResponseError('test'),
        new AuthenticationError(),
        new ModelNotAvailableError('test'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(AiError);
        expect(error.stack).toBeDefined();
      }
    });

    it('should distinguish between error types', () => {
      const rateLimitError = new RateLimitError();
      const timeoutError = new TimeoutError(1000);

      expect(rateLimitError).toBeInstanceOf(RateLimitError);
      expect(rateLimitError).not.toBeInstanceOf(TimeoutError);

      expect(timeoutError).toBeInstanceOf(TimeoutError);
      expect(timeoutError).not.toBeInstanceOf(RateLimitError);
    });
  });
});
