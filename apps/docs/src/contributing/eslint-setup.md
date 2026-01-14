---
title: ESLint Configuration
description: How ESLint is configured in the monorepo and how to use it effectively
related_code:
  - eslint.config.js
  - .vscode/settings.json
  - package.json
  - packages/*/package.json
  - apps/*/package.json
implements_task: E01-T010
last_verified: 2026-01-14
---

# ESLint Configuration

The RaptScallions monorepo uses ESLint 9.x with TypeScript ESLint v8 to enforce code quality and maintain consistent style across all packages.

## Configuration Overview

The project uses ESLint's modern **flat config format** (`eslint.config.js`) with type-aware linting enabled for all TypeScript files.

**Key Features:**
- Zero `any` types allowed (enforced by strict rules)
- Explicit return types required on exported functions
- Automatic import ordering and deduplication
- Type-aware linting for async code and promises
- Auto-fix support for most violations
- VS Code integration with auto-fix on save

**Configuration File:** [eslint.config.js](https://github.com/ryandt33/raptscallions/blob/main/eslint.config.js)

## Running ESLint

### Basic Commands

```bash
# Lint all packages in monorepo
pnpm lint

# Auto-fix issues in all packages
pnpm lint:fix

# Lint single package
pnpm --filter @raptscallions/core lint

# Lint single package with auto-fix
pnpm --filter @raptscallions/db lint:fix
```

### Performance Monitoring

```bash
# Check linting performance (should be < 30 seconds)
time pnpm lint
```

::: tip Target Performance
Full monorepo linting should complete in under 30 seconds. If it's slower, check for unignored build artifacts or misconfigured patterns.
:::

## Critical Rules

### Zero `any` Tolerance

The project has a **strict ban on `any` types**. This is a core architectural decision to ensure type safety.

**Banned Rules:**
- `@typescript-eslint/no-explicit-any` - Direct `any` usage
- `@typescript-eslint/no-unsafe-assignment` - Assigning `any` values
- `@typescript-eslint/no-unsafe-call` - Calling functions with `any`
- `@typescript-eslint/no-unsafe-member-access` - Accessing properties on `any`
- `@typescript-eslint/no-unsafe-return` - Returning `any` values

**Severity:** Error (blocks CI)

### Explicit Return Types

All exported functions must have explicit return types to prevent accidental type widening.

**Rules:**
- `@typescript-eslint/explicit-module-boundary-types` - Return types on exports
- `@typescript-eslint/explicit-function-return-type` - Return types on all functions (with exceptions for expressions)

**Severity:** Error (blocks CI)

### Type-Aware Rules

TypeScript ESLint performs type checking during linting to catch async and promise-related issues:

- `@typescript-eslint/no-floating-promises` - Must await or handle promises
- `@typescript-eslint/no-misused-promises` - Promises used in wrong context
- `@typescript-eslint/require-await` - Async functions must use await

**Severity:** Error (blocks CI)

## Code Quality Rules

### Import Organization

Imports are automatically ordered and deduplicated:

```typescript
// ✅ Correct order (auto-fixed)
import { readFile } from 'node:fs/promises';  // Node.js built-ins

import { eq } from 'drizzle-orm';              // npm packages

import { db } from '@raptscallions/db';        // Internal packages

import { validateUser } from '../validators'; // Relative imports

import type { User } from './types';          // Type imports last
```

**Rules:**
- `import/order` - Enforce import group order with blank lines
- `import/no-duplicates` - No duplicate import statements
- `@typescript-eslint/consistent-type-imports` - Use `import type` for types

**Severity:** Error (blocks CI)

### Variable Declaration

```typescript
// ✅ Use const when possible
const userId = user.id;

// ✅ Use let when reassignment needed
let count = 0;
count++;

// ❌ Never use var
var name = 'Alice';  // Error: Use let/const instead
```

**Rules:**
- `prefer-const` - Use const when variable isn't reassigned
- `no-var` - Disallow var declarations

### Equality Checks

```typescript
// ✅ Always use strict equality
if (value === null) { }
if (count !== 0) { }

// ❌ Never use loose equality
if (value == null) { }   // Error
if (count != 0) { }      // Error
```

**Rule:** `eqeqeq` - Enforce strict equality (`===`, `!==`)

## Common Violations and Fixes

### Violation: Using `any` Type

```typescript
// ❌ BAD - Explicit any
function process(data: any) {
  return data.value;
}

// ✅ GOOD - Use unknown with type guard
function process(data: unknown): string {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

function isValidData(data: unknown): data is { value: string } {
  return typeof data === 'object'
    && data !== null
    && 'value' in data
    && typeof data.value === 'string';
}

// ✅ BETTER - Use Zod for runtime validation
const dataSchema = z.object({ value: z.string() });

function process(data: unknown): string {
  const parsed = dataSchema.parse(data);
  return parsed.value;
}
```

::: tip Zod for Unknown Types
When dealing with external data (API responses, user input), use Zod schemas for validation. This provides both runtime safety and type inference.
:::

### Violation: Missing Return Type

```typescript
// ❌ BAD - Implicit return type
export function getUser(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id)
  });
}

// ✅ GOOD - Explicit return type
export function getUser(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id)
  });
}

// ✅ ALSO GOOD - Async/await with explicit type
export async function getUser(id: string): Promise<User | undefined> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id)
  });
  return user;
}
```

### Violation: Wrong Import Order

```typescript
// ❌ BAD - Imports not grouped or sorted
import { db } from '@raptscallions/db';
import type { User } from '@raptscallions/core';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';

// ✅ GOOD - Auto-fixed by ESLint
import { readFile } from 'node:fs/promises';

import { eq } from 'drizzle-orm';

import { db } from '@raptscallions/db';

import type { User } from '@raptscallions/core';
```

::: tip Auto-Fix
Import ordering violations are automatically fixed by `pnpm lint:fix`. You rarely need to fix these manually.
:::

### Violation: Unused Variable

```typescript
// ❌ BAD - Variable declared but not used
function process(data: string, config: Config) {
  return data.toUpperCase(); // config unused
}

// ✅ GOOD - Prefix with underscore if intentionally unused
function process(data: string, _config: Config) {
  return data.toUpperCase();
}

// ✅ BETTER - Remove if truly unnecessary
function process(data: string) {
  return data.toUpperCase();
}
```

**Rule:** `@typescript-eslint/no-unused-vars` - Unused vars prefixed with `_` are allowed

### Violation: Floating Promise

```typescript
// ❌ BAD - Promise not awaited or handled
async function updateUser(id: string, data: UpdateUserInput) {
  validateUser(data);           // Error if this returns Promise
  await db.update(users)
    .set(data)
    .where(eq(users.id, id));
}

// ✅ GOOD - Await the promise
async function updateUser(id: string, data: UpdateUserInput) {
  await validateUser(data);     // Now awaited
  await db.update(users)
    .set(data)
    .where(eq(users.id, id));
}

// ✅ ALSO GOOD - Handle promise with .catch()
function updateUser(id: string, data: UpdateUserInput) {
  validateUser(data)
    .catch(err => logger.error({ err }, 'Validation failed'));

  return db.update(users)
    .set(data)
    .where(eq(users.id, id));
}
```

## Rule Overrides for Specific Files

### Test Files

Test files have relaxed rules to allow mocking with `any` types:

```typescript
// In *.test.ts or __tests__/**/*.ts files:

// ✅ Allowed in tests only
const mockDb: any = {
  query: { users: { findFirst: vi.fn() } }
};

// ✅ Console allowed in tests
console.log('Test output:', result);

// ✅ No explicit return types required in tests
function createMockUser(overrides) {
  return { id: '123', ...overrides };
}
```

**Relaxed Rules:**
- `@typescript-eslint/no-explicit-any` - Off (mocks may use any)
- `@typescript-eslint/no-unsafe-*` - Off (test utilities)
- `@typescript-eslint/explicit-function-return-type` - Off
- `no-console` - Off (debug output allowed)

### Config Files

Configuration files (`*.config.js`, `*.config.ts`, `vite.config.ts`) have relaxed type requirements:

```typescript
// In *.config.ts files:

// ✅ No explicit return types required
export default defineConfig({
  // ...
});

// ✅ Console allowed for build output
console.log('Building with production config');
```

**Relaxed Rules:**
- `@typescript-eslint/explicit-module-boundary-types` - Off
- `no-console` - Off

## VS Code Integration

### Extension Setup

Install the official ESLint extension:

**Extension ID:** `dbaeumer.vscode-eslint`

The project's `.vscode/settings.json` is pre-configured for optimal ESLint integration.

### Auto-Fix on Save

ESLint automatically fixes issues when you save a file:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

This setting is already configured in [.vscode/settings.json](https://github.com/ryandt33/raptscallions/blob/main/.vscode/settings.json).

### Troubleshooting VS Code

**Issue: ESLint not showing errors**

1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Run **"ESLint: Restart ESLint Server"**
3. Check Output panel → ESLint for errors

**Issue: Flat config not recognized**

Verify `.vscode/settings.json` includes:

```json
{
  "eslint.useFlatConfig": true
}
```

**Issue: Auto-fix not working on save**

Check that `editor.formatOnSave` is not conflicting:

```json
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Disabling Rules

In rare cases, you may need to disable a rule. **Always provide justification in code review.**

### Single Line Disable

```typescript
// Disable for next line only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = JSON.parse(untrustedInput);
```

### Block Disable

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any -- Reason: Third-party API returns untyped data */
function processLegacyApi(response: any) {
  // ... complex legacy integration
}
/* eslint-enable @typescript-eslint/no-explicit-any */
```

### File-Level Disable

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Entire file allows `any` (use very sparingly!)
```

::: warning Use Sparingly
Disabling rules should be a last resort. Always attempt to fix the underlying issue first:
- Use `unknown` instead of `any`
- Add proper type guards
- Use Zod schemas for validation
- Refactor code to be type-safe
:::

## Ignored Paths

The following paths are automatically ignored and won't be linted:

```javascript
{
  ignores: [
    '**/dist/**',           // Build output
    '**/node_modules/**',   // Dependencies
    '**/.vitepress/cache/**',  // VitePress cache
    '**/.vitepress/dist/**',   // VitePress build
    '**/coverage/**',       // Test coverage
    '**/*.d.ts',            // Generated type declarations
  ]
}
```

**Why ignore these?**
- Build artifacts are generated and shouldn't be linted
- Dependencies are third-party code
- Type declarations are auto-generated by TypeScript

## Continuous Integration

ESLint runs automatically in CI via the `ci:check` script:

```bash
pnpm ci:check  # Runs: typecheck → lint → test → build
```

**CI Behavior:**
- ESLint errors block PR merge
- ESLint warnings are treated as errors (`--max-warnings 0`)
- All packages are linted in parallel via `pnpm -r lint`

**CI Failure Example:**

```
Error: packages/auth/src/session.service.ts:42:15
  Unsafe assignment of an `any` value
  @typescript-eslint/no-unsafe-assignment
```

**To Fix Locally Before Pushing:**

```bash
# Run full CI check
pnpm ci:check

# Or just linting
pnpm lint

# Auto-fix what's possible
pnpm lint:fix
```

## Performance

**Target:** Full monorepo linting completes in < 30 seconds

**Current Performance:**
- Type-aware linting enabled for all packages
- Parallel execution via pnpm workspaces
- Caching not currently enabled (may be added if needed)

**If Linting is Slow:**

1. **Check ignored paths** - Ensure `dist/` and `node_modules/` are ignored
2. **Verify glob patterns** - Ensure test fixtures aren't being linted
3. **Enable caching** - Add `--cache` flag to lint scripts if needed:

```json
{
  "lint": "eslint src --max-warnings 0 --cache"
}
```

4. **Profile slow packages** - Run lint on individual packages to identify bottlenecks

## Package Scripts

Every package and app has standardized lint scripts:

```json
{
  "scripts": {
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix"
  }
}
```

**Root Scripts:**

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "lint:fix": "pnpm -r lint:fix"
  }
}
```

The root scripts run linting across all packages in parallel for maximum performance.

## Extending the Configuration

### Adding New Rules

To add a new rule, edit [eslint.config.js](https://github.com/ryandt33/raptscallions/blob/main/eslint.config.js):

```javascript
export default tseslint.config(
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Add new rule here
      'no-console': 'warn',
    }
  }
);
```

### Adding File-Specific Overrides

To add rules for specific file patterns:

```javascript
export default tseslint.config(
  // ... base config

  // New override for specific files
  {
    files: ['**/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',  // Allow console in scripts
    }
  }
);
```

### Adding React Rules (Future)

When the React frontend (`apps/web`) is implemented, add React-specific rules:

```javascript
import react from 'eslint-plugin-react';

export default tseslint.config(
  // ... base config

  {
    files: ['apps/web/**/*.tsx'],
    plugins: {
      react,
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
    }
  }
);
```

## References

- **ESLint Flat Config Docs:** [https://eslint.org/docs/latest/use/configure/configuration-files](https://eslint.org/docs/latest/use/configure/configuration-files)
- **TypeScript ESLint v8:** [https://typescript-eslint.io/](https://typescript-eslint.io/)
- **Implementation Spec:** [E01-T010-spec.md](https://github.com/ryandt33/raptscallions/blob/main/backlog/docs/specs/E01/E01-T010-spec.md)
- **Legacy Conventions:** [CONVENTIONS.md](https://github.com/ryandt33/raptscallions/blob/main/docs/CONVENTIONS.md) (ESLint section)
