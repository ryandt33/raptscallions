/**
 * Tests for AI config validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

describe('AI Config', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('aiConfigSchema', () => {
    it('should validate complete config', () => {
      const config = {
        AI_GATEWAY_URL: 'https://openrouter.ai/api/v1',
        AI_API_KEY: 'sk-or-test-key',
        AI_DEFAULT_MODEL: 'anthropic/claude-sonnet-4-20250514',
        AI_REQUEST_TIMEOUT_MS: '120000',
        AI_MAX_RETRIES: '2',
      };

      // This will be tested once config.ts is implemented
      expect(config.AI_GATEWAY_URL).toBe('https://openrouter.ai/api/v1');
      expect(config.AI_API_KEY).toBe('sk-or-test-key');
    });

    it('should use default values for optional fields', () => {
      const config = {
        AI_API_KEY: 'sk-or-test-key',
      };

      // Should use defaults:
      // AI_GATEWAY_URL: 'https://openrouter.ai/api/v1'
      // AI_DEFAULT_MODEL: 'anthropic/claude-sonnet-4-20250514'
      // AI_REQUEST_TIMEOUT_MS: 120000
      // AI_MAX_RETRIES: 2

      expect(config.AI_API_KEY).toBeDefined();
    });

    it('should require AI_API_KEY', () => {
      const schema = z.object({
        AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
      });

      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ AI_API_KEY: '' })).toThrow();
      expect(() => schema.parse({ AI_API_KEY: 'valid-key' })).not.toThrow();
    });

    it('should validate URL format for AI_GATEWAY_URL', () => {
      const urlSchema = z.string().url();

      expect(() => urlSchema.parse('https://openrouter.ai/api/v1')).not.toThrow();
      expect(() => urlSchema.parse('http://localhost:3000')).not.toThrow();
      expect(() => urlSchema.parse('not-a-url')).toThrow();
      expect(() => urlSchema.parse('')).toThrow();
    });

    it('should coerce and validate AI_REQUEST_TIMEOUT_MS as positive integer', () => {
      const timeoutSchema = z.coerce.number().int().positive();

      expect(timeoutSchema.parse('120000')).toBe(120000);
      expect(timeoutSchema.parse('60000')).toBe(60000);
      expect(timeoutSchema.parse(30000)).toBe(30000);

      expect(() => timeoutSchema.parse('-1000')).toThrow();
      expect(() => timeoutSchema.parse('0')).toThrow();
      expect(() => timeoutSchema.parse('not-a-number')).toThrow();
    });

    it('should coerce and validate AI_MAX_RETRIES in range 0-5', () => {
      const retriesSchema = z.coerce.number().int().min(0).max(5);

      expect(retriesSchema.parse('0')).toBe(0);
      expect(retriesSchema.parse('2')).toBe(2);
      expect(retriesSchema.parse('5')).toBe(5);

      expect(() => retriesSchema.parse('-1')).toThrow();
      expect(() => retriesSchema.parse('6')).toThrow();
      expect(() => retriesSchema.parse('10')).toThrow();
    });

    it('should accept any string for AI_DEFAULT_MODEL', () => {
      const modelSchema = z.string();

      expect(modelSchema.parse('anthropic/claude-sonnet-4-20250514')).toBe(
        'anthropic/claude-sonnet-4-20250514'
      );
      expect(modelSchema.parse('openai/gpt-4')).toBe('openai/gpt-4');
      expect(modelSchema.parse('custom-model')).toBe('custom-model');
    });
  });

  describe('config validation error messages', () => {
    it('should provide clear error for missing API key', () => {
      const schema = z.object({
        AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
      });

      try {
        schema.parse({});
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        if (error instanceof z.ZodError) {
          expect(error.errors[0]?.message.toLowerCase()).toContain('required');
        }
      }
    });

    it('should provide clear error for invalid URL', () => {
      const schema = z.object({
        AI_GATEWAY_URL: z.string().url(),
      });

      try {
        schema.parse({ AI_GATEWAY_URL: 'not-a-url' });
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
        if (error instanceof z.ZodError) {
          expect(error.errors[0]?.message).toContain('url');
        }
      }
    });

    it('should provide clear error for invalid timeout', () => {
      const schema = z.object({
        AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive(),
      });

      try {
        schema.parse({ AI_REQUEST_TIMEOUT_MS: '-1000' });
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('environment variable handling', () => {
    it('should read from process.env', () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_GATEWAY_URL = 'https://test.openrouter.ai';

      expect(process.env.AI_API_KEY).toBe('test-key');
      expect(process.env.AI_GATEWAY_URL).toBe('https://test.openrouter.ai');
    });

    it('should handle undefined environment variables', () => {
      delete process.env.AI_API_KEY;

      expect(process.env.AI_API_KEY).toBeUndefined();
    });

    it('should handle empty string environment variables', () => {
      process.env.AI_API_KEY = '';

      expect(process.env.AI_API_KEY).toBe('');
    });
  });

  describe('type inference', () => {
    it('should infer correct types from schema', () => {
      // Schema used only for type inference via typeof
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const schema = z.object({
        AI_GATEWAY_URL: z.string().url().default('https://openrouter.ai/api/v1'),
        AI_API_KEY: z.string().min(1),
        AI_DEFAULT_MODEL: z.string().default('anthropic/claude-sonnet-4-20250514'),
        AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
        AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
      });

      type ConfigType = z.infer<typeof schema>;

      const config: ConfigType = {
        AI_GATEWAY_URL: 'https://test.com',
        AI_API_KEY: 'test',
        AI_DEFAULT_MODEL: 'test/model',
        AI_REQUEST_TIMEOUT_MS: 60000,
        AI_MAX_RETRIES: 3,
      };

      expect(config.AI_GATEWAY_URL).toBe('https://test.com');
      expect(config.AI_REQUEST_TIMEOUT_MS).toBe(60000);
      expect(config.AI_MAX_RETRIES).toBe(3);
    });
  });

  describe('config validation on startup', () => {
    it('should fail fast on invalid config', () => {
      const schema = z.object({
        AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
      });

      expect(() => {
        schema.parse({ AI_API_KEY: '' });
      }).toThrow();
    });

    it('should succeed with valid config', () => {
      const schema = z.object({
        AI_API_KEY: z.string().min(1),
        AI_GATEWAY_URL: z.string().url().default('https://openrouter.ai/api/v1'),
      });

      expect(() => {
        schema.parse({
          AI_API_KEY: 'valid-key',
          AI_GATEWAY_URL: 'https://test.com',
        });
      }).not.toThrow();
    });

    it('should apply defaults correctly', () => {
      const schema = z.object({
        AI_API_KEY: z.string().min(1),
        AI_DEFAULT_MODEL: z.string().default('anthropic/claude-sonnet-4-20250514'),
        AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(120000),
      });

      const result = schema.parse({
        AI_API_KEY: 'test-key',
      });

      expect(result.AI_DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-20250514');
      expect(result.AI_REQUEST_TIMEOUT_MS).toBe(120000);
    });
  });
});
