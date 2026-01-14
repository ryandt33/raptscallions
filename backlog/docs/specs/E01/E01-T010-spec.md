# Implementation Spec: E01-T010

## Overview

Configure ESLint with flat config format for the entire RaptScallions monorepo to enforce TypeScript code quality, prevent `any` type usage, and ensure consistent code style across all packages and apps. The implementation will use modern ESLint 9.x flat config (`eslint.config.js`) with TypeScript ESLint v8, install minimal required dependencies at root level, add lint scripts to all 6 packages and 2 apps, and integrate with existing TypeScript strict mode configuration.

## Approach

### Technical Strategy

**Flat Config Architecture:**

Modern ESLint (9.x+) uses a flat config system (`eslint.config.js`) instead of legacy `.eslintrc` files. This provides better TypeScript support, simpler configuration composition, and faster resolution.

**Root-Level Configuration:**

All ESLint rules and plugins will be defined at the monorepo root with a single `eslint.config.js` file. Each package will run ESLint against its own `src/` directory using workspace scripts (`pnpm -r lint`).

**TypeScript-First Ruleset:**

The configuration will enforce:
- Zero `any` types (critical project requirement)
- Explicit return types on exported functions
- Unused variable detection
- Consistent import ordering
- TypeScript-specific best practices from `@typescript-eslint/recommended` and `@typescript-eslint/strict`

**Monorepo-Aware Linting:**

Each package/app will have its own `lint` and `lint:fix` scripts that:
- Target only its `src/` directory
- Use TypeScript parser with type-aware linting
- Respect package-specific `tsconfig.json` for type checking
- Report errors with clear, actionable messages

**VS Code Integration:**

A `.vscode/settings.json` file will enable auto-fix on save and ensure the ESLint extension works correctly with the flat config format.

### Design Decisions

**Why Flat Config:**
- Required for ESLint 9.x (legacy config deprecated)
- Better TypeScript integration
- Simpler configuration merging
- Improved performance

**Why Root-Level Rules:**
- Single source of truth for all lint rules
- Consistent code style across packages
- Easier maintenance (one config file vs. 8)
- DRY principle

**Why TypeScript ESLint v8:**
- Full support for TypeScript 5.3+
- Type-aware linting rules
- Better performance than v7
- Active maintenance

**Why No Legacy `.eslintrc`:**
- Deprecated in ESLint 9.x
- Flat config is the future
- Simpler configuration object

## Files to Create

| File | Purpose |
|------|---------|
| `eslint.config.js` | Root ESLint flat config with TypeScript rules |
| `.vscode/settings.json` | VS Code ESLint extension configuration |
| `.eslintignore` | Global ignore patterns (optional, can use `ignores` in config) |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` (root) | Add ESLint dependencies, add `lint:fix` script |
| `packages/core/package.json` | Add `lint` and `lint:fix` scripts |
| `packages/db/package.json` | Add `lint` and `lint:fix` scripts |
| `packages/auth/package.json` | Add `lint` and `lint:fix` scripts |
| `packages/modules/package.json` | Add `lint` and `lint:fix` scripts |
| `packages/telemetry/package.json` | Add `lint` and `lint:fix` scripts |
| `packages/ai/package.json` | Add `lint` and `lint:fix` scripts |
| `apps/api/package.json` | Replace placeholder lint script with real ESLint command |
| `apps/docs/package.json` | Add `lint` and `lint:fix` scripts |
| `docs/CONVENTIONS.md` | Add ESLint section with rules documentation |

## Dependencies

### Requires

- **E01-T001**: Monorepo must be initialized with pnpm workspace
- **E01-T008**: Vitest configuration complete (ensures test infrastructure doesn't conflict)

### New Packages

All installed as dev dependencies at root (`pnpm add -Dw`):

```json
{
  "eslint": "^9.17.0",
  "typescript-eslint": "^8.19.1",
  "eslint-plugin-import": "^2.31.0",
  "eslint-import-resolver-typescript": "^3.7.0"
}
```

**Version Rationale:**
- `eslint@9.x` - Latest major version with flat config support
- `typescript-eslint@8.x` - Latest with TypeScript 5.3+ support and type-aware rules
- `eslint-plugin-import` - Import/export ordering and validation
- `eslint-import-resolver-typescript` - Resolves TypeScript path aliases

## Implementation Details

### ESLint Configuration (`eslint.config.js`)

```javascript
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
          fixable: 'code',
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

  // Test files: relax some rules
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Mocks may use any
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
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
```

### Package Script Format

**Standard format for all packages:**

```json
{
  "scripts": {
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix"
  }
}
```

**Note:**
- `--max-warnings 0` treats warnings as errors (fail CI on warnings)
- `src` targets the source directory (standard across all packages)
- No need for `--ext .ts,.tsx` flag in flat config (auto-detected)

**Apps with TypeScript and Vue files (docs):**

```json
{
  "scripts": {
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix"
  }
}
```

### Root Package Modifications

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "lint:fix": "pnpm -r lint:fix"
  }
}
```

**Current root `lint` script is already correct** - just needs package lint scripts to exist.

### VS Code Configuration

**Create `.vscode/settings.json`:**

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ],
  "eslint.useFlatConfig": true,
  "eslint.experimental.useFlatConfig": true,
  "editor.formatOnSave": false,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**Why these settings:**
- `source.fixAll.eslint: explicit` - Auto-fix on save (VS Code 1.85+)
- `eslint.useFlatConfig: true` - Use flat config (required for ESLint 9)
- `formatOnSave: false` - Prevent conflicts with Prettier (if added later)
- `typescript.tsdk` - Use workspace TypeScript version

## Test Strategy

### Unit Tests

**Not applicable** - ESLint configuration doesn't require unit tests. Validation is done by running linter on actual code.

### Integration Tests

**Manual validation:**

1. **Lint Clean Code:**
   - Run `pnpm lint` from root
   - Should exit with status 0 (no errors)
   - Should complete in under 30 seconds

2. **Detect Violations:**
   - Add test file with `any` type
   - Run `pnpm lint`
   - Should fail with clear error message pointing to line

3. **Auto-Fix:**
   - Add test file with fixable issues (missing const, wrong import order)
   - Run `pnpm lint:fix`
   - File should be automatically corrected

4. **VS Code Integration:**
   - Open TypeScript file with violations
   - Should see red squiggles in editor
   - Save file should auto-fix issues

5. **CI Check:**
   - Run `pnpm ci:check`
   - Should execute: typecheck → lint → test → build
   - All steps should pass

## Acceptance Criteria Breakdown

### Configuration (AC1-AC6)

**AC1: ESLint configuration file created at root (`eslint.config.js` using flat config)**

- Create `eslint.config.js` at monorepo root
- Use `typescript-eslint.config()` helper for type-safe config
- Export default config array
- Validate: `eslint --print-config src/index.ts` should show config

**AC2: TypeScript ESLint plugin configured for all `.ts` and `.tsx` files**

- Install `typescript-eslint@8.x`
- Configure `tseslint.parser` with `project: true`
- Apply to `files: ['**/*.ts', '**/*.tsx']`
- Validate: Lint TypeScript file and check for TS-specific rules

**AC3: Recommended ESLint rules enabled with TypeScript-specific rules**

- Apply `tseslint.configs.recommended.rules`
- Apply `tseslint.configs.strict.rules`
- Add custom rules for `any` ban and explicit types
- Validate: Check config output includes expected rules

**AC4: Import sorting and ordering rules configured**

- Install `eslint-plugin-import`
- Configure `import/order` with groups and alphabetize
- Configure `import/no-duplicates`
- Validate: Create file with wrong import order, run `lint:fix`, verify reordering

**AC5: Configuration extends appropriate presets for Node.js and TypeScript**

- Use `tseslint.configs.recommended` and `strict`
- No additional presets needed (project is Node.js only currently)
- React presets will be added when `apps/web` is created
- Validate: Rules list includes TypeScript-specific rules

**AC6: Monorepo-aware import resolution configured**

- Configure `eslint-import-resolver-typescript`
- Set `project` array to include all package tsconfigs
- Enable `alwaysTryTypes: true`
- Validate: Import from `@raptscallions/core` should resolve correctly

### Package Scripts (AC7-AC9)

**AC7: All packages in `packages/` have `lint` script: `"lint": "eslint src --max-warnings 0"`**

- Add to 6 packages: core, db, auth, modules, telemetry, ai
- Use exact format specified
- Validate: `pnpm --filter @raptscallions/core lint` runs ESLint

**AC8: All packages have `lint:fix` script: `"lint:fix": "eslint src --fix"`**

- Add to same 6 packages
- Use exact format specified
- Validate: `pnpm --filter @raptscallions/core lint:fix` auto-fixes

**AC9: Root `package.json` has `lint:fix` script: `"lint:fix": "pnpm -r lint:fix"`**

- Add to root package.json scripts
- Root already has `"lint": "pnpm -r lint"` - verify it still works
- Validate: `pnpm lint:fix` from root runs on all packages

### Developer Experience (AC10-AC13)

**AC10: Running `pnpm lint` from root successfully lints all packages**

- Execute `pnpm lint` from root
- Should run lint on all 6 packages + 2 apps
- Should report results from each package
- Should exit with status 0 if no errors
- Validate: Check stdout shows package names and success

**AC11: Running `pnpm lint:fix` from root auto-fixes issues in all packages**

- Add fixable violations to multiple packages
- Execute `pnpm lint:fix` from root
- Files should be modified with fixes
- Subsequent `pnpm lint` should pass
- Validate: Git diff shows fixed files

**AC12: ESLint errors fail with clear, actionable messages**

- Add violation: `const x: any = 5;`
- Run `pnpm lint`
- Error message should show:
  - File path and line number
  - Rule name (`@typescript-eslint/no-explicit-any`)
  - Clear explanation
  - Suggested fix if available
- Validate: Error message is understandable to developers

**AC13: VS Code ESLint extension works correctly with configuration**

- Install "ESLint" extension (dbaeumer.vscode-eslint)
- Open TypeScript file
- Add violation
- Should see red squiggle immediately
- Hover should show error message
- Save file should auto-fix (if configured in settings.json)
- Validate: Manual testing in VS Code

### Dependencies (AC14-AC16)

**AC14: ESLint and required plugins added as dev dependencies at root**

- Add 4 packages: eslint, typescript-eslint, eslint-plugin-import, resolver
- All at root level: `pnpm add -Dw <packages>`
- Validate: Check root `package.json` devDependencies

**AC15: TypeScript ESLint parser and plugin configured**

- `typescript-eslint@8.x` includes both parser and plugin
- Configure in `languageOptions` and `plugins`
- Enable type-aware linting with `project: true`
- Validate: Type-aware rules work (e.g., no-floating-promises)

**AC16: No unnecessary or conflicting plugins installed**

- Only install 4 packages (see AC14)
- No `@typescript-eslint/parser` or `@typescript-eslint/eslint-plugin` separately (included in typescript-eslint)
- No Prettier plugins (not in scope)
- Validate: Review dependencies list for unexpected packages

### Validation (AC17-AC19)

**AC17: Existing codebase passes linting (or all violations documented/fixed)**

- Run `pnpm lint` on current codebase
- Document all violations in spec (see "Current Violations" section below)
- Fix all violations OR add exemptions if necessary
- Validate: `pnpm lint` exits with status 0

**AC18: Linting runs in under 30 seconds for full monorepo**

- Run `time pnpm lint` from root
- Should complete in < 30 seconds
- Performance tuning if needed:
  - Enable caching: `--cache` flag
  - Reduce type-aware rules if too slow
  - Parallelize with pnpm workspace
- Validate: Check execution time

**AC19: Configuration doesn't conflict with TypeScript compiler**

- Run `pnpm typecheck` - should pass
- Run `pnpm lint` - should pass
- No duplicate errors between tsc and ESLint
- Rules complement TypeScript, don't duplicate
- Validate: Compare error output from both tools

## Edge Cases

### 1. Config Files (`*.config.js`, `*.config.ts`)

**Issue:** Config files often use dynamic imports, require, and don't need strict typing.

**Solution:** Separate config override in `eslint.config.js`:

```javascript
{
  files: ['**/*.config.ts', '**/*.config.js'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': 'off',
  }
}
```

### 2. Test Files

**Issue:** Tests use mocks with `any` types, console.log for debugging.

**Solution:** Separate test override:

```javascript
{
  files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    'no-console': 'off',
  }
}
```

### 3. Migration Files (SQL)

**Issue:** SQL files in `packages/db/src/migrations/` shouldn't be linted.

**Solution:** SQL files have `.sql` extension, won't match `**/*.ts` pattern. No action needed.

### 4. Generated Files

**Issue:** Drizzle generates `.d.ts` files, shouldn't be linted.

**Solution:** Add to ignores:

```javascript
{
  ignores: ['**/*.d.ts']
}
```

### 5. VitePress Vue Components

**Issue:** `apps/docs` uses Vue components in `.vitepress/theme/`.

**Solution:** Current spec only lints TypeScript files. Vue linting will be added when needed. For now, only `.ts` files in docs are linted.

### 6. Existing Violations

**Issue:** Current codebase may have violations that need fixing.

**Solution:** Run lint, document all violations, fix them in implementation phase. Common violations to expect:

- Missing explicit return types
- Implicit `any` from untyped function params
- Import ordering issues
- Unused variables (prefixed with `_`)

### 7. Performance with Type-Aware Rules

**Issue:** Type-aware linting (`project: true`) can be slow on large codebases.

**Solution:** Monitor performance:
- Target: < 30 seconds for full monorepo
- If slower: Enable `--cache` flag in scripts
- If still slow: Reduce type-aware rules to critical only
- Parallelize: pnpm already runs package lints in parallel

### 8. Path Alias Resolution

**Issue:** TypeScript path aliases (`@raptscallions/*`) may not resolve in ESLint.

**Solution:** Configure import resolver with all package tsconfigs:

```javascript
settings: {
  'import/resolver': {
    typescript: {
      project: [
        'tsconfig.json',
        'packages/*/tsconfig.json',
        'apps/*/tsconfig.json',
      ],
    },
  },
}
```

### 9. CI/CD Integration

**Issue:** Lint failures should fail CI builds.

**Solution:** Root `ci:check` script already includes `pnpm lint`:

```json
"ci:check": "pnpm typecheck && pnpm lint && pnpm test && pnpm build"
```

No changes needed. Lint errors will fail CI.

### 10. Pre-Commit Hooks

**Issue:** Developers may want to run lint before committing.

**Solution:** Out of scope for this task. Pre-commit hooks will be configured in a future task. For now, developers can manually run `pnpm lint` or `pnpm lint:fix`.

## Open Questions

None - all requirements are clear from task description and existing conventions.

## Documentation Updates

### `docs/CONVENTIONS.md` - Add ESLint Section

Add new section after "Testing" section:

```markdown
## ESLint

### Configuration

The project uses ESLint 9.x with flat config format (`eslint.config.js`) for TypeScript linting.

**Key Features:**
- Zero `any` types allowed (enforced by rules)
- Explicit return types required on exported functions
- Import ordering and deduplication
- Type-aware linting for async code and promises
- Auto-fix support for most violations

### Running ESLint

```bash
# Lint all packages
pnpm lint

# Auto-fix all packages
pnpm lint:fix

# Lint single package
pnpm --filter @raptscallions/core lint

# Lint with performance timing
time pnpm lint
```

### Common Rules

**Critical Rules (Zero Tolerance):**

- `@typescript-eslint/no-explicit-any` - BANNED, use `unknown`
- `@typescript-eslint/no-unsafe-*` - All unsafe operations banned
- `@typescript-eslint/explicit-module-boundary-types` - Return types required
- `@typescript-eslint/no-floating-promises` - Must await or handle promises

**Code Quality Rules:**

- `prefer-const` - Use const when variable isn't reassigned
- `no-var` - Use let/const, not var
- `import/order` - Imports must be ordered by group
- `import/no-duplicates` - No duplicate import statements
- `@typescript-eslint/consistent-type-imports` - Use `import type` for types
- `eqeqeq` - Use `===` and `!==`, not `==` and `!=`

### Common Violations and Fixes

**Violation: Using `any` type**

```typescript
// ❌ BAD
function process(data: any) {
  return data.value;
}

// ✅ GOOD - use unknown and type guard
function process(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

// ✅ GOOD - use Zod for runtime validation
const schema = z.object({ value: z.string() });
function process(data: unknown) {
  const parsed = schema.parse(data);
  return parsed.value;
}
```

**Violation: Missing return type**

```typescript
// ❌ BAD
export function getUser(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

// ✅ GOOD
export function getUser(id: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

**Violation: Wrong import order**

```typescript
// ❌ BAD
import { db } from '@raptscallions/db';
import type { User } from '@raptscallions/core';
import { eq } from 'drizzle-orm';

// ✅ GOOD (auto-fixed by ESLint)
import { eq } from 'drizzle-orm';

import { db } from '@raptscallions/db';

import type { User } from '@raptscallions/core';
```

**Violation: Unused variable**

```typescript
// ❌ BAD
function process(data: string, config: Config) {
  return data.toUpperCase(); // config unused
}

// ✅ GOOD - prefix with underscore
function process(data: string, _config: Config) {
  return data.toUpperCase();
}

// ✅ BETTER - remove if truly unused
function process(data: string) {
  return data.toUpperCase();
}
```

### VS Code Integration

**Install ESLint Extension:**

Install the official ESLint extension: `dbaeumer.vscode-eslint`

**Project Settings:**

The `.vscode/settings.json` file is configured to:
- Auto-fix ESLint issues on save
- Use flat config format
- Validate TypeScript and Vue files

**Restarting ESLint Server:**

If ESLint doesn't work after configuration changes:
1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Run "ESLint: Restart ESLint Server"

### Disabling Rules

**In rare cases, you may need to disable a rule:**

```typescript
// Disable for single line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = JSON.parse(input);

// Disable for file (use sparingly)
/* eslint-disable @typescript-eslint/no-explicit-any */

// Better: Fix the code instead of disabling the rule
```

**Rule disabling requires justification in code review.**

### Performance

**Target:** Linting the entire monorepo should complete in under 30 seconds.

**If linting is slow:**
- Check that `dist/` and `node_modules/` are ignored
- Ensure type-aware linting isn't running on test fixtures
- Consider enabling `--cache` flag if needed

### Continuous Integration

ESLint runs automatically in CI via the `ci:check` script:

```bash
pnpm ci:check  # typecheck → lint → test → build
```

**CI will fail if:**
- ESLint errors are present
- ESLint warnings are present (`--max-warnings 0`)
- Linting takes longer than CI timeout
```

## Implementation Checklist

### Phase 1: Install Dependencies (15 minutes)

- [ ] Install ESLint at root: `pnpm add -Dw eslint@^9.17.0`
- [ ] Install TypeScript ESLint: `pnpm add -Dw typescript-eslint@^8.19.1`
- [ ] Install import plugin: `pnpm add -Dw eslint-plugin-import@^2.31.0`
- [ ] Install import resolver: `pnpm add -Dw eslint-import-resolver-typescript@^3.7.0`
- [ ] Verify installations: `pnpm eslint --version` (should show 9.x)
- [ ] Verify: `pnpm list | grep eslint` shows all 4 packages

### Phase 2: Create Configuration (30 minutes)

- [ ] Create `eslint.config.js` at root with flat config format
- [ ] Configure TypeScript parser with `project: true`
- [ ] Add TypeScript recommended and strict rules
- [ ] Add critical `any` ban rules
- [ ] Add explicit return type rules
- [ ] Add import ordering rules
- [ ] Add global ignores (dist, node_modules, etc.)
- [ ] Add test file overrides (relax `any` ban)
- [ ] Add config file overrides (relax boundary types)
- [ ] Configure import resolver with all tsconfig paths
- [ ] Test config: `pnpm eslint --print-config packages/core/src/index.ts`
- [ ] Verify config loads without errors

### Phase 3: Add Package Scripts (20 minutes)

- [ ] Add `lint` script to `packages/core/package.json`
- [ ] Add `lint:fix` script to `packages/core/package.json`
- [ ] Add scripts to `packages/db/package.json`
- [ ] Add scripts to `packages/auth/package.json`
- [ ] Add scripts to `packages/modules/package.json`
- [ ] Add scripts to `packages/telemetry/package.json`
- [ ] Add scripts to `packages/ai/package.json`
- [ ] Replace placeholder lint in `apps/api/package.json`
- [ ] Add scripts to `apps/docs/package.json`
- [ ] Add `lint:fix` to root `package.json` scripts
- [ ] Verify root `lint` script still present
- [ ] Test: `pnpm --filter @raptscallions/core lint` runs
- [ ] Test: `pnpm lint` from root runs on all packages

### Phase 4: VS Code Integration (10 minutes)

- [ ] Create `.vscode/` directory at root
- [ ] Create `.vscode/settings.json` with ESLint config
- [ ] Set `eslint.useFlatConfig: true`
- [ ] Set `editor.codeActionsOnSave.source.fixAll.eslint: explicit`
- [ ] Add TypeScript workspace SDK setting
- [ ] Test in VS Code: Open TypeScript file
- [ ] Test: Add violation and check for red squiggle
- [ ] Test: Save file and verify auto-fix works

### Phase 5: Fix Existing Violations (60-120 minutes)

- [ ] Run `pnpm lint` and capture all errors
- [ ] Run `pnpm lint:fix` to auto-fix what's possible
- [ ] Document remaining violations by category
- [ ] Fix `any` type violations (use `unknown` or Zod)
- [ ] Fix missing return types on exported functions
- [ ] Fix import ordering issues (should be auto-fixed)
- [ ] Fix unused variable violations (prefix with `_` or remove)
- [ ] Fix unsafe operations on `unknown` types
- [ ] Run `pnpm lint` again - should exit with status 0
- [ ] Commit fixes: `fix(lint): resolve ESLint violations across codebase`

### Phase 6: Performance Validation (10 minutes)

- [ ] Run `time pnpm lint` from root
- [ ] Record execution time (target: < 30 seconds)
- [ ] If > 30 seconds: Add `--cache` flag to scripts
- [ ] If still > 30 seconds: Profile which package is slow
- [ ] Re-run and verify performance acceptable
- [ ] Document final execution time in commit message

### Phase 7: Documentation (30 minutes)

- [ ] Add ESLint section to `docs/CONVENTIONS.md`
- [ ] Document common rules and their purpose
- [ ] Add examples of violations and fixes
- [ ] Document VS Code integration steps
- [ ] Add troubleshooting section
- [ ] Add performance notes
- [ ] Document how to disable rules (rare cases)
- [ ] Add link to ESLint docs for reference
- [ ] Commit: `docs(conventions): add ESLint configuration guide`

### Phase 8: Integration Testing (20 minutes)

- [ ] Test `pnpm lint` from root - should pass
- [ ] Test `pnpm lint:fix` from root - should work
- [ ] Test `pnpm ci:check` - should pass (typecheck → lint → test → build)
- [ ] Test in VS Code: Add violation, verify squiggle appears
- [ ] Test in VS Code: Save file, verify auto-fix works
- [ ] Add intentional violation, verify lint fails
- [ ] Run `pnpm typecheck` - should pass (no conflicts)
- [ ] Run `pnpm test` - should pass
- [ ] Run `pnpm build` - should pass
- [ ] Verify no duplicate errors between tsc and ESLint
- [ ] Time full CI check: `time pnpm ci:check`

### Phase 9: Final Validation (10 minutes)

- [ ] Review all acceptance criteria (AC1-AC19)
- [ ] Verify all 19 ACs are met
- [ ] Test edge cases (config files, tests, generated files)
- [ ] Verify no warnings or errors in console
- [ ] Check git status for unintended changes
- [ ] Review all modified files for correctness
- [ ] Ensure no leftover debug code
- [ ] Verify commit messages follow conventions
- [ ] Tag task as ready for review

## Success Criteria

### Technical Success

- ✅ `pnpm lint` runs successfully on entire monorepo
- ✅ `pnpm lint` exits with status 0 (no errors or warnings)
- ✅ `pnpm lint:fix` auto-fixes violations across all packages
- ✅ `pnpm ci:check` passes completely (typecheck → lint → test → build)
- ✅ Linting completes in < 30 seconds
- ✅ Zero TypeScript `any` types in codebase (enforced by rules)
- ✅ All exported functions have explicit return types

### Developer Experience Success

- ✅ Clear, actionable error messages for violations
- ✅ VS Code shows linting errors inline with red squiggles
- ✅ Auto-fix works reliably on save (via VS Code settings)
- ✅ Configuration doesn't slow down development
- ✅ Import ordering happens automatically on fix
- ✅ Developers understand how to fix violations (documented in CONVENTIONS.md)

### Code Quality Success

- ✅ No `any` types in codebase (critical requirement met)
- ✅ Consistent import ordering across all packages
- ✅ Unused variables detected and removed/prefixed
- ✅ TypeScript-specific issues caught by ESLint
- ✅ No conflicts between TypeScript compiler and ESLint
- ✅ Test files allow necessary flexibility (mocks with `any`)

### Integration Success

- ✅ CI/CD pipeline includes linting and fails on violations
- ✅ Pre-commit expectations clear (developers know to run lint)
- ✅ Documentation complete and helpful
- ✅ VS Code extension works out of the box
- ✅ New developers can set up linting in < 5 minutes

## Current Violations Analysis

**Expected violations to fix during implementation:**

Based on codebase analysis, expect to find:

1. **Missing Return Types:**
   - Exported functions without explicit return types
   - Async functions with implicit Promise return
   - Arrow functions assigned to exports

2. **Import Ordering:**
   - Mixed import statement order
   - Type imports not separated
   - Missing blank lines between import groups

3. **Unused Variables:**
   - Function parameters not used (should prefix with `_`)
   - Imported types/functions not used
   - Variables declared but not referenced

4. **Unsafe Any Operations:**
   - Implicit `any` from untyped function parameters
   - JSON.parse return type (returns `any` by default)
   - Third-party library types that return `any`

5. **Console Statements:**
   - `console.log` in production code (should use logger)
   - Debug statements left in code

**Strategy:**
- Run `pnpm lint:fix` first to auto-fix import ordering, const conversion
- Manually fix `any` types and missing return types
- Prefix unused variables with `_` or remove if truly unnecessary
- Replace console statements with structured logger

## Notes

**TypeScript ESLint v8 vs v7:**
- v8 is the latest and supports TypeScript 5.3+
- v8 has better performance for type-aware rules
- v8 uses flat config natively (no conversion needed)

**Why Not Prettier:**
- Prettier is intentionally excluded from this task
- ESLint handles code quality, Prettier handles formatting
- Prettier integration will be a separate task if needed
- Current task focuses on quality rules only

**Why Not React Rules:**
- `apps/web` doesn't exist yet (frontend not implemented)
- React ESLint rules will be added when web app is created
- Current config only handles Node.js TypeScript code

**Why `--max-warnings 0`:**
- Treats warnings as errors in CI
- Prevents warning debt from accumulating
- Encourages fixing issues immediately
- Can be removed if too strict, but recommended

**Caching:**
- ESLint caching not enabled by default
- If performance is an issue, add `--cache` to scripts
- Cache directory: `node_modules/.cache/eslint`
- Add to .gitignore if caching enabled

## Related Documentation

- `docs/CONVENTIONS.md` - Code style guide (will be updated with ESLint section)
- `.claude/rules/github.md` - CI/CD requirements mention linting
- Root `package.json` - Contains `lint` and `ci:check` scripts
- ESLint Flat Config Docs: https://eslint.org/docs/latest/use/configure/configuration-files
- TypeScript ESLint v8 Docs: https://typescript-eslint.io/

## Definition of Done

- [ ] All 19 acceptance criteria met
- [ ] ESLint configuration file created and working
- [ ] All 6 packages and 2 apps have lint scripts
- [ ] Root lint scripts run on all packages
- [ ] VS Code integration working
- [ ] All existing violations fixed
- [ ] Performance under 30 seconds
- [ ] Documentation updated
- [ ] All tests pass
- [ ] CI check passes
- [ ] Code reviewed and approved
- [ ] Merged to main branch
