/**
 * AI configuration with Zod validation
 */

import { z } from 'zod';

export const aiConfigSchema = z.object({
  AI_GATEWAY_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_DEFAULT_MODEL: z.string().default('anthropic/claude-sonnet-4-20250514'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120000), // 2 minutes
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
});

export type AiConfig = z.infer<typeof aiConfigSchema>;

/**
 * Get validated config from environment
 *
 * Uses lazy initialization to avoid validation errors during test imports.
 */
let configInstance: AiConfig | undefined;

function loadConfig(): AiConfig {
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

/**
 * Reset config instance (for testing)
 */
export function resetAiConfig(): void {
  configInstance = undefined;
}

/**
 * Exported config with lazy initialization
 */
export const aiConfig = new Proxy({} as AiConfig, {
  get(_target, prop: keyof AiConfig) {
    const config = loadConfig();
    return config[prop];
  },
});
