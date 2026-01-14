# Implementation Spec: E06-T001 - VitePress Setup and Configuration

## Overview

Set up VitePress as a new monorepo workspace app at `apps/docs/` to provide a browsable, searchable documentation site for the RaptScallions knowledge base. This foundation task establishes the build infrastructure, local development workflow, and search capabilities that subsequent KB documentation tasks will build upon.

## Approach

VitePress will be integrated as a standard monorepo workspace app following the same patterns as `apps/api` and `apps/web`. The setup will:

1. Create a new workspace package at `apps/docs/` with isolated dependencies
2. Configure VitePress with TypeScript support and minimal customization
3. Enable built-in local search (no external services like Algolia)
4. Integrate with existing pnpm workspace and TypeScript project references
5. Add convenience scripts at root level for docs development
6. Create a minimal homepage to verify the setup

**Key Design Decisions:**

- **Location**: `apps/docs/` (not root `docs/`) for isolation and consistency
- **Search**: VitePress built-in local search (fast, zero config, no external dependencies)
- **Theme**: Default VitePress theme with dark/light toggle (no custom theme development in this task)
- **Source Directory**: `apps/docs/src/` for markdown files (VitePress convention with `srcDir` config)
- **Build Output**: `apps/docs/.vitepress/dist/` (VitePress default, will be gitignored)

## Files to Create

| File                             | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `apps/docs/package.json`         | Package manifest with VitePress dependencies and scripts |
| `apps/docs/tsconfig.json`        | TypeScript configuration extending root config           |
| `apps/docs/.vitepress/config.ts` | VitePress configuration (site metadata, search, nav)     |
| `apps/docs/src/index.md`         | KB homepage with welcome content and navigation overview |
| `apps/docs/.gitignore`           | Ignore VitePress build outputs and cache                 |

## Files to Modify

| File                  | Changes                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Already includes `apps/*` pattern (no change needed)             |
| `tsconfig.json`       | Add `{ "path": "apps/docs" }` to `references` array              |
| `package.json` (root) | Add `docs:dev` and `docs:build` scripts                          |
| `.gitignore` (root)   | Add VitePress-specific patterns if not covered by existing rules |

## Dependencies

### New NPM Packages

Required in `apps/docs/package.json`:

- `vitepress` (latest) - Static site generator
- `vue` (^3.x) - Peer dependency for VitePress

Dev dependencies:

- `typescript` (^5.3.0) - For `.vitepress/config.ts` type checking

### Task Dependencies

**Requires:** None (foundation task)

**Blocks:**

- E06-T002 (KB folder structure and navigation)
- E06-T004 (CI integration for docs validation)

## Implementation Details

### 1. Package.json Configuration

`apps/docs/package.json`:

```json
{
  "name": "@raptscallions/docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vitepress dev src",
    "build": "vitepress build src",
    "preview": "vitepress preview src",
    "clean": "rm -rf .vitepress/dist .vitepress/cache *.tsbuildinfo",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "vitepress": "^1.5.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

**Key Points:**

- `dev` script runs VitePress dev server pointing to `src/` directory
- `build` generates static site for production
- `preview` allows testing the production build locally
- `clean` removes generated files (aligns with monorepo pattern)

### 2. TypeScript Configuration

`apps/docs/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./.vitepress/dist",
    "rootDir": ".",
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  },
  "include": [".vitepress/**/*.ts", ".vitepress/**/*.vue", "src/**/*.md"],
  "exclude": ["node_modules", ".vitepress/dist", ".vitepress/cache"]
}
```

**Key Points:**

- Extends root strict TypeScript config
- `moduleResolution: "Bundler"` required for Vite/VitePress
- Includes `.vitepress/config.ts` and markdown files for type checking
- Excludes build outputs and cache

### 3. VitePress Configuration

`apps/docs/.vitepress/config.ts`:

```typescript
import { defineConfig } from "vitepress";

export default defineConfig({
  // Site metadata
  title: "RaptScallions KB",
  description:
    "Knowledge base for RaptScallions platform architecture, patterns, and decisions",

  // Source directory
  srcDir: "./src",

  // Clean URLs (no .html extension)
  cleanUrls: true,

  // Last updated timestamp from git
  lastUpdated: true,

  // Theme configuration
  themeConfig: {
    // Site navigation (top nav bar)
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture/" },
      { text: "Contributing", link: "/contributing/" },
    ],

    // Sidebar navigation (placeholder - will be expanded in E06-T002)
    sidebar: [],

    // Social links
    socialLinks: [
      { icon: "github", link: "https://github.com/yourusername/raptscallions" },
    ],

    // Search configuration (local search enabled)
    search: {
      provider: "local",
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: "Search KB",
            buttonAriaLabel: "Search documentation",
          },
          modal: {
            displayDetails: "Display detailed list",
            resetButtonTitle: "Reset search",
            noResultsText: "No results for",
            footer: {
              selectText: "to select",
              navigateText: "to navigate",
              closeText: "to close",
            },
          },
        },
      },
    },

    // Edit link (points to GitHub)
    editLink: {
      pattern:
        "https://github.com/yourusername/raptscallions/edit/main/apps/docs/src/:path",
      text: "Edit this page on GitHub",
    },

    // Footer
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 RaptScallions",
    },
  },
});
```

**Key Points:**

- `srcDir: './src'` tells VitePress where markdown files live
- `search.provider: 'local'` enables built-in search (no external service)
- `cleanUrls: true` removes `.html` extensions from URLs
- `lastUpdated: true` shows git commit timestamps on pages
- Minimal nav/sidebar - will be expanded in E06-T002
- Edit links point to GitHub (update URL when known)

### 4. Homepage Content

`apps/docs/src/index.md`:

```markdown
---
layout: home

hero:
  name: RaptScallions
  text: Knowledge Base
  tagline: Architecture, patterns, decisions, and troubleshooting for the RaptScallions platform
  actions:
    - theme: brand
      text: Get Started
      link: /architecture/
    - theme: alt
      text: View on GitHub
      link: https://github.com/yourusername/raptscallions

features:
  - icon: 🏗️
    title: Architecture
    details: System design, technology stack, and core entity relationships
    link: /architecture/
  - icon: 🎨
    title: Patterns
    details: Reusable implementation patterns for common scenarios
    link: /patterns/
  - icon: 📚
    title: Domain Guides
    details: Deep dives into auth, database, API, AI, and testing domains
    link: /domains/
  - icon: 🔍
    title: Troubleshooting
    details: Problem-solution guides for common issues
    link: /troubleshooting/
---

## About This KB

This knowledge base documents the **implemented** features of the RaptScallions platform. Unlike planning documents, every article here is verified against working code.

### What's Inside

- **Concepts**: Mental models and core ideas
- **Patterns**: Reusable code patterns with examples
- **Decisions**: Architecture decision records (ADRs)
- **Troubleshooting**: Guides for resolving common issues

### Navigation

Use the search bar (Cmd/Ctrl + K) to find topics quickly, or browse by domain using the sidebar.

### Contributing

See the [Contributing Guide](/contributing/) for information on updating documentation.
```

**Key Points:**

- Uses VitePress `home` layout for landing page
- Hero section with branding and CTAs
- Feature cards linking to main sections (placeholders for E06-T002+)
- Emphasizes "implementation-first" documentation philosophy
- Includes navigation hints

### 5. Local Gitignore

`apps/docs/.gitignore`:

```
# VitePress build outputs
.vitepress/dist/
.vitepress/cache/

# TypeScript
*.tsbuildinfo
```

**Key Points:**

- Ignores VitePress build artifacts
- Ignores VitePress cache directory
- Aligns with monorepo's existing `.gitignore` patterns

### 6. Root Package.json Scripts

Add to root `package.json` scripts section:

```json
{
  "scripts": {
    "docs:dev": "pnpm --filter @raptscallions/docs dev",
    "docs:build": "pnpm --filter @raptscallions/docs build",
    "docs:preview": "pnpm --filter @raptscallions/docs preview"
  }
}
```

**Key Points:**

- Convenience scripts for running docs commands from root
- Follows existing pattern (e.g., `pnpm --filter`)
- Includes preview script for testing production builds

### 7. Root Gitignore Update

Add to root `.gitignore` if not already covered:

```
# VitePress (apps/docs)
apps/docs/.vitepress/dist/
apps/docs/.vitepress/cache/
```

**Note:** Existing patterns `dist/` and `*.tsbuildinfo` may already cover these, but explicit patterns ensure coverage.

### 8. TypeScript Project References

Add to root `tsconfig.json` references array:

```json
{
  "references": [
    // ... existing references
    { "path": "apps/docs" }
  ]
}
```

**Key Points:**

- Enables TypeScript project references for type checking
- Allows `pnpm typecheck` at root to validate VitePress config
- Maintains build cache for faster subsequent checks

## Test Strategy

### Manual Verification Tests

Since this is infrastructure setup, testing is primarily manual verification:

1. **Development Server**

   ```bash
   cd apps/docs
   pnpm dev
   # Verify: Server starts on http://localhost:5173
   # Verify: Homepage renders with hero section
   # Verify: Dark/light theme toggle works
   ```

2. **Search Functionality**

   ```bash
   # With dev server running:
   # Press Cmd/Ctrl + K
   # Verify: Search modal opens
   # Type "architecture"
   # Verify: Search results appear (may be minimal with just homepage)
   ```

3. **Production Build**

   ```bash
   cd apps/docs
   pnpm build
   # Verify: Build succeeds without errors
   # Verify: .vitepress/dist/ directory created
   pnpm preview
   # Verify: Preview server starts
   # Verify: Site works identically to dev
   ```

4. **Root Scripts**

   ```bash
   # From repository root:
   pnpm docs:dev
   # Verify: Same as running from apps/docs
   pnpm docs:build
   # Verify: Build succeeds
   ```

5. **TypeScript Validation**

   ```bash
   cd apps/docs
   pnpm typecheck
   # Verify: No TypeScript errors

   # From root:
   pnpm typecheck
   # Verify: No TypeScript errors across all packages
   ```

6. **Hot Reload**
   ```bash
   pnpm docs:dev
   # Edit apps/docs/src/index.md
   # Verify: Page reloads automatically with changes
   ```

### Integration Tests (Future)

For E06-T004 (CI integration), automated tests will verify:

- Build succeeds without errors
- No broken links
- Search index builds correctly

## Acceptance Criteria Breakdown

### AC1: `apps/docs/` workspace created with package.json

**Implementation:**

- Create `apps/docs/package.json` with VitePress dependencies and scripts

**Verification:**

- File exists at correct path
- Contains `name: "@raptscallions/docs"`
- Has `vitepress` and `vue` dependencies
- Has `dev`, `build`, `preview`, `clean`, `typecheck` scripts

### AC2: VitePress installed as dependency in apps/docs

**Implementation:**

- Add `vitepress` and `vue` to `dependencies` in `apps/docs/package.json`
- Run `pnpm install` to install packages

**Verification:**

- `pnpm list vitepress --filter @raptscallions/docs` shows installed version
- `node_modules/vitepress` exists in `apps/docs/`

### AC3: pnpm-workspace.yaml updated to include apps/docs

**Implementation:**

- No change needed - `apps/*` pattern already includes `apps/docs/`

**Verification:**

- `pnpm-workspace.yaml` contains `- 'apps/*'`
- `pnpm ls --depth 0` shows `@raptscallions/docs` in workspace

### AC4: VitePress config created at apps/docs/.vitepress/config.ts

**Implementation:**

- Create `.vitepress/config.ts` with site metadata, search config, and theme settings

**Verification:**

- File exists at `apps/docs/.vitepress/config.ts`
- Contains `defineConfig` export
- Has `search.provider: 'local'` configured
- Has `srcDir: './src'` setting

### AC5: `pnpm --filter docs dev` starts local development server

**Implementation:**

- Add `dev` script to `apps/docs/package.json`: `"dev": "vitepress dev src"`

**Verification:**

- Run `pnpm --filter @raptscallions/docs dev`
- Server starts on http://localhost:5173
- No errors in console
- Homepage loads in browser

### AC6: `pnpm --filter docs build` generates static site

**Implementation:**

- Add `build` script to `apps/docs/package.json`: `"build": "vitepress build src"`

**Verification:**

- Run `pnpm --filter @raptscallions/docs build`
- Build completes successfully
- `.vitepress/dist/` directory created
- Contains `index.html` and assets

### AC7: Root package.json has `docs:dev` and `docs:build` scripts

**Implementation:**

- Add `docs:dev` and `docs:build` scripts to root `package.json`

**Verification:**

- Run `pnpm docs:dev` from root - dev server starts
- Run `pnpm docs:build` from root - build succeeds
- Both delegate to `pnpm --filter @raptscallions/docs`

### AC8: Homepage (apps/docs/src/index.md) renders correctly

**Implementation:**

- Create `src/index.md` with VitePress home layout, hero, and feature cards

**Verification:**

- Run dev server
- Visit http://localhost:5173
- Homepage displays hero section with "RaptScallions Knowledge Base" title
- Feature cards visible with icons and descriptions
- No console errors

### AC9: Local search functionality enabled and working

**Implementation:**

- Configure `search.provider: 'local'` in `.vitepress/config.ts`

**Verification:**

- Run dev server
- Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
- Search modal opens
- Can type query and see results (may be limited with minimal content)
- Search UI has proper styling and keyboard navigation

### AC10: Dark/light theme toggle present (VitePress default)

**Implementation:**

- VitePress default theme includes theme toggle automatically

**Verification:**

- Load homepage
- Theme toggle button visible in top-right of navbar
- Clicking toggles between dark and light themes
- Theme preference persists on page reload

### AC11: Build outputs added to .gitignore

**Implementation:**

- Create `apps/docs/.gitignore` with VitePress build patterns
- Optionally add explicit patterns to root `.gitignore`

**Verification:**

- Run build
- Run `git status`
- `.vitepress/dist/` and `.vitepress/cache/` not shown as untracked files
- `*.tsbuildinfo` not shown as untracked

## Edge Cases

### 1. Port Conflict on :5173

**Scenario:** VitePress default port (5173) already in use by another process

**Handling:**

- VitePress automatically tries next available port (5174, 5175, etc.)
- No special configuration needed
- Document in troubleshooting if needed

### 2. Missing Vue Peer Dependency

**Scenario:** `vue` not installed causes VitePress to fail

**Handling:**

- Explicitly list `vue` in `dependencies` (not just peer)
- Version should match VitePress expectations (^3.x)
- pnpm will warn if peer dependency mismatch

### 3. TypeScript Errors in Config

**Scenario:** `.vitepress/config.ts` has type errors due to incorrect imports

**Handling:**

- Ensure `typescript` in devDependencies
- Use `import { defineConfig } from 'vitepress'` for type inference
- Run `pnpm typecheck` to catch errors before dev/build

### 4. Search Not Indexing Content

**Scenario:** Search modal works but returns no results

**Handling:**

- Local search builds index from markdown frontmatter and content
- With minimal content (just homepage), results will be limited
- This is expected for initial setup - search will improve as content added
- Document this limitation in task notes

### 5. Module Resolution Issues

**Scenario:** TypeScript cannot resolve `vitepress` module

**Handling:**

- Set `moduleResolution: "Bundler"` in tsconfig.json (Vite requirement)
- Ensure `node_modules` installed via `pnpm install`
- Clear cache: `rm -rf node_modules/.vite` if issues persist

## Open Questions

None - this task has well-defined scope and no ambiguities requiring human input.

## Out of Scope

This task explicitly does NOT include:

1. **Custom Theme Development** - Using VitePress default theme only
2. **Sidebar Navigation Structure** - Covered in E06-T002
3. **Domain Documentation Content** - Covered in E06-T005 through E06-T010
4. **Algolia DocSearch Integration** - Using local search only
5. **CI/CD Integration** - Covered in E06-T004
6. **Deployment Configuration** - Local development only for now
7. **Internationalization (i18n)** - Not needed for initial launch
8. **Custom Search Filters** - VitePress default search sufficient
9. **Analytics Integration** - Not in epic scope
10. **Automated Link Checking** - Will be part of CI (E06-T004)

## Implementation Notes

### VitePress Version Locking

While we use `^` ranges for most dependencies, consider locking VitePress to exact version if breaking changes are common:

```json
{
  "dependencies": {
    "vitepress": "1.5.0"
  }
}
```

This prevents unexpected UI/API changes during development. Can be relaxed later.

### Development Workflow

Once implemented, typical dev workflow will be:

```bash
# Start docs dev server
pnpm docs:dev

# In another terminal, make changes to markdown files
# Browser auto-refreshes

# Check types before committing
pnpm typecheck

# Build to verify production works
pnpm docs:build
```

### Search Limitations

VitePress local search is content-based and will be minimal with just a homepage. As E06-T005+ tasks add domain documentation, search quality will improve naturally. No special configuration needed.

### Future Enhancements (Post-Epic)

Consider for future work (not blocking this epic):

- Custom VitePress theme matching main app branding
- Mermaid diagram support via plugin
- Code playground integration
- PDF export functionality
- Automated screenshot generation

### TypeScript Strict Mode

The VitePress config inherits strict TypeScript settings from root. This is intentional - config files should be type-safe. If VitePress types cause issues, DO NOT disable strict mode. Instead, use proper type guards or file an issue with VitePress.

## Success Metrics

Task is complete when all acceptance criteria pass and:

1. **Developer can start KB dev server in one command**: `pnpm docs:dev`
2. **Search is functional**: Cmd/Ctrl+K opens search, can find homepage content
3. **Theme toggle works**: Can switch between dark/light modes
4. **Build succeeds**: `pnpm docs:build` completes without errors
5. **Types are valid**: `pnpm typecheck` passes with zero errors
6. **Hot reload works**: Changes to markdown files trigger instant browser refresh

## References

**Task:** [E06-T001](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/tasks/E06/E06-T001.md)

**Epic:** [E06](/home/ryan/Documents/coding/claude-box/raptscallions/backlog/tasks/E06/_epic.md)

**Key Documentation:**

- VitePress Official Docs: https://vitepress.dev/
- VitePress Config Reference: https://vitepress.dev/reference/site-config
- VitePress Default Theme: https://vitepress.dev/reference/default-theme-config

**Related Specs:**

- E06-T002: KB folder structure and navigation (depends on this task)
- E06-T004: CI integration for docs validation (depends on this task)

**Existing Code Patterns:**

- `apps/api/package.json` - Workspace app pattern
- `apps/api/tsconfig.json` - TypeScript project reference pattern
- Root `package.json` - Filter script pattern (`pnpm --filter`)
