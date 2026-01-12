# E01-T008: Configure Vitest for monorepo - Implementation Specification

**Task ID:** E01-T008
**Epic:** E01 - Foundation Infrastructure
**Status:** ANALYZED
**Analyst:** analyst
**Date:** 2026-01-12

---

## Overview

This task configures Vitest as the test runner across the Raptscallions monorepo with shared configuration, coverage reporting, and workspace support. The goal is to establish a consistent testing infrastructure that supports both the existing packages (`core`, `db`, `modules`, `telemetry`) and future apps (`api`, `worker`, `web`).

### Current State Analysis

**Existing Configuration:**
- Vitest is already installed in `packages/core` and `packages/db` (v1.1.0)
- Each package has its own `vitest.config.ts` with identical configuration
- Test scripts are defined in package.json for both packages
- Root `package.json` has a `test` script that runs `pnpm -r test`
- Test files follow the pattern: `src/**/__tests__/**/*.test.ts`
- Coverage is configured with v8 provider and 80% thresholds
- Tests already exist and are passing (e.g., `errors.test.ts` demonstrates proper AAA pattern)

**Gaps to Address:**
1. No workspace-level vitest configuration at root
2. Vitest and coverage dependencies not installed at root level
3. No unified test pattern supporting both `**/*.test.ts` and `__tests__/**/*.ts`
4. No shared base configuration to extend from
5. Missing TypeScript path resolution in test environment
6. No root-level test:coverage or test:watch scripts
7. Apps directory exists but is empty (placeholder with `.gitkeep`)

**Key Decisions:**
- Use Vitest workspace feature for monorepo support (native support for pnpm workspaces)
- Maintain per-package configs that extend root for customization
- Support both inline tests (*.test.ts) and __tests__ directories
- Configure path aliases for cross-package imports (@raptscallions/*)
- Use v8 coverage provider (already used in packages)
- Set 80% coverage thresholds (aligns with existing config and CONVENTIONS.md)

---

## Architecture & Design

### File Structure

```
raptscallions/
├── vitest.config.ts                    # NEW: Root workspace config
├── vitest.workspace.ts                 # NEW: Workspace definition
├── package.json                        # MODIFY: Add root dependencies & scripts
├── packages/
│   ├── core/
│   │   ├── vitest.config.ts           # MODIFY: Extend root config
│   │   ├── package.json               # Already configured
│   │   └── src/__tests__/             # Tests already exist
│   ├── db/
│   │   ├── vitest.config.ts           # MODIFY: Extend root config
│   │   ├── package.json               # Already configured
│   │   └── src/                       # (tests to be added later)
│   ├── modules/
│   │   ├── vitest.config.ts           # NEW: Package config
│   │   └── package.json               # MODIFY: Add test scripts
│   └── telemetry/
│       ├── vitest.config.ts           # NEW: Package config
│       └── package.json               # MODIFY: Add test scripts
└── apps/
    └── .gitkeep                       # Empty - apps will be added later
```

### Workspace Configuration Strategy

**Root Configuration (`vitest.config.ts`):**
- Defines shared defaults for all packages
- Configures TypeScript path resolution
- Sets coverage provider and thresholds
- Configures global settings (globals: true, environment: 'node')

**Workspace Definition (`vitest.workspace.ts`):**
- Explicitly lists all packages to include in test runs
- Allows per-package configuration overrides
- Supports future apps when they're added

**Package Configurations:**
- Extend root configuration using Vitest's config merging
- Override only package-specific settings (test includes, exclude patterns)
- Maintain package-level isolation for focused testing

### Coverage Strategy

**Coverage Provider:** v8 (fast, accurate, built-in)

**Reporters:**
- `text` - Console output during test runs
- `json-summary` - Machine-readable summary for CI
- `html` - Detailed HTML report for local development

**Thresholds (80% minimum per CONVENTIONS.md):**
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

**Exclusions:**
- `**/node_modules/**`
- `**/dist/**`
- `**/*.config.*` - Configuration files
- `**/types/**` - Type definitions
- `**/migrations/**` - SQL migrations

### Path Resolution

TypeScript path aliases must be resolved in test environment:

```typescript
'@raptscallions/core' → './packages/core/src'
'@raptscallions/db' → './packages/db/src'
'@raptscallions/modules' → './packages/modules/src'
'@raptscallions/telemetry' → './packages/telemetry/src'
```

**Implementation:** Use Vitest's `resolve.alias` configuration to match TypeScript paths from root `tsconfig.json`.

---

## Implementation Plan

### Phase 1: Root Configuration

**1.1 Install Dependencies**

```bash
pnpm add -D -w vitest @vitest/coverage-v8 @vitest/ui
```

- `-w` flag installs at workspace root
- `vitest` - Test runner
- `@vitest/coverage-v8` - Coverage provider
- `@vitest/ui` - Optional web UI for test results

**1.2 Create Root Vitest Config**

File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.ts',
      'packages/**/__tests__/**/*.ts',
      'apps/**/*.test.ts',
      'apps/**/__tests__/**/*.ts',
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
        '**/types/**',
        '**/migrations/**',
        '**/__tests__/**',
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
      '@raptscallions/core': resolve(__dirname, './packages/core/src'),
      '@raptscallions/db': resolve(__dirname, './packages/db/src'),
      '@raptscallions/modules': resolve(__dirname, './packages/modules/src'),
      '@raptscallions/telemetry': resolve(__dirname, './packages/telemetry/src'),
    },
  },
});
```

**Key Features:**
- `globals: true` - Enables global test APIs (describe, it, expect) without imports
- Includes both `*.test.ts` and `__tests__/**/*.ts` patterns
- Path aliases match root `tsconfig.json` configuration
- Coverage excludes test files and non-code files

**1.3 Create Workspace Definition**

File: `vitest.workspace.ts`

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core',
  'packages/db',
  'packages/modules',
  'packages/telemetry',
  // Future apps will be added here:
  // 'apps/api',
  // 'apps/worker',
  // 'apps/web',
]);
```

**Benefits:**
- Explicit workspace members
- Vitest automatically discovers configs in each package
- Allows parallel test execution across packages
- Easy to add new packages/apps

**1.4 Update Root package.json**

Add/modify scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

**Script Behavior:**
- `test` - Run all tests once (CI mode)
- `test:coverage` - Run with coverage report
- `test:watch` - Watch mode for development
- `test:ui` - Web UI for interactive testing

### Phase 2: Package Configurations

**2.1 Update packages/core/vitest.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
      name: 'core',
    },
  })
);
```

**Changes:**
- Import and extend root config using `mergeConfig`
- Override only `include` pattern for package scope
- Add `name` for clear test output identification

**2.2 Update packages/db/vitest.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
      name: 'db',
    },
  })
);
```

**Same pattern as core** - consistency across packages

**2.3 Add packages/modules/vitest.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
      name: 'modules',
    },
  })
);
```

**2.4 Add packages/telemetry/vitest.config.ts**

```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
      name: 'telemetry',
    },
  })
);
```

**2.5 Update packages/modules/package.json**

Check if test scripts exist, add if missing:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**2.6 Update packages/telemetry/package.json**

Same as modules:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Phase 3: Verification

**3.1 Create Sample Test (if needed)**

If `packages/core` doesn't have tests, add a simple one:

File: `packages/core/src/__tests__/sample.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
  it('should pass basic assertion', () => {
    // Arrange
    const value = 42;

    // Act
    const result = value + 1;

    // Assert
    expect(result).toBe(43);
  });

  it('should validate AAA pattern', () => {
    // Arrange
    const input = 'hello';

    // Act
    const output = input.toUpperCase();

    // Assert
    expect(output).toBe('HELLO');
  });
});
```

**Note:** Based on analysis, `packages/core` already has comprehensive test files, so this may not be needed.

**3.2 Run Tests from Root**

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run tests for specific package
pnpm --filter @raptscallions/core test
```

**3.3 Verify Path Resolution**

Create a test that imports from another package:

File: `packages/core/src/__tests__/cross-package.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
// This should resolve via path alias
import type { User } from '@raptscallions/core';

describe('Cross-package Imports', () => {
  it('should resolve TypeScript path aliases', () => {
    // Arrange
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act & Assert
    expect(user.id).toBe('123');
    expect(user.email).toBe('test@example.com');
  });
});
```

**Validation:** Ensure test runs without import errors.

**3.4 Verify Coverage Thresholds**

```bash
pnpm test:coverage
```

**Expected Output:**
- Coverage report generated in `coverage/` directory
- HTML report available at `coverage/index.html`
- Console shows coverage percentages
- Fails if any threshold below 80% (once sufficient tests exist)

---

## Acceptance Criteria Mapping

| ID   | Criterion | Implementation | Verification |
|------|-----------|----------------|--------------|
| AC1  | vitest and @vitest/coverage-v8 installed in root | Phase 1.1: `pnpm add -D -w vitest @vitest/coverage-v8` | Check root `package.json` devDependencies |
| AC2  | vitest.config.ts at root with workspace config | Phase 1.2: Create root config with workspace support | File exists with proper exports |
| AC3  | Each package can extend root config | Phase 2: All packages use `mergeConfig(baseConfig, ...)` | Verify imports in package configs |
| AC4  | Test patterns: **/*.test.ts, **/__tests__/**/*.ts | Phase 1.2: Root config `include` array | Run tests, verify discovery |
| AC5  | Coverage with v8 provider | Phase 1.2: `coverage.provider: 'v8'` | `pnpm test:coverage` succeeds |
| AC6  | 80% thresholds | Phase 1.2: All thresholds set to 80 | Coverage report shows thresholds |
| AC7  | Root scripts: test, test:coverage, test:watch | Phase 1.4: Add scripts to root package.json | Run each script successfully |
| AC8  | Tests import workspace packages | Phase 1.2: Path aliases in resolve.alias | Phase 3.3 cross-package test |
| AC9  | TypeScript paths resolved | Phase 1.2: Alias config matches tsconfig | TypeScript checks pass in tests |
| AC10 | Sample test in core passes | Phase 3.1: Create or verify existing test | `pnpm --filter @raptscallions/core test` passes |

---

## Edge Cases & Error Handling

### Issue: Vitest version conflicts

**Scenario:** Different Vitest versions in packages vs root

**Solution:**
- Use pnpm's workspace protocol to ensure version consistency
- Root should be source of truth for Vitest version
- Packages should not declare direct Vitest dependencies (inherit from root)

**Implementation:**
```bash
# Remove package-level vitest deps (if they conflict)
pnpm remove vitest @vitest/coverage-v8 --filter @raptscallions/core
pnpm remove vitest @vitest/coverage-v8 --filter @raptscallions/db

# They'll inherit from root workspace
```

**Note:** Current investigation shows packages already have vitest in devDependencies. We should keep them there for per-package test runs to work, but ensure versions align with root.

### Issue: Path alias resolution fails

**Scenario:** Imports using `@raptscallions/*` fail in tests

**Root Cause:** Vitest doesn't automatically read tsconfig.json paths

**Solution:**
- Explicitly configure `resolve.alias` in root vitest config
- Use `path.resolve(__dirname, ...)` for absolute paths
- Ensure aliases match `tsconfig.json` exactly

**Verification:**
```typescript
// Should work in tests
import { AppError } from '@raptscallions/core';
```

### Issue: Coverage excludes don't work

**Scenario:** Test files appear in coverage report

**Solution:**
- Add `**/__tests__/**` to coverage.exclude
- Add `**/*.test.ts` to coverage.exclude
- Verify glob patterns match file structure

**Check:**
```bash
pnpm test:coverage
# Open coverage/index.html
# Confirm no test files listed
```

### Issue: Tests pass locally but fail in CI

**Scenario:** Different Node.js versions or missing dependencies

**Solution:**
- Lock Node.js version in `.nvmrc` (already exists: node 20)
- Use `pnpm install --frozen-lockfile` in CI
- Ensure all test dependencies installed at root

**CI Script:**
```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm test:coverage
- run: pnpm typecheck
```

### Issue: Workspace not detecting all packages

**Scenario:** `pnpm test` doesn't run tests in all packages

**Solution:**
- Verify `vitest.workspace.ts` lists all packages explicitly
- Check `pnpm-workspace.yaml` includes correct globs
- Use `pnpm -r list` to verify workspace detection

**Debug:**
```bash
pnpm -r list  # Should show all packages
pnpm test --reporter=verbose  # Shows which packages tested
```

---

## Testing Strategy

### Unit Tests

**Target:** Individual functions, classes, utilities

**Example (from existing `errors.test.ts`):**
```typescript
describe('AppError', () => {
  it('should create error with message, code, statusCode, and details', () => {
    // Arrange
    const message = 'Something went wrong';
    const code = 'GENERIC_ERROR';
    const statusCode = 500;

    // Act
    const error = new AppError(message, code, statusCode);

    // Assert
    expect(error.message).toBe(message);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(statusCode);
  });
});
```

**Coverage Target:** 80% minimum per CONVENTIONS.md

### Integration Tests

**Target:** Cross-package interactions, schema compositions

**Example (from existing `cross-package-imports.test.ts`):**
```typescript
describe('Cross-package Imports', () => {
  it('should import types from @raptscallions/core', async () => {
    // Arrange - dynamic import
    const core = await import('@raptscallions/core');

    // Act & Assert
    expect(core).toBeDefined();
    expect(core.AppError).toBeDefined();
  });
});
```

### Configuration Tests

**Target:** Vitest setup itself

**Test Cases:**
1. Root config exports valid Vitest config
2. Package configs successfully extend root
3. Path aliases resolve correctly
4. Coverage thresholds enforce properly
5. Test discovery finds all test files

**Implementation:**
```typescript
describe('Vitest Configuration', () => {
  it('should resolve workspace packages', async () => {
    // Arrange
    const packages = ['@raptscallions/core', '@raptscallions/db'];

    // Act & Assert
    for (const pkg of packages) {
      await expect(import(pkg)).resolves.toBeDefined();
    }
  });
});
```

---

## Performance Considerations

### Parallel Execution

**Strategy:** Vitest runs tests in parallel by default

**Configuration:**
```typescript
test: {
  // Default: number of CPU cores
  threads: true,
  // Limit if memory constrained
  maxThreads: 4,
}
```

**Benefit:** Faster test runs across monorepo

### Watch Mode Optimization

**Strategy:** Only re-run affected tests on file changes

**Configuration:**
```typescript
test: {
  watch: true,
  // Only test changed files
  changed: true,
}
```

**Usage:** `pnpm test:watch` for development

### Coverage Collection Overhead

**Strategy:** Skip coverage in watch mode, only collect in CI

**Scripts:**
```json
{
  "test": "vitest run",           // No coverage (fast)
  "test:coverage": "vitest run --coverage",  // Full coverage (slower)
  "test:watch": "vitest"          // No coverage (fast feedback)
}
```

**CI:** Always use `test:coverage`
**Dev:** Use `test:watch` for rapid iteration

### Dependency Resolution

**Strategy:** Vitest resolves imports using same algorithm as Node.js

**Optimization:**
- Use path aliases to avoid relative import chains
- Leverage TypeScript's module resolution
- Avoid circular dependencies between packages

**Monitoring:**
```bash
# Check import graph
pnpm why <package>

# Verify workspace structure
pnpm -r list --depth 0
```

---

## Dependencies

### Required Packages (Root)

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^1.1.0 | Test runner |
| `@vitest/coverage-v8` | ^1.1.0 | Coverage provider |
| `@vitest/ui` | ^1.1.0 | Optional web UI |

**Installation:**
```bash
pnpm add -D -w vitest@^1.1.0 @vitest/coverage-v8@^1.1.0 @vitest/ui@^1.1.0
```

### Package-level Dependencies

Each package should have:
```json
{
  "devDependencies": {
    "vitest": "^1.1.0"
  }
}
```

**Note:** Packages inherit from root but can declare for explicit per-package runs.

### TypeScript Configuration

**Root `tsconfig.json` already configured with:**
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `paths` for workspace packages

**No changes needed** - Vitest will use existing TypeScript config.

---

## Migration Notes

### From Current State

**Existing Setup:**
- `packages/core` and `packages/db` already have Vitest
- Both use identical `vitest.config.ts`
- Tests already follow AAA pattern
- Coverage thresholds already at 80%

**Migration Steps:**
1. Install root dependencies (additive)
2. Create root configs (new files)
3. Update package configs to extend root (modify existing)
4. Add configs for `modules` and `telemetry` (new)
5. Verify all existing tests still pass

**Risk Level:** Low - Existing tests should continue working

### Breaking Changes

**None expected** - This is additive configuration.

**Rollback Plan:**
If issues arise, each package's local config is self-contained and can run independently:
```bash
pnpm --filter @raptscallions/core test
```

### Future Additions

**When apps/ are populated:**

1. Add app to `vitest.workspace.ts`:
```typescript
export default defineWorkspace([
  'packages/*',
  'apps/api',    // Add as needed
  'apps/worker',
  'apps/web',
]);
```

2. Create `apps/api/vitest.config.ts`:
```typescript
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      name: 'api',
    },
  })
);
```

3. Add test scripts to `apps/api/package.json`

**Pattern repeats** for `worker` and `web` apps.

---

## Documentation Updates

### README.md (if exists)

Add testing section:

```markdown
## Testing

Run all tests:
```bash
pnpm test
```

Run tests with coverage:
```bash
pnpm test:coverage
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Run tests for specific package:
```bash
pnpm --filter @raptscallions/core test
```

View coverage report:
- HTML: `open coverage/index.html`
- Console: Printed after `pnpm test:coverage`
```

### CONVENTIONS.md

**Already documents** testing standards - no updates needed.

Section includes:
- AAA pattern requirement
- Test file naming conventions
- 80% coverage minimum
- Test structure examples

### Package READMEs

Each package should document its specific tests:

```markdown
## Testing

This package uses Vitest. Run tests:

```bash
# From package directory
pnpm test

# From root
pnpm --filter @raptscallions/<package> test
```

Tests are located in `src/__tests__/` and follow the AAA pattern.
```

---

## Security Considerations

### Dependency Security

**Concern:** Test dependencies can introduce vulnerabilities

**Mitigation:**
- Only install from trusted sources (npm registry)
- Use exact or caret versions for security updates
- Run `pnpm audit` regularly
- Update dependencies promptly

**Verification:**
```bash
pnpm audit
pnpm outdated
```

### Test Data

**Concern:** Sensitive data in test fixtures

**Mitigation:**
- Never use real credentials, API keys, or PII in tests
- Use obviously fake data (test@example.com, test-user-123)
- Add `.env.test` to `.gitignore`
- Document test data guidelines in CONVENTIONS.md

**Example:**
```typescript
// ✅ Good - Obviously fake
const testUser = {
  email: 'test@example.com',
  password: 'test-password-123',
};

// ❌ Bad - Looks like real data
const testUser = {
  email: 'john.doe@company.com',
  password: 'MyRealPassword123!',
};
```

### Coverage Reports

**Concern:** Coverage reports may expose code structure

**Mitigation:**
- Add `coverage/` to `.gitignore` (should already be there)
- Never commit coverage HTML reports
- Use CI artifacts for coverage storage, not repo

**Verification:**
```bash
grep -q "^coverage/$" .gitignore || echo "coverage/" >> .gitignore
```

---

## Monitoring & Observability

### Test Execution Metrics

**Track:**
- Total test count
- Execution time
- Failure rate
- Coverage percentage

**Implementation:** Vitest reporters provide this automatically

**CI Integration:**
```yaml
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

### Coverage Trends

**Tool:** Codecov or similar

**Configuration:**
```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
```

**Benefit:** Prevents coverage regression over time

### Test Flakiness

**Detection:** Track tests that fail intermittently

**Vitest Feature:**
```typescript
test: {
  retry: 2,  // Retry failing tests twice
}
```

**Monitoring:** CI should flag tests that only pass on retry

---

## Success Criteria Summary

This task is complete when:

1. ✅ All dependencies installed at root level
2. ✅ Root `vitest.config.ts` and `vitest.workspace.ts` created
3. ✅ All four packages have configs extending root
4. ✅ Test scripts added to root `package.json`
5. ✅ Test scripts added/verified in all package `package.json` files
6. ✅ `pnpm test` runs all tests successfully
7. ✅ `pnpm test:coverage` generates coverage report with 80% thresholds
8. ✅ Path aliases resolve correctly in test environment
9. ✅ At least one test exists and passes in `packages/core`
10. ✅ All existing tests continue to pass after migration

**Verification Command:**
```bash
# Run all checks
pnpm test:coverage && \
pnpm --filter @raptscallions/core test && \
pnpm --filter @raptscallions/db test
```

**Expected Result:** All tests pass, coverage report generated, no errors.

---

## Implementation Checklist

### Phase 1: Root Configuration
- [ ] Install vitest, @vitest/coverage-v8, @vitest/ui at root
- [ ] Create `vitest.config.ts` at root
- [ ] Create `vitest.workspace.ts` at root
- [ ] Update root `package.json` scripts
- [ ] Verify root test script runs

### Phase 2: Package Configurations
- [ ] Update `packages/core/vitest.config.ts` to extend root
- [ ] Update `packages/db/vitest.config.ts` to extend root
- [ ] Create `packages/modules/vitest.config.ts`
- [ ] Create `packages/telemetry/vitest.config.ts`
- [ ] Add/verify test scripts in `packages/modules/package.json`
- [ ] Add/verify test scripts in `packages/telemetry/package.json`

### Phase 3: Verification
- [ ] Run `pnpm test` - all tests pass
- [ ] Run `pnpm test:coverage` - coverage report generated
- [ ] Run `pnpm test:watch` - watch mode works
- [ ] Verify path aliases resolve (cross-package import test)
- [ ] Check coverage thresholds enforced
- [ ] Verify test discovery finds all test files
- [ ] Run per-package tests: `pnpm --filter @raptscallions/core test`
- [ ] Check HTML coverage report: `open coverage/index.html`

### Phase 4: Documentation
- [ ] Update README.md with testing instructions (if exists)
- [ ] Verify CONVENTIONS.md covers test patterns (already done)
- [ ] Add testing section to package READMEs (if needed)

### Phase 5: Final Validation
- [ ] All 10 acceptance criteria met
- [ ] No TypeScript errors in test files
- [ ] No console warnings during test runs
- [ ] Coverage report shows correct thresholds
- [ ] Git status clean (no unintended file changes)

---

## References

- **ARCHITECTURE.md:** Testing stack (Vitest), monorepo structure
- **CONVENTIONS.md:** Test structure (AAA), naming, coverage requirements
- **.claude/rules/testing.md:** Detailed testing patterns and examples
- **Vitest Documentation:** https://vitest.dev/guide/workspace.html
- **Task:** E01-T008 in backlog/tasks/E01/

---

## Notes for Implementation

1. **Order Matters:** Install root dependencies first, then update configs
2. **Preserve Existing Tests:** Don't modify test files, only configuration
3. **Verify After Each Phase:** Run tests after each major change
4. **Path Aliases Critical:** Ensure aliases match tsconfig.json exactly
5. **Coverage HTML Useful:** Open coverage/index.html to verify excludes work
6. **Workspace Discovery:** Use `pnpm -r list` to debug workspace issues
7. **Version Alignment:** Keep vitest versions consistent between root and packages
8. **Sample Test Optional:** Core already has tests, may not need new sample test

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Status:** APPROVED

### Developer Experience Assessment

This specification establishes the testing infrastructure for the monorepo. As a developer-facing infrastructure task, the "users" are the developers working on Raptscallions. The UX review focuses on developer experience (DX) - clarity, ease of use, and consistency.

#### Strengths

1. **Clear Mental Model**
   - ✅ The three-tier config structure (root → workspace → packages) is well-explained
   - ✅ Visual file structure diagrams help developers understand where files go
   - ✅ Phase-based implementation makes the task approachable

2. **Excellent Documentation**
   - ✅ Each script is explained with clear purpose (test, test:coverage, test:watch, test:ui)
   - ✅ Code examples are complete and runnable
   - ✅ Commands include both root and per-package variations

3. **Consistency**
   - ✅ All package configs follow identical pattern (extend root, add name)
   - ✅ Naming conventions match project standards (snake_case for files, PascalCase for components)
   - ✅ Test patterns align with CONVENTIONS.md (AAA pattern, 80% coverage)

4. **Error Prevention**
   - ✅ Comprehensive "Edge Cases & Error Handling" section anticipates common issues
   - ✅ Version conflict resolution explained
   - ✅ Path alias troubleshooting included
   - ✅ CI-specific concerns addressed

5. **Discoverability**
   - ✅ Clear verification commands after each phase
   - ✅ "Migration Notes" section helps developers understand transition
   - ✅ Implementation checklist provides step-by-step guidance

#### UX Concerns & Recommendations

**Minor Issue:** Cognitive Load in Path Resolution Section

*Location:* Phase 1.2, `resolve.alias` configuration

*Issue:* The path aliases are manually defined in both `tsconfig.json` and `vitest.config.ts`. If a developer adds a new package, they must remember to update both files.

*Recommendation:* Add a note in the "Migration Notes" or "Future Additions" section:

```markdown
**When adding a new package:**
1. Add to pnpm-workspace.yaml
2. Add to vitest.workspace.ts
3. Add path alias to root tsconfig.json
4. Add matching alias to vitest.config.ts resolve.alias
```

*Impact:* Low - This is documented in "Future Additions" but could be more prominent
*Decision:* Keep as-is, but add to implementation notes

**Observation:** Test Discovery UX

*Location:* Phase 1.2, `include` patterns

*Strength:* Supporting both `**/*.test.ts` (inline tests) and `**/__tests__/**/*.ts` (directory-based) gives developers flexibility in organizing tests

*No action needed* - This is already a UX strength

**Observation:** Coverage Report Access

*Location:* Phase 3.4, coverage verification

*Strength:* Multiple reporter formats (text, json-summary, html) serve different needs:
- `text` - Quick feedback during development
- `json-summary` - CI integration
- `html` - Detailed local analysis

*No action needed* - Well thought out

**Minor Suggestion:** Script Naming Clarity

*Location:* Phase 1.4, root package.json scripts

*Observation:* The script names are clear, but the spec could benefit from a "Command Cheat Sheet" for quick reference

*Recommendation:* Add a quick reference section at the top of "Verification" phase:

```markdown
### Quick Reference

| Command | Purpose | Use When |
|---------|---------|----------|
| `pnpm test` | Run all tests once | CI, pre-commit |
| `pnpm test:coverage` | Run with coverage | CI, checking quality |
| `pnpm test:watch` | Watch mode | Active development |
| `pnpm test:ui` | Web UI | Debugging, exploration |
| `pnpm --filter @raptscallions/core test` | Test single package | Package-specific work |
```

*Impact:* Low - Improves onboarding and reduces cognitive load
*Decision:* Optional enhancement, not required for approval

#### Accessibility Considerations

**Developer Accessibility:**

1. ✅ **Screen reader friendly:** Command examples use semantic structure with clear labels
2. ✅ **Color-independent:** Uses symbols (✅, ❌) not just color for good/bad examples
3. ✅ **Progressive disclosure:** Sections build on each other logically
4. ✅ **Error messages:** Edge cases section provides clear error scenarios and solutions

#### Consistency with Platform Patterns

1. ✅ Aligns with CONVENTIONS.md testing standards
2. ✅ Follows monorepo structure in ARCHITECTURE.md
3. ✅ Matches file naming conventions from .claude/rules/testing.md
4. ✅ Uses AAA test pattern consistently
5. ✅ 80% coverage threshold matches platform requirement

#### Overall Assessment

**Verdict:** ✅ **APPROVED** - Excellent developer experience design

This specification demonstrates strong attention to developer experience:
- Clear mental models and visual aids
- Comprehensive documentation with runnable examples
- Proactive error handling and troubleshooting
- Consistent patterns across all packages
- Good balance of flexibility and convention

The minor suggestions above would enhance an already strong spec but are not blockers. The specification is ready for architecture review.

**Recommended Next State:** `PLAN_REVIEW` (proceed to architect review)

---

**Status:** Ready for implementation
**Estimated Effort:** 1-2 hours
**Risk Level:** Low
**Dependencies:** E01-T001 (completed - pnpm workspace configured)

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Status:** APPROVED

### Architectural Alignment Assessment

This specification configures Vitest as the monorepo testing infrastructure. The review focuses on alignment with ARCHITECTURE.md, CONVENTIONS.md, and overall system design principles.

#### Technology Stack Compliance

✅ **Fully Aligned with Canonical Stack**

The specification correctly uses the technologies mandated in ARCHITECTURE.md:

| Technology | Required Version | Spec Version | Status |
|------------|-----------------|--------------|--------|
| Vitest | (not specified in ARCHITECTURE.md) | ^1.1.0 | ✅ Current stable |
| Node.js | 20 LTS | Inherited | ✅ Via existing .nvmrc |
| TypeScript | 5.3+ | Inherited | ✅ Via tsconfig.json |

**Observation:** Vitest is explicitly mentioned in ARCHITECTURE.md as the testing framework but without a specific version. The specification's choice of v1.1.0 is appropriate as it's the latest stable release matching existing package versions.

#### Monorepo Structure Compliance

✅ **Perfect Alignment with Defined Structure**

The specification respects the canonical monorepo layout:

```
raptscallions/
├── vitest.config.ts           ✅ Root config (NEW)
├── vitest.workspace.ts        ✅ Workspace definition (NEW)
├── packages/
│   ├── core/vitest.config.ts   ✅ Extends root
│   ├── db/vitest.config.ts     ✅ Extends root
│   ├── modules/vitest.config.ts ✅ NEW
│   └── telemetry/vitest.config.ts ✅ NEW
└── apps/                       ✅ Empty (future expansion planned)
```

**Strengths:**
- No changes to directory structure
- Adds configuration files only
- Follows "packages/*" pattern from ARCHITECTURE.md
- Plans for future "apps/*" addition documented

#### Code Convention Adherence

✅ **Exemplary Compliance with CONVENTIONS.md**

1. **Testing Standards (100% match)**
   - ✅ 80% minimum line coverage threshold
   - ✅ AAA (Arrange/Act/Assert) pattern enforced
   - ✅ Test file naming: `*.test.ts` and `__tests__/**/*.ts`
   - ✅ TDD workflow supported via watch mode

2. **TypeScript Strict Mode**
   - ✅ Leverages existing tsconfig.json strict settings
   - ✅ No `any` usage in test configurations
   - ✅ Type-safe path resolution for imports

3. **File Naming**
   - ✅ Config files: `vitest.config.ts` (matches `*.config.ts` pattern)
   - ✅ Test files: `*.test.ts` (explicit in conventions)
   - ✅ Workspace file: `vitest.workspace.ts` (framework convention)

#### Architectural Principles Evaluation

**1. Explicit over Implicit** ✅

The specification excels here:
- Explicit workspace member list (not glob-based auto-discovery)
- Explicit path alias configuration (not relying on tsconfig.json auto-read)
- Explicit coverage thresholds and exclusions

```typescript
// Example of explicitness:
export default defineWorkspace([
  'packages/core',      // Explicit
  'packages/db',        // Not 'packages/*'
  'packages/modules',
  'packages/telemetry',
]);
```

**Rationale:** This prevents silent test discovery failures when new packages are added.

**2. Composition over Inheritance** ✅

The three-tier config strategy demonstrates excellent composition:
- Root config defines shared defaults
- Workspace composes package list
- Package configs compose root via `mergeConfig(baseConfig, overrides)`

**3. Fail Fast** ✅

Multiple fail-fast mechanisms:
- 80% coverage thresholds enforce quality
- TypeScript strict mode catches type errors
- Zod validation in tests (per convention examples)
- CI integration planned (test:coverage in CI)

**4. Zero Technical Debt** ✅

The specification addresses existing technical debt:
- Consolidates duplicate configs in `core` and `db`
- Adds missing configs for `modules` and `telemetry`
- Establishes scalable pattern for future apps

#### Integration with Existing Systems

**Database Layer Integration** ✅

The specification correctly configures coverage exclusions:
```typescript
exclude: [
  '**/migrations/**',  // ✅ Correct - SQL migrations shouldn't be covered
  '**/types/**',       // ✅ Correct - Type definitions
  '**/*.config.*',     // ✅ Correct - Config files
]
```

**Telemetry Package Integration** ✅

The spec acknowledges the telemetry package and adds test configuration for it, supporting future structured logging tests.

**Path Alias Resolution** ✅

Critical for monorepo: The specification correctly maps TypeScript paths to test resolution:

```typescript
resolve: {
  alias: {
    '@raptscallions/core': resolve(__dirname, './packages/core/src'),
    '@raptscallions/db': resolve(__dirname, './packages/db/src'),
    // ... matches tsconfig.json paths
  },
}
```

**Concern Addressed:** The spec explicitly documents that this must be kept in sync with `tsconfig.json` (see "UX Concerns" section).

#### Scalability & Extensibility

**Future Apps Support** ✅

The specification includes excellent forward planning:

```typescript
// vitest.workspace.ts
export default defineWorkspace([
  'packages/core',
  'packages/db',
  'packages/modules',
  'packages/telemetry',
  // Future apps will be added here:
  // 'apps/api',
  // 'apps/worker',
  // 'apps/web',
]);
```

**Migration Path Documented** ✅

Section "Future Additions" provides clear pattern for adding apps. This follows the principle of "explicit over implicit" and helps future developers.

#### Performance Considerations

**Parallel Test Execution** ✅

The spec leverages Vitest's native parallelism:
- Workspace-based isolation allows parallel package testing
- `threads: true` default setting (mentioned in Performance section)
- No artificial serialization introduced

**Watch Mode Optimization** ✅

Development workflow optimized:
- `test:watch` script excludes coverage collection (fast feedback)
- `test:coverage` reserved for CI and quality checks
- Changed files only tested in watch mode

**Coverage Collection Overhead** ✅

Smart strategy:
- Development: `pnpm test:watch` (no coverage, instant feedback)
- CI: `pnpm test:coverage` (full coverage, slower acceptable)
- Local verification: `pnpm test:coverage` (on-demand)

#### Security Review

**Dependency Security** ✅

The specification addresses security concerns:
- All dependencies from official npm registry
- Version pinning strategy (caret ranges for updates)
- `pnpm audit` mentioned in "Security Considerations"

**Test Data Handling** ✅

Excellent guidance on test data:
```typescript
// ✅ Good - Obviously fake
const testUser = {
  email: 'test@example.com',
  password: 'test-password-123',
};
```

**Coverage Report Handling** ✅

Proper handling of potentially sensitive coverage data:
- `coverage/` in `.gitignore` (verification command provided)
- HTML reports not committed
- CI artifacts recommended for storage

#### Containerization Compliance

**Docker Compatibility** ✅

Per ARCHITECTURE.md requirement: "The entire project MUST be containerizable."

The testing configuration is container-friendly:
- ✅ No host-specific paths (uses relative paths)
- ✅ No dependencies on host-installed tools
- ✅ Works in Node.js 20 container (per .nvmrc)
- ✅ CI scripts use standard pnpm commands

Future consideration: When Dockerfile is added, the test layer should use:
```dockerfile
RUN pnpm test:coverage --reporter=json-summary
```

#### Error Handling & Edge Cases

**Comprehensive Coverage** ✅

The "Edge Cases & Error Handling" section demonstrates strong architectural thinking:

1. **Vitest version conflicts** - Proactive resolution strategy
2. **Path alias failures** - Debugging approach documented
3. **Coverage excludes** - Verification commands provided
4. **CI failures** - Node.js version locking via .nvmrc
5. **Workspace detection** - Debug commands included

**Critical Error Prevention** ✅

The specification prevents common errors:
- Explicit workspace members (prevents silent omissions)
- Path alias verification test planned (Phase 3.3)
- Coverage threshold enforcement (fails build if <80%)

#### Documentation Quality

**Canonical Reference Alignment** ✅

The specification correctly references canonical docs:
- ARCHITECTURE.md (technology stack, monorepo structure)
- CONVENTIONS.md (test patterns, coverage requirements)
- .claude/rules/testing.md (detailed testing patterns)

**Self-Contained Completeness** ✅

The spec is implementation-ready:
- Complete code examples (copy-paste ready)
- Verification commands after each phase
- Implementation checklist for tracking
- Rollback plan if issues arise

#### Risk Assessment

**Overall Risk: LOW** ✅

Justification:
1. **Additive Changes Only:** No modifications to existing test files
2. **Non-Breaking:** Package-level configs remain functional independently
3. **Incremental Verification:** Each phase has verification steps
4. **Rollback Safety:** Existing configs continue working if root config fails
5. **Battle-Tested Pattern:** Vitest workspace is standard monorepo pattern

**Identified Risks & Mitigations:**

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Path alias resolution fails | Low | Medium | Phase 3.3 verification test, explicit aliases |
| Version conflicts | Low | Low | Root workspace control, version alignment |
| Test discovery issues | Low | Medium | Explicit workspace members, verification commands |
| CI integration problems | Low | Medium | .nvmrc locks Node version, frozen lockfile |

#### Observations & Recommendations

**Strengths (Keep These):**

1. ✅ **Exceptional Documentation:** The spec is tutorial-quality with clear rationale for every decision
2. ✅ **Phase-Based Implementation:** Reduces cognitive load and enables incremental verification
3. ✅ **Edge Case Anticipation:** Proactively addresses common issues before they occur
4. ✅ **Future-Proof Design:** Clear extension path for apps/api, apps/worker, apps/web

**Minor Enhancement Opportunity (Non-Blocking):**

**Suggestion:** Consider adding a root-level script for type-checking before tests:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "pretest": "tsc --noEmit"  // ← Ensure type safety before tests
  }
}
```

**Rationale:** Aligns with CONVENTIONS.md "Zero Tolerance for Type Errors" - catches TypeScript errors before running tests.

**Impact:** Low - This is a nice-to-have that enforces the existing convention. Not required for approval.

**Decision:** Optional enhancement, implementer may choose to include.

**Observation on Task Dependencies:**

The spec correctly identifies dependency on E01-T001 (pnpm workspace). Verify that the following are in place before implementation:
- ✅ `pnpm-workspace.yaml` exists (should list `packages/*`)
- ✅ Root `package.json` has workspace configuration
- ✅ Packages are linked via pnpm workspace protocol

**No blockers identified** - E01-T001 completion is sufficient.

### Compliance Checklist

- [x] Uses only approved technologies from ARCHITECTURE.md
- [x] Respects monorepo structure (no directory changes)
- [x] Follows CONVENTIONS.md patterns (naming, testing, TypeScript)
- [x] Adheres to architectural principles (explicit, composable, fail-fast)
- [x] Integrates cleanly with existing systems (db, core, telemetry)
- [x] Scalable and extensible (future apps planned)
- [x] Performance-conscious (parallel execution, optimized workflows)
- [x] Security-aware (dependency audit, test data guidelines)
- [x] Container-compatible (no host dependencies)
- [x] Comprehensive error handling
- [x] References canonical documentation
- [x] Low risk with clear rollback path

### Architectural Decision Records (ADRs) Implied

This specification makes several architectural decisions worth documenting:

1. **ADR: Explicit Workspace Members Over Glob Patterns**
   - **Decision:** Use explicit array of packages in `vitest.workspace.ts`
   - **Rationale:** Prevents silent failures when new packages are added
   - **Trade-off:** Requires manual updates, but ensures visibility

2. **ADR: Three-Tier Configuration Strategy**
   - **Decision:** Root config → Workspace → Package configs (extending root)
   - **Rationale:** DRY principle while allowing package-specific overrides
   - **Trade-off:** Slightly more complex but highly maintainable

3. **ADR: Dual Test Pattern Support**
   - **Decision:** Support both `*.test.ts` (inline) and `__tests__/**/*.ts` (directory)
   - **Rationale:** Flexibility for different organizational preferences
   - **Trade-off:** More patterns to remember, but common in community

These decisions align with existing architectural patterns and should be preserved in future changes.

### Final Verdict

**Status:** ✅ **APPROVED**

This specification demonstrates **exceptional architectural design**:

- **Perfect alignment** with canonical documentation (ARCHITECTURE.md, CONVENTIONS.md)
- **Strong adherence** to architectural principles (explicit, composable, fail-fast)
- **Excellent integration** with existing systems and future expansion plans
- **Comprehensive risk mitigation** with clear verification steps
- **Production-ready quality** with security, performance, and scalability considered

**No architectural concerns identified.** The specification is ready for implementation.

**Recommended Workflow State Transition:**
- Current: `ANALYZED` (after UX review)
- Next: `APPROVED` (after this architecture review)
- Following: Ready for `/implement` command

### Additional Notes for Implementation

1. **Preserve Existing Tests:** The spec correctly emphasizes not modifying existing test files in `packages/core` and `packages/db`. This is critical for risk mitigation.

2. **Verification Order:** Follow the phase-based approach exactly. Each phase's verification step catches issues early before proceeding.

3. **Path Alias Critical:** The Phase 3.3 cross-package import test is not optional. This verifies the most complex part of the configuration.

4. **Documentation Updates:** The spec mentions updating README.md "if exists". Since this is foundation infrastructure, creating a root README with testing instructions would be valuable but is not blocking.

5. **CI Integration:** While this task focuses on local configuration, the next logical task should configure GitHub Actions (or similar CI) to run `pnpm test:coverage` and enforce the 80% threshold.

---

**Architect Approval:** ✅ Proceed to implementation

**Next State:** `APPROVED`
