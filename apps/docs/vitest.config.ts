import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config';

export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      name: 'docs',
      include: ['scripts/**/*.test.ts', 'scripts/**/__tests__/**/*.test.ts'],
      coverage: {
        // Only cover the scripts, not VitePress theme/config
        include: ['scripts/**/*.ts'],
        exclude: [
          'scripts/**/*.test.ts',
          'scripts/**/__tests__/**',
          'src/**',  // Exclude VitePress content
        ],
      },
    },
  })
);
