---
title: Vitest Monorepo Setup
description: Three-tier Vitest configuration hierarchy for the RaptScallions monorepo
related_code:
  - vitest.config.ts
  - vitest.workspace.ts
  - packages/core/vitest.config.ts
  - packages/db/vitest.config.ts
last_verified: 2026-01-14
---

# Vitest Monorepo Setup

RaptScallions uses a three-tier Vitest configuration to support testing across the monorepo while allowing package-specific customization.

## Configuration Hierarchy

```
vitest.config.ts          # Root - base settings, coverage, aliases
vitest.workspace.ts       # Workspace - package discovery
packages/*/vitest.config.ts  # Package - overrides (name, includes)
apps/*/vitest.config.ts      # App - overrides (name, includes)
```

### Tier 1: Root Configuration

The root `vitest.config.ts` defines base settings shared by all packages:

```typescript
// vitest.config.ts
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
        // Barrel exports (re-exports only)
        'packages/*/src/index.ts',
        'apps/*/src/index.ts',
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
```

**Key settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `globals: true` | `describe`, `it`, `expect` available globally | No imports needed |
| `environment: 'node'` | Node.js test environment | Not browser |
| `coverage.provider: 'v8'` | V8 code coverage | Fast, accurate |
| `coverage.thresholds` | 80% all metrics | Enforced minimum |

### Tier 2: Workspace Configuration

The `vitest.workspace.ts` tells Vitest which packages contain tests:

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/db',
  'packages/modules',
  'packages/telemetry',
  'packages/ai',
  'packages/auth',
  'apps/api',
  'apps/docs',
  // Future:
  // 'apps/worker',
  // 'apps/web',
]);
```

::: info Workspace Mode
When you run `pnpm test`, Vitest discovers all listed packages and runs tests from each. Each package can have its own configuration that extends the root config.
:::

### Tier 3: Package Configuration

Each package can override root settings with its own `vitest.config.ts`:

```typescript
// packages/core/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
      name: 'core',
    },
  })
);
```

**Key overrides:**

- `name` — Identifies the package in test output
- `include` — Package-specific test file patterns
- `setupFiles` — Package-specific test setup (if needed)

## Module Aliases

The root config defines aliases so tests can import packages by name:

```typescript
resolve: {
  alias: {
    '@raptscallions/auth': resolve(__dirname, './packages/auth/src'),
    '@raptscallions/core': resolve(__dirname, './packages/core/src'),
    // ...
  },
}
```

This allows tests to import from other packages:

```typescript
import { AppError } from "@raptscallions/core";
import { db } from "@raptscallions/db";
```

::: warning Alias Timing with Mocks
Module aliases resolve **before** `vi.mock()` runs. This means singletons created at module load time won't be mocked. Use dependency injection or `vi.hoisted()` instead. See [Mocking Patterns](/testing/patterns/mocking).
:::

## Coverage Configuration

Coverage is configured in the root config:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json-summary', 'html'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.config.*',
    // ...
  ],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

### Coverage Reporters

| Reporter | Output | Use Case |
|----------|--------|----------|
| `text` | Terminal table | Quick summary |
| `json-summary` | `coverage-summary.json` | CI integration |
| `html` | `coverage/` directory | Detailed browsing |

### Coverage Exclusions

The following are excluded from coverage:

- `node_modules/`, `dist/` — External/built code
- `*.config.*`, `*.workspace.*` — Configuration files
- `**/types/**`, `**/migrations/**` — Type defs, SQL migrations
- `**/__tests__/**`, `*.test.ts` — Test files themselves
- `packages/*/src/index.ts` — Barrel exports (re-exports only)

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run a specific package
pnpm test --filter @raptscallions/core

# Watch mode
pnpm test --watch

# Run specific file
pnpm test -- packages/core/src/__tests__/schemas/user.schema.test.ts
```

## Adding a New Package

When adding a new package to the monorepo:

1. **Add to workspace** — Update `vitest.workspace.ts`:
   ```typescript
   export default defineWorkspace([
     // ...existing packages
     'packages/new-package',
   ]);
   ```

2. **Create package config** — Add `packages/new-package/vitest.config.ts`:
   ```typescript
   import { defineConfig, mergeConfig } from 'vitest/config';
   import baseConfig from '../../vitest.config.js';

   export default mergeConfig(
     baseConfig,
     defineConfig({
       test: {
         include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
         name: 'new-package',
       },
     })
   );
   ```

3. **Add alias** (if needed) — Update root `vitest.config.ts`:
   ```typescript
   alias: {
     // ...existing aliases
     '@raptscallions/new-package': resolve(__dirname, './packages/new-package/src'),
   }
   ```

## Related Pages

- [Test Structure](/testing/concepts/test-structure) — AAA pattern and describe blocks
- [Testing Overview](/testing/) — All testing patterns
- [Mocking Patterns](/testing/patterns/mocking) — Module mocking strategies

## References

**Key Files:**
- [vitest.config.ts](https://github.com/ryandt33/raptscallions/blob/main/vitest.config.ts) — Root configuration
- [vitest.workspace.ts](https://github.com/ryandt33/raptscallions/blob/main/vitest.workspace.ts) — Workspace discovery
- [packages/core/vitest.config.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/core/vitest.config.ts) — Package override example

**Implements:** E01-T008 (Configure Vitest for monorepo)
