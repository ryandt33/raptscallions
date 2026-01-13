# Implementation Spec: E06-T002

## Overview

Establish a domain-first folder structure within `apps/docs/src/` and configure VitePress sidebar navigation to match. Create placeholder index files for each domain section to provide clear navigation hierarchy and enable developers to discover documentation by domain (auth, database, api, ai, testing, contributing).

This task builds directly on E06-T001 (VitePress setup) by adding the folder structure and navigation that will be populated by subsequent documentation tasks (E06-T005 through E06-T010).

## Approach

### Folder Structure Strategy

Create a **domain-first** organization where:
- Each domain represents a major codebase area (auth, database, api, ai, testing)
- Within each domain, content is organized by **type** (concepts, patterns, decisions, troubleshooting)
- Maximum depth of 3 levels: domain/type/article (avoid deep nesting)
- Index files at every level provide navigation and overview

### VitePress Sidebar Configuration

Use VitePress's sidebar API to create hierarchical navigation:
- Define sidebar groups for each domain
- Use `collapsed: false` for initial visibility
- Group content by type within each domain
- Index files serve as group landing pages

### Content Organization Pattern

Each domain follows a consistent pattern:
```
domain/
├── index.md              # Domain overview
├── concepts/             # Core ideas and mental models
│   └── .gitkeep
├── patterns/             # Reusable implementation patterns
│   └── .gitkeep
├── decisions/            # Architecture decision records (ADRs)
│   └── .gitkeep
└── troubleshooting/      # Problem → solution guides
    └── .gitkeep
```

Not all domains need all types (e.g., testing doesn't have decisions).

## Files to Create

| File | Purpose |
|------|---------|
| `apps/docs/src/auth/index.md` | Auth domain overview and navigation |
| `apps/docs/src/auth/concepts/.gitkeep` | Placeholder for auth concepts articles |
| `apps/docs/src/auth/patterns/.gitkeep` | Placeholder for auth patterns articles |
| `apps/docs/src/auth/decisions/.gitkeep` | Placeholder for auth decision records |
| `apps/docs/src/auth/troubleshooting/.gitkeep` | Placeholder for auth troubleshooting guides |
| `apps/docs/src/database/index.md` | Database domain overview and navigation |
| `apps/docs/src/database/concepts/.gitkeep` | Placeholder for database concepts |
| `apps/docs/src/database/patterns/.gitkeep` | Placeholder for database patterns |
| `apps/docs/src/database/decisions/.gitkeep` | Placeholder for database decisions |
| `apps/docs/src/database/troubleshooting/.gitkeep` | Placeholder for database troubleshooting |
| `apps/docs/src/api/index.md` | API domain overview and navigation |
| `apps/docs/src/api/concepts/.gitkeep` | Placeholder for API concepts |
| `apps/docs/src/api/patterns/.gitkeep` | Placeholder for API patterns |
| `apps/docs/src/api/decisions/.gitkeep` | Placeholder for API decisions |
| `apps/docs/src/api/troubleshooting/.gitkeep` | Placeholder for API troubleshooting |
| `apps/docs/src/ai/index.md` | AI domain overview and navigation |
| `apps/docs/src/ai/concepts/.gitkeep` | Placeholder for AI concepts |
| `apps/docs/src/ai/patterns/.gitkeep` | Placeholder for AI patterns |
| `apps/docs/src/ai/decisions/.gitkeep` | Placeholder for AI decisions |
| `apps/docs/src/ai/troubleshooting/.gitkeep` | Placeholder for AI troubleshooting |
| `apps/docs/src/testing/index.md` | Testing domain overview and navigation |
| `apps/docs/src/testing/patterns/.gitkeep` | Placeholder for testing patterns |
| `apps/docs/src/testing/troubleshooting/.gitkeep` | Placeholder for testing troubleshooting |
| `apps/docs/src/contributing/index.md` | Contribution guidelines overview |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/docs/.vitepress/config.ts` | Add sidebar configuration with domain-based navigation structure |
| `apps/docs/src/index.md` | Update homepage to link to all domain sections |

## Implementation Details

### Step 1: Create Domain Folders

Create the following directory structure:

```bash
apps/docs/src/
├── auth/
│   ├── concepts/
│   ├── patterns/
│   ├── decisions/
│   └── troubleshooting/
├── database/
│   ├── concepts/
│   ├── patterns/
│   ├── decisions/
│   └── troubleshooting/
├── api/
│   ├── concepts/
│   ├── patterns/
│   ├── decisions/
│   └── troubleshooting/
├── ai/
│   ├── concepts/
│   ├── patterns/
│   ├── decisions/
│   └── troubleshooting/
├── testing/
│   ├── patterns/
│   └── troubleshooting/
└── contributing/
```

Add `.gitkeep` files to all empty subdirectories to ensure they're tracked by Git.

### Step 2: Create Domain Index Files

Each domain index file should follow this template structure:

```markdown
---
title: [Domain Name]
description: [Brief description]
---

# [Domain Name]

[2-3 sentence overview of what this domain covers]

## What's Here

**Concepts** — [What kinds of concepts are explained]

**Patterns** — [What patterns are documented]

**Decisions** — [What decisions are recorded]

**Troubleshooting** — [What issues are covered]

## Coming Soon

This section is currently being populated. Documentation will be added as implementations are completed and verified.

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [Link to related domain 1]
- [Link to related domain 2]
```

#### Domain-Specific Content

**Auth (`apps/docs/src/auth/index.md`):**
```markdown
---
title: Authentication & Authorization
description: Lucia sessions, CASL permissions, OAuth providers, guards, and rate limiting
---

# Authentication & Authorization

The auth domain covers user authentication (proving identity) and authorization (determining permissions). The system uses Lucia v3 for session management, CASL for attribute-based access control, and Arctic for OAuth providers.

## What's Here

**Concepts** — Session lifecycle, permission hierarchy, OAuth flows, role-based access control (RBAC)

**Patterns** — Guard middleware composition, permission checks, OAuth provider setup, session validation

**Decisions** — Why Lucia over Passport, CASL for permissions, Arctic for OAuth, rate limiting strategy

**Troubleshooting** — Session cookies not set, permission denied errors, OAuth callback failures, rate limit issues

## Coming Soon

This section is currently being populated with documentation from implemented tasks (E02-T002 through E02-T007).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Route handlers that use auth guards
- [Testing](/testing/) — Testing auth middleware and guards
```

**Database (`apps/docs/src/database/index.md`):**
```markdown
---
title: Database & ORM
description: PostgreSQL schemas, Drizzle ORM patterns, migrations, and entity relationships
---

# Database & ORM

The database domain covers PostgreSQL schema design, Drizzle ORM usage patterns, migrations, and entity relationships. The system uses PostgreSQL 16 with the ltree extension for hierarchical groups.

## What's Here

**Concepts** — Entity relationships, soft deletes, ltree hierarchies, cascade behaviors, indexing strategies

**Patterns** — Drizzle query patterns, transaction usage, migration workflows, schema design patterns

**Decisions** — Why Drizzle over Prisma, PostgreSQL ltree for hierarchies, soft delete implementation, foreign key strategies

**Troubleshooting** — Migration failures, query performance issues, foreign key violations, ltree path errors

## Coming Soon

This section is currently being populated with documentation from implemented entities (Users, Groups, Sessions, Classes, Tools, Chat Sessions, Messages).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Services that query the database
- [Testing](/testing/) — Testing database queries and migrations
```

**API (`apps/docs/src/api/index.md`):**
```markdown
---
title: API Design & Patterns
description: Fastify route handlers, middleware, services, validation, and error handling
---

# API Design & Patterns

The API domain covers Fastify route handler patterns, middleware composition, service layer design, Zod validation, and typed error handling. The system uses Fastify (not Express) for performance and native TypeScript support.

## What's Here

**Concepts** — RESTful design, route handler structure, middleware composition, service patterns, error handling

**Patterns** — Route handler templates, preHandler arrays, service dependency injection, Zod validation, typed responses

**Decisions** — Why Fastify over Express, Zod for validation, typed error classes, response format conventions

**Troubleshooting** — Plugin encapsulation issues, validation failures, error responses, CORS problems

## Coming Soon

This section is currently being populated with documentation from implemented routes (auth, users, groups, classes, tools, chat sessions).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [Auth](/auth/) — Authentication and authorization patterns
- [Database](/database/) — Service layer database queries
- [Testing](/testing/) — Testing Fastify routes
```

**AI (`apps/docs/src/ai/index.md`):**
```markdown
---
title: AI Gateway Integration
description: OpenRouter client, streaming, error handling, and usage patterns
---

# AI Gateway Integration

The AI domain covers the OpenRouter client implementation, streaming patterns, error handling, and AI model usage. The system uses OpenRouter as a unified gateway to multiple AI providers (Anthropic, OpenAI, etc.).

## What's Here

**Concepts** — Streaming vs non-streaming, usage metadata, model selection, token counting, finish reasons

**Patterns** — OpenRouter client usage, async generator streaming, error handling, retry strategies

**Decisions** — Why OpenRouter over direct provider APIs, OpenAI SDK for compatibility, streaming-first approach

**Troubleshooting** — Rate limit errors, timeout issues, invalid responses, model availability problems

## Coming Soon

This section is currently being populated with documentation from the OpenRouter client implementation (E04-T002).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Chat runtime and streaming endpoints
- [Testing](/testing/) — Testing AI integrations
```

**Testing (`apps/docs/src/testing/index.md`):**
```markdown
---
title: Testing Patterns & Conventions
description: Vitest setup, AAA pattern, mocking strategies, Fastify integration testing
---

# Testing Patterns & Conventions

The testing domain covers Vitest configuration, test structure using the AAA pattern (Arrange/Act/Assert), mocking strategies, and Fastify-specific testing patterns including plugin encapsulation workarounds.

## What's Here

**Patterns** — AAA test structure, test factories, dependency injection for testing, mocking strategies, Fastify integration tests

**Troubleshooting** — Plugin encapsulation issues, `vi.mock()` failures, type errors in tests, async test timeouts

## Coming Soon

This section is currently being populated with documentation from the testing infrastructure (E01-T007, E02-T008) and real test examples from implemented features.

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Testing Fastify routes
- [Auth](/auth/) — Testing auth middleware
- [Database](/database/) — Testing queries and migrations
```

**Contributing (`apps/docs/src/contributing/index.md`):**
```markdown
---
title: Contributing to Raptscallions
description: How to contribute code, documentation, and improvements
---

# Contributing to Raptscallions

Guidelines for contributing to the Raptscallions project, including code contributions, documentation updates, and development workflow.

## Coming Soon

This section will include:
- Development environment setup
- Code contribution guidelines
- Documentation contribution process
- Testing requirements
- PR review process

Check the [GitHub repository](https://github.com/ryandt33/raptscallions) for current contribution guidelines.

## Quick Links

- [GitHub Issues](https://github.com/ryandt33/raptscallions/issues)
- [Pull Requests](https://github.com/ryandt33/raptscallions/pulls)
- [Project Board](https://github.com/ryandt33/raptscallions/projects)
```

### Step 3: Configure VitePress Sidebar

Update `apps/docs/.vitepress/config.ts` to add the sidebar configuration:

```typescript
import { defineConfig } from 'vitepress';

export default defineConfig({
  // ... existing config ...

  themeConfig: {
    // ... existing nav and social links ...

    // Sidebar navigation
    sidebar: [
      {
        text: 'Authentication & Authorization',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/auth/' },
          {
            text: 'Concepts',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/auth/concepts/' }
            ]
          },
          {
            text: 'Patterns',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/auth/patterns/' }
            ]
          },
          {
            text: 'Decisions',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/auth/decisions/' }
            ]
          },
          {
            text: 'Troubleshooting',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/auth/troubleshooting/' }
            ]
          }
        ]
      },
      {
        text: 'Database & ORM',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/database/' },
          {
            text: 'Concepts',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/database/concepts/' }
            ]
          },
          {
            text: 'Patterns',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/database/patterns/' }
            ]
          },
          {
            text: 'Decisions',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/database/decisions/' }
            ]
          },
          {
            text: 'Troubleshooting',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/database/troubleshooting/' }
            ]
          }
        ]
      },
      {
        text: 'API Design & Patterns',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/api/' },
          {
            text: 'Concepts',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/api/concepts/' }
            ]
          },
          {
            text: 'Patterns',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/api/patterns/' }
            ]
          },
          {
            text: 'Decisions',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/api/decisions/' }
            ]
          },
          {
            text: 'Troubleshooting',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/api/troubleshooting/' }
            ]
          }
        ]
      },
      {
        text: 'AI Gateway Integration',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/ai/' },
          {
            text: 'Concepts',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/ai/concepts/' }
            ]
          },
          {
            text: 'Patterns',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/ai/patterns/' }
            ]
          },
          {
            text: 'Decisions',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/ai/decisions/' }
            ]
          },
          {
            text: 'Troubleshooting',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/ai/troubleshooting/' }
            ]
          }
        ]
      },
      {
        text: 'Testing',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/testing/' },
          {
            text: 'Patterns',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/testing/patterns/' }
            ]
          },
          {
            text: 'Troubleshooting',
            collapsed: true,
            items: [
              { text: 'Coming Soon', link: '/testing/troubleshooting/' }
            ]
          }
        ]
      },
      {
        text: 'Contributing',
        items: [
          { text: 'Overview', link: '/contributing/' }
        ]
      }
    ],

    // ... rest of existing config ...
  }
});
```

**Note on "Coming Soon" links:** These links point to non-existent pages and will cause VitePress build warnings. However, they're necessary placeholders for the navigation structure. Two solutions:

1. **Recommended:** Create placeholder `index.md` files in each subdirectory with "Coming soon" content
2. **Alternative:** Remove the nested items entirely and add them later when content exists

**Implement Solution 1:** Create placeholder index files for all subdirectories.

### Step 4: Create Subdirectory Placeholder Files

Create `index.md` in each subdirectory to avoid dead links:

**Template for placeholder index files:**
```markdown
# Coming Soon

This section is currently being populated with documentation.

Check back soon or return to the [domain overview](../).
```

Create this file at:
- `apps/docs/src/auth/concepts/index.md`
- `apps/docs/src/auth/patterns/index.md`
- `apps/docs/src/auth/decisions/index.md`
- `apps/docs/src/auth/troubleshooting/index.md`
- `apps/docs/src/database/concepts/index.md`
- `apps/docs/src/database/patterns/index.md`
- `apps/docs/src/database/decisions/index.md`
- `apps/docs/src/database/troubleshooting/index.md`
- `apps/docs/src/api/concepts/index.md`
- `apps/docs/src/api/patterns/index.md`
- `apps/docs/src/api/decisions/index.md`
- `apps/docs/src/api/troubleshooting/index.md`
- `apps/docs/src/ai/concepts/index.md`
- `apps/docs/src/ai/patterns/index.md`
- `apps/docs/src/ai/decisions/index.md`
- `apps/docs/src/ai/troubleshooting/index.md`
- `apps/docs/src/testing/patterns/index.md`
- `apps/docs/src/testing/troubleshooting/index.md`

### Step 5: Update Homepage

Update `apps/docs/src/index.md` to link to all domain sections:

Add a new section after the "About This KB" content:

```markdown
## Browse by Domain

### [Authentication & Authorization](/auth/)
Lucia sessions, CASL permissions, OAuth providers, guards, and rate limiting.

### [Database & ORM](/database/)
PostgreSQL schemas, Drizzle ORM patterns, migrations, and entity relationships.

### [API Design & Patterns](/api/)
Fastify route handlers, middleware, services, validation, and error handling.

### [AI Gateway Integration](/ai/)
OpenRouter client, streaming, error handling, and usage patterns.

### [Testing](/testing/)
Vitest setup, AAA pattern, mocking strategies, Fastify integration testing.

### [Contributing](/contributing/)
How to contribute code, documentation, and improvements.
```

### Step 6: Add Breadcrumbs Configuration

VitePress automatically generates breadcrumbs based on the sidebar structure. Verify that the breadcrumbs appear correctly by:

1. Building the site: `pnpm docs:build`
2. Previewing: `pnpm docs:preview`
3. Navigating to a domain page and checking the breadcrumb trail

No additional configuration is needed - VitePress handles this automatically.

### Step 7: Document Folder Structure

Create a new section in the contributing index that documents the folder structure:

Add to `apps/docs/src/contributing/index.md`:

```markdown
## Documentation Structure

The knowledge base follows a domain-first organization:

### Domain Folders

Each domain represents a major codebase area:
- **auth/** — Authentication and authorization
- **database/** — Database schemas and ORM patterns
- **api/** — API design and Fastify patterns
- **ai/** — AI gateway integration
- **testing/** — Testing patterns and conventions
- **contributing/** — Contribution guidelines

### Content Types

Within each domain, content is organized by type:

- **concepts/** — Core ideas and mental models
- **patterns/** — Reusable implementation patterns
- **decisions/** — Architecture decision records (ADRs)
- **troubleshooting/** — Problem → solution guides

### Naming Conventions

- **Files:** Use kebab-case for file names (`session-lifecycle.md`)
- **Folders:** Use kebab-case for folder names (`api/`, `troubleshooting/`)
- **Titles:** Use Title Case in frontmatter
- **Max depth:** 3 levels (domain/type/article)

### Adding New Content

When adding documentation:

1. Choose the appropriate domain folder
2. Choose the content type (concepts, patterns, decisions, troubleshooting)
3. Create a new `.md` file with kebab-case name
4. Add frontmatter with title and description
5. Update the sidebar in `.vitepress/config.ts` to add the new page

Example:
```markdown
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle

[Content here...]
```
```

## Dependencies

### Required Tasks

- **E06-T001** (VitePress setup and configuration) — MUST be complete

### New Packages

None required - uses existing VitePress installation.

## Test Strategy

### Manual Verification

Since this task primarily involves folder structure and configuration, testing is manual:

1. **Folder Structure Verification**
   - Verify all domain folders exist at `apps/docs/src/{domain}/`
   - Verify all subdirectory structures match specification
   - Verify `.gitkeep` or `index.md` files in all subdirectories

2. **Build Verification**
   - Run `pnpm docs:build` - should succeed with no dead link warnings
   - Verify build output in `apps/docs/src/.vitepress/dist/`
   - Check that all domain index pages are generated

3. **Navigation Verification**
   - Run `pnpm docs:dev` and open browser
   - Verify sidebar appears with all domains
   - Click through each domain link - should render without 404
   - Verify "Coming Soon" placeholder pages render correctly
   - Verify domain index pages render with full content

4. **Breadcrumb Verification**
   - Navigate to domain overview page
   - Verify breadcrumb shows: Home > Domain
   - Navigate to subdirectory placeholder
   - Verify breadcrumb shows: Home > Domain > Type

5. **Homepage Verification**
   - Verify homepage links to all domains
   - Click each domain link from homepage
   - Verify all links work (no 404s)

6. **Search Verification**
   - Open search (Cmd/Ctrl + K)
   - Search for domain names (e.g., "auth", "database")
   - Verify domain index pages appear in results

### File Checklist

Run these checks:

```bash
# Verify domain folders exist
ls -la apps/docs/src/auth/
ls -la apps/docs/src/database/
ls -la apps/docs/src/api/
ls -la apps/docs/src/ai/
ls -la apps/docs/src/testing/
ls -la apps/docs/src/contributing/

# Verify index files exist
ls -la apps/docs/src/auth/index.md
ls -la apps/docs/src/database/index.md
ls -la apps/docs/src/api/index.md
ls -la apps/docs/src/ai/index.md
ls -la apps/docs/src/testing/index.md
ls -la apps/docs/src/contributing/index.md

# Verify placeholder files exist
ls -la apps/docs/src/auth/concepts/index.md
ls -la apps/docs/src/auth/patterns/index.md
# ... etc for all subdirectories

# Verify config file updated
grep -A 20 "sidebar:" apps/docs/.vitepress/config.ts
```

### TypeScript Verification

```bash
# Verify TypeScript types are valid
pnpm typecheck
```

### Git Verification

```bash
# Verify .gitkeep files are tracked (if not using index.md approach)
git status apps/docs/src/
```

## Acceptance Criteria Breakdown

### AC1: Domain folders created in apps/docs/src/

**Implementation:**
- Create folders: `auth/`, `database/`, `api/`, `ai/`, `testing/`, `contributing/`
- Located at: `apps/docs/src/{domain}/`

**Verification:**
```bash
ls -la apps/docs/src/ | grep -E "auth|database|api|ai|testing|contributing"
```

**Done when:**
- All 6 domain folders exist
- Folders are committed to Git

### AC2: Each domain has index.md with section overview template

**Implementation:**
- Create `index.md` in each domain folder
- Use domain-specific templates from Step 2
- Include frontmatter with title and description
- Include overview, "What's Here", "Coming Soon", and "Related Domains" sections

**Verification:**
- Check each `apps/docs/src/{domain}/index.md` exists
- Verify frontmatter is present
- Verify all required sections are present
- Build site and navigate to each domain

**Done when:**
- All 6 domain index files exist with complete content
- Pages render correctly in VitePress
- No TypeScript or build errors

### AC3: Sub-folder structure created (concepts/, patterns/, decisions/, troubleshooting/) per domain

**Implementation:**
- Create subdirectories as specified in Step 1
- Auth, database, api, ai: all 4 types
- Testing: patterns/, troubleshooting/ only
- Contributing: no subdirectories

**Verification:**
```bash
# Should succeed for auth, database, api, ai
ls -la apps/docs/src/auth/concepts/
ls -la apps/docs/src/auth/patterns/
ls -la apps/docs/src/auth/decisions/
ls -la apps/docs/src/auth/troubleshooting/

# Should succeed for testing
ls -la apps/docs/src/testing/patterns/
ls -la apps/docs/src/testing/troubleshooting/

# Should fail for testing (correct - these don't exist)
ls -la apps/docs/src/testing/concepts/  # Expected: No such file or directory
```

**Done when:**
- All required subdirectories exist
- Placeholder `index.md` files exist in each subdirectory
- `.gitkeep` files NOT needed if `index.md` files are present

### AC4: VitePress sidebar configuration reflects folder structure

**Implementation:**
- Update `apps/docs/.vitepress/config.ts` with sidebar configuration
- Use nested structure: domain → type → articles
- Set `collapsed: false` for top-level domains
- Set `collapsed: true` for type groups

**Verification:**
- Grep config file for sidebar definition
- Build and visually inspect sidebar in browser
- Verify all domains appear
- Verify types are nested under domains

**Done when:**
- Config file contains complete sidebar definition
- Build succeeds without errors
- Sidebar renders correctly in dev server

### AC5: Navigation works correctly at all levels (domain, type, article)

**Implementation:**
- Ensure all links in sidebar point to valid pages
- Domain links point to `/{domain}/`
- Type links point to placeholder pages or are expandable groups only
- Article links point to specific content (none yet, but structure supports)

**Verification:**
- Start dev server: `pnpm docs:dev`
- Click every link in sidebar
- Verify no 404 errors
- Verify placeholder pages render "Coming Soon" message

**Done when:**
- All sidebar links work (no 404s)
- Domain pages render full content
- Placeholder pages render "Coming Soon" content

### AC6: Breadcrumb navigation displays correct path

**Implementation:**
- No code needed - VitePress generates breadcrumbs automatically from sidebar structure
- Breadcrumbs appear based on current page's position in sidebar hierarchy

**Verification:**
- Navigate to domain index page
- Verify breadcrumb: `Home > Domain Name`
- Navigate to subdirectory placeholder
- Verify breadcrumb: `Home > Domain Name > Type`

**Done when:**
- Breadcrumbs appear on all pages
- Breadcrumbs reflect correct hierarchy
- Breadcrumb links work (clicking navigates correctly)

### AC7: KB homepage (apps/docs/src/index.md) links to all domains

**Implementation:**
- Add "Browse by Domain" section to homepage
- List all 6 domains with links and descriptions
- Use markdown links: `[Domain Name](/domain/)`

**Verification:**
- Open homepage in browser
- Verify "Browse by Domain" section appears
- Click each domain link
- Verify all links navigate correctly

**Done when:**
- Homepage contains all domain links
- All links work (no 404s)
- Descriptions are clear and accurate

### AC8: Empty sections gracefully indicate "Coming soon" or similar

**Implementation:**
- Create placeholder `index.md` files in all subdirectories
- Use consistent "Coming Soon" template
- Include link back to domain overview

**Verification:**
- Navigate to any placeholder page
- Verify "Coming Soon" message appears
- Verify back link works

**Done when:**
- All subdirectory placeholders exist
- All placeholders use consistent template
- No dead links or blank pages

### AC9: Folder structure documented in contributing section

**Implementation:**
- Add "Documentation Structure" section to `apps/docs/src/contributing/index.md`
- Document domain folders, content types, naming conventions
- Provide guidance on adding new content

**Verification:**
- Open contributing page
- Verify "Documentation Structure" section exists
- Verify all information is accurate and complete

**Done when:**
- Contributing page documents folder structure
- Guidance is clear for future contributors
- Examples are provided

## Edge Cases

### Empty Subdirectories in Git

**Issue:** Git doesn't track empty directories

**Solution:** Use placeholder `index.md` files instead of `.gitkeep` files. This:
- Ensures directories are tracked
- Provides valid pages (no 404s)
- Serves as navigation endpoints

### VitePress Build Warnings for Dead Links

**Issue:** VitePress warns about links to non-existent pages

**Solution:** Create placeholder `index.md` files in all subdirectories so all links resolve to valid pages

### Sidebar Expandable vs Link Behavior

**Issue:** VitePress sidebar items can be either expandable groups OR links, but behavior can be confusing

**Solution:**
- Domain level: Both expandable AND link (link to domain index)
- Type level: Expandable group with link to placeholder page
- Article level: Direct links (will be added in future tasks)

### Deep Linking from External Sources

**Issue:** External links might point directly to subdirectory paths

**Solution:** Ensure all subdirectories have `index.md` files so direct links work

### Search Index Generation

**Issue:** Empty directories won't appear in search

**Solution:** Placeholder `index.md` files ensure all sections are searchable

## Open Questions

None. All requirements are clear from the task description and epic context.

## Implementation Checklist

Developer should complete these steps in order:

- [ ] Create all domain folders (auth, database, api, ai, testing, contributing)
- [ ] Create subdirectory structure for each domain
- [ ] Create domain index files with full content (6 files)
- [ ] Create placeholder index files for all subdirectories (18 files)
- [ ] Update VitePress config with sidebar definition
- [ ] Update homepage with "Browse by Domain" section
- [ ] Add "Documentation Structure" to contributing page
- [ ] Run `pnpm typecheck` - verify passes
- [ ] Run `pnpm docs:build` - verify succeeds with no errors/warnings
- [ ] Run `pnpm docs:dev` - verify dev server starts
- [ ] Test navigation: click all sidebar links
- [ ] Test breadcrumbs on multiple pages
- [ ] Test homepage domain links
- [ ] Test search functionality (search for domain names)
- [ ] Commit all changes with descriptive message

## Post-Implementation Notes

After completing this task:

1. **Folder structure is established** - Future documentation tasks (E06-T005 through E06-T010) will populate these folders with actual content

2. **Navigation is functional** - Placeholder pages prevent 404 errors while content is being created

3. **Sidebar configuration will need updates** - As articles are added, the sidebar config should be updated to replace "Coming Soon" placeholders with actual article links

4. **Search will improve** - As content is added, search results will become more useful (currently only domain overviews are indexed)

5. **Breadcrumbs work automatically** - No additional configuration needed as new pages are added within the existing structure

6. **Structure is extensible** - New domains or content types can be added following the same pattern
