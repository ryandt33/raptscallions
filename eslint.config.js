import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  // Global ignores - apply to all files
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.vitepress/cache/**',
      '**/.vitepress/dist/**',
      '**/coverage/**',
      '**/*.d.ts', // Declaration files are generated
    ],
  },

  // Base configuration for all TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // Enable type-aware linting
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
    },

    rules: {
      // TypeScript ESLint recommended + strict rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,

      // CRITICAL: Ban 'any' type (project requirement)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // Require explicit function return types
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],

      // Unused variables and imports
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Prefer const over let
      'prefer-const': 'error',

      // No var declarations
      'no-var': 'error',

      // Import ordering
      'import/order': [
        'error',
        {
          groups: [
            'builtin',  // Node.js built-ins
            'external', // npm packages
            'internal', // @raptscallions/* packages
            'parent',
            'sibling',
            'index',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // No duplicate imports
      'import/no-duplicates': 'error',

      // Prefer import type for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Consistent type definitions
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // No floating promises
      '@typescript-eslint/no-floating-promises': 'error',

      // Await in loops (performance warning)
      'no-await-in-loop': 'warn',

      // Console statements (warn in production code, allowed in tests)
      'no-console': 'warn',

      // Enforce braces for all control structures
      'curly': ['error', 'all'],

      // Prefer strict equality
      'eqeqeq': ['error', 'always'],
    },

    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            'tsconfig.json',
            'packages/*/tsconfig.json',
            'apps/*/tsconfig.json',
          ],
        },
      },
    },
  },

  // Test files: relax some rules and disable type-aware linting
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: false, // Disable type-aware linting for test files (excluded from tsconfig)
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Mocks may use any
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'off', // Type-aware rules disabled
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Test factories don't need explicit types
      '@typescript-eslint/explicit-function-return-type': 'off', // Test functions don't need explicit types
      'no-console': 'off', // Allow console in tests
    },
  },

  // Config files: relax type requirements
  {
    files: ['**/*.config.ts', '**/*.config.js', '**/vite.config.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',
    },
  }
);
