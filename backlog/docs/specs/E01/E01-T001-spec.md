# Implementation Spec: E01-T001

**Task:** Initialize pnpm monorepo
**Status:** Ready for Review
**Created:** 2026-01-11

## Overview

Set up the foundational pnpm workspace monorepo structure for Raptscallions. This includes configuring the workspace with apps/ and packages/ directories, establishing shared TypeScript configuration with strict mode, and creating placeholder packages with proper naming conventions. This task is the critical first step that unblocks all subsequent development tasks.

## Approach

1. **Workspace Configuration**: Use pnpm workspaces to manage the monorepo with globs for `apps/*` and `packages/*`
2. **TypeScript Setup**: Create a base `tsconfig.json` with strict mode and shared compiler options that all packages extend
3. **Package Structure**: Initialize each package with minimal `package.json` and `tsconfig.json` that extends the base config
4. **Node Version**: Lock to Node.js 20 LTS for consistency across development environments
5. **Preserve Existing**: The current workflow-related package.json content will be merged into the new root package.json

## Files to Create

| File | Purpose |
| ---- | ------- |
| `pnpm-workspace.yaml` | Define workspace globs for apps/* and packages/* |
| `tsconfig.json` | Base TypeScript configuration with strict mode |
| `.nvmrc` | Specify Node.js 20 LTS version |
| `.gitignore` | Ignore node_modules, dist, .env, and other build artifacts |
| `apps/.gitkeep` | Placeholder to ensure apps/ directory is tracked |
| `packages/core/package.json` | Package manifest for @raptscallions/core |
| `packages/core/tsconfig.json` | TypeScript config extending base |
| `packages/core/src/index.ts` | Entry point placeholder |
| `packages/db/package.json` | Package manifest for @raptscallions/db |
| `packages/db/tsconfig.json` | TypeScript config extending base |
| `packages/db/src/index.ts` | Entry point placeholder |
| `packages/telemetry/package.json` | Package manifest for @raptscallions/telemetry |
| `packages/telemetry/tsconfig.json` | TypeScript config extending base |
| `packages/telemetry/src/index.ts` | Entry point placeholder |
| `packages/modules/package.json` | Package manifest for @raptscallions/modules |
| `packages/modules/tsconfig.json` | TypeScript config extending base |
| `packages/modules/src/index.ts` | Entry point placeholder |

## Files to Modify

| File | Changes |
| ---- | ------- |
| `package.json` | Update name to `@raptscallions/root`, add workspace scripts (`dev`, `build`, `test`, `lint`, `clean`), merge existing workflow scripts, add pnpm engine requirement |

## Dependencies

- Required tools:
  - pnpm 8.x (must be installed globally or via corepack)
  - Node.js 20 LTS
- Required packages (root devDependencies):
  - `typescript` ^5.3.0 (already present)
  - `@types/node` ^20.x (already present)
- New packages: None required for this task

## Implementation Steps

1. **Create `.nvmrc`**
   ```
   20
   ```

2. **Create `pnpm-workspace.yaml`**
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **Update root `package.json`**
   - Change `name` from `@raptscallions/workflow` to `@raptscallions/root`
   - Add `engines` field requiring Node.js 20.x and pnpm 8.x
   - Add workspace management scripts:
     - `dev`: Run all apps in development mode
     - `build`: Build all packages and apps
     - `test`: Run tests across workspace
     - `lint`: Run linting across workspace
     - `clean`: Remove node_modules and dist from all packages
   - Keep existing workflow scripts

4. **Create `tsconfig.json` (base config)**
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "lib": ["ES2022"],
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "exactOptionalPropertyTypes": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "composite": true,
       "baseUrl": ".",
       "paths": {
         "@raptscallions/*": ["packages/*/src"]
       }
     },
     "exclude": ["node_modules", "dist"]
   }
   ```

5. **Create `.gitignore`**
   ```
   # Dependencies
   node_modules/
   .pnpm-store/

   # Build outputs
   dist/
   *.tsbuildinfo

   # Environment
   .env
   .env.local
   .env.*.local

   # IDE
   .idea/
   .vscode/
   *.swp
   *.swo

   # OS
   .DS_Store
   Thumbs.db

   # Logs
   logs/
   *.log
   npm-debug.log*
   pnpm-debug.log*

   # Test coverage
   coverage/

   # Misc
   .turbo/
   ```

6. **Create `apps/.gitkeep`**
   - Empty file to track the apps directory

7. **Create package structure for each package** (`core`, `db`, `telemetry`, `modules`)

   Each package follows the same pattern:

   **package.json** (example for core):
   ```json
   {
     "name": "@raptscallions/core",
     "version": "0.0.1",
     "private": true,
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.js"
       }
     },
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "clean": "rm -rf dist *.tsbuildinfo"
     }
   }
   ```

   **tsconfig.json** (example for core):
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "rootDir": "./src",
       "outDir": "./dist"
     },
     "include": ["src/**/*"]
   }
   ```

   **src/index.ts**:
   ```typescript
   // @raptscallions/core - Shared types and schemas
   export {};
   ```

8. **Run `pnpm install`** to validate the workspace configuration

## Test Strategy

### Unit Tests

- Not applicable for this infrastructure task (no business logic)

### Integration Tests

- Not applicable for this infrastructure task

### Validation Tests

1. **Workspace Resolution Test**
   - Run `pnpm install` from root - should complete without errors
   - Run `pnpm ls -r` - should list all 4 packages

2. **TypeScript Compilation Test**
   - Run `pnpm -r build` - should compile all packages without errors
   - Each package should produce `dist/index.js` and `dist/index.d.ts`

3. **Package Linking Test**
   - In a package, import from another package (e.g., `import {} from '@raptscallions/core'`)
   - TypeScript should resolve the path alias correctly

## Acceptance Criteria Verification

| AC | How to Verify |
| -- | ------------- |
| AC1: pnpm-workspace.yaml configured | File exists at root with `apps/*` and `packages/*` globs |
| AC2: Root package.json with name and scripts | Check `name` is `@raptscallions/root`, verify `dev`, `build`, `test`, `lint`, `clean` scripts exist |
| AC3: Base tsconfig.json with strict mode | Verify `strict: true`, `target: ES2022`, path aliases configured |
| AC4: apps/ directory created | Directory exists (can be empty with .gitkeep) |
| AC5: packages/ directory with subdirs | Verify `packages/core`, `packages/db`, `packages/telemetry`, `packages/modules` exist |
| AC6: Each package has package.json | All 4 packages have `package.json` with `@raptscallions/*` naming |
| AC7: Each package has tsconfig.json | All 4 packages have `tsconfig.json` extending `../../tsconfig.json` |
| AC8: `pnpm install` runs without errors | Execute command and verify exit code 0 |
| AC9: .gitignore includes required entries | File contains `node_modules`, `dist`, `.env`, etc. |
| AC10: Node version specified | `.nvmrc` exists with `20` |

## Risks and Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| pnpm not installed globally | Document requirement in README; consider adding installation check script |
| Existing package.json conflicts | Carefully merge existing workflow scripts into new structure |
| Path aliases not resolving in IDE | Include VSCode workspace settings recommendation in follow-up task |
| Different pnpm versions causing lockfile issues | Specify exact pnpm version in `packageManager` field and `engines` |

## Open Questions

- [x] Should modules/ (user-installed modules) directory be created in this task? **Decision: No, modules/ is for user-installed content and should be created by a separate task or at runtime**
- [ ] Should we add a `packageManager` field to enforce pnpm version via corepack? (Recommended: yes, use `"packageManager": "pnpm@8.15.0"`)
- [ ] Should we add `.editorconfig` for cross-IDE consistency? (Can be deferred to a separate task)

## Notes

- The existing `package.json` has workflow-related dependencies (`yaml`, `tsx`) and scripts that must be preserved
- The `scripts/` directory contains orchestrator code that should not be modified by this task
- This task focuses on monorepo structure only; actual package code is handled in subsequent tasks

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED

### Checklist

- [x] Follows monorepo structure - apps/ and packages/ directories match ARCHITECTURE.md
- [x] Uses correct technology stack - pnpm workspaces, TypeScript 5.3+ strict mode, Node.js 20 LTS
- [x] Naming conventions correct - @raptscallions/* package naming
- [x] No security concerns - .gitignore properly excludes .env files
- [x] No performance concerns - Standard monorepo setup
- [x] Dependencies appropriate - No task dependencies (E01-T001 is the root task)
- [x] Test strategy adequate - Validation tests cover workspace resolution, TS compilation, and package linking
- [x] Implementation steps complete - All files and configuration details are specified

### Required Changes

None. The spec is ready for implementation.

### Recommendations

1. **Resolve the `packageManager` open question**: Add `"packageManager": "pnpm@9.15.0"` to enforce consistent pnpm versions via corepack.

2. **Path aliases refinement**: The base tsconfig.json uses `"@raptscallions/*": ["packages/*/src"]` for path resolution. Consumers in apps/ will reference packages via their package.json names for proper resolution after build.

3. **Consider adding `.npmrc`**: Adding a `.npmrc` with `strict-peer-dependencies=true` and `auto-install-peers=true` can prevent dependency issues later.

4. **ESLint/Prettier note**: The dependencies.yaml mentions ESLint and Prettier in acceptance criteria, but the task file AC list does not include them. Linting setup appears intentionally deferred for scope management.
