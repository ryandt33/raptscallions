import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'packages/**/__tests__/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/__tests__/**/*.test.ts',
      'scripts/**/*.test.ts',
      'scripts/**/__tests__/**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{cache,git,turbo}/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/*.workspace.*',
        '**/types/**',
        '**/migrations/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/scripts/**',
        'test-drizzle.js',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@raptscallions/auth': resolve(__dirname, './packages/auth/src'),
      '@raptscallions/core': resolve(__dirname, './packages/core/src'),
      '@raptscallions/db': resolve(__dirname, './packages/db/src'),
      '@raptscallions/modules': resolve(__dirname, './packages/modules/src'),
      '@raptscallions/telemetry': resolve(__dirname, './packages/telemetry/src'),
      '@raptscallions/ai': resolve(__dirname, './packages/ai/src'),
    },
  },
});
