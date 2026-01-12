import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'scripts',
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
