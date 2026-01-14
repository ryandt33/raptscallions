---
title: Documentation Guide
description: How to write and contribute knowledge base documentation
---

# Documentation Guide

This guide explains how to contribute documentation to the RaptScallions Knowledge Base. It covers where to put content, how to structure pages, and conventions for linking between docs, code, and tasks.

## Quick Reference

| Task | Jump To |
|------|---------|
| Write a new doc | [Doc Type Templates](#doc-type-templates) |
| Choose where it goes | [Domain Selection Guide](#domain-selection-guide) |
| Add frontmatter | [Frontmatter Requirements](#frontmatter-requirements) |
| Link to other docs | [Linking Conventions](#linking-conventions) |
| Link to code files | [Source Code Links](#source-code-links) |
| Add references footer | [Reference Section Template](#reference-section-template) |
| Keep docs fresh | [Staleness Tracking](#staleness-tracking) |
| Fix broken links | [Common Mistakes](#common-mistakes) |

## How This Guide Relates to Others

| Guide | Purpose |
|-------|---------|
| **This guide** (documentation.md) | **What to write** — templates, conventions, where things go |
| [KB Page Design Patterns](/contributing/kb-page-design) | **How to format** — markdown syntax, VitePress features, code blocks |
| [Design System](/contributing/design-system) | **Visual identity** — colors, typography, spacing |

For VitePress markdown formatting (code blocks, containers, tables), see [KB Page Design Patterns](/contributing/kb-page-design).

## Linking Conventions

### Quick Reference Table

| Link Type | Format | Example |
|-----------|--------|---------|
| KB doc (same domain) | `./file` | `[Sessions](./sessions)` |
| KB doc (same folder) | `./subfolder/file` | `[OAuth](./concepts/oauth)` |
| KB doc (other domain) | `/domain/type/file` | `[CASL](/auth/concepts/casl)` |
| Section anchor | `#heading-name` | `[Best Practices](#best-practices)` |
| Anchor on another page | `/path#anchor` | `[OAuth Flow](/auth/concepts/oauth#google-setup)` |
| Backlog task | Relative with `.md` | `[E02-T002](/backlog/completed/E02/E02-T002.md)` |
| Source code file | GitHub URL | See [Source Code Links](#source-code-links) |
| External URL | Full URL | `[Lucia Docs](https://lucia-auth.com)` |

### Internal KB Links

Link to other KB pages using absolute paths from the KB root. **Do not include the `.md` extension** — VitePress requires this for clean URLs:

```markdown
See [Session Lifecycle](/auth/concepts/session-lifecycle) for details.

For related patterns, see [Guard Middleware](/auth/patterns/guard-middleware).
```

For pages in the same folder, use relative paths:

```markdown
See [OAuth Flow](./oauth-flow) for the complete OAuth implementation.
```

### Anchor Links

Link to specific sections using heading anchors. VitePress auto-generates anchors from headings:

- `## Best Practices` → `#best-practices`
- `### Creating Abilities` → `#creating-abilities`
- `## API: Overview` → `#api-overview` (colons removed)

```markdown
See [Configuration](#configuration) below.

Jump to [CASL → Creating Abilities](/auth/concepts/casl#creating-abilities).
```

### Source Code Links

Link to source code files using full GitHub URLs. This ensures links work both in VitePress and when viewing markdown on GitHub:

```markdown
[session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts)
```

**Base URL:** `https://github.com/ryandt33/raptscallions/blob/main/`

**Why GitHub URLs?** VitePress cannot resolve paths outside the `apps/docs/src/` directory. GitHub URLs work everywhere and remain clickable in any context.

::: tip Finding the URL
Navigate to the file on GitHub, click the file, then copy the URL from your browser's address bar.
:::

### Backlog Task Links

Link to completed backlog tasks using relative paths with the `.md` extension:

```markdown
**Implements:** [E02-T002](/backlog/completed/E02/E02-T002.md)
```

This format is machine-parseable for tooling. The regex pattern `\[([A-Z]\d+-T\d+)\]` can extract task IDs.

### External Links

Use full URLs for external documentation:

```markdown
See the [Lucia Auth documentation](https://lucia-auth.com) for more details.

Reference: [Fastify Plugin Guide](https://fastify.dev/docs/latest/Reference/Plugins/)
```

## Frontmatter Requirements

Every KB page starts with YAML frontmatter between `---` delimiters.

### Required Fields

```yaml
---
title: Session Lifecycle
description: How Lucia sessions are created, validated, and expired
---

# Session Lifecycle
```

- **title**: Page title (appears in sidebar, search, browser tab)
- **description**: Brief one-sentence summary (for search previews and SEO)

::: warning Important
Both `title` and `description` are required. The H1 heading should match the frontmatter title exactly.
:::

### Optional Fields

```yaml
---
title: Session Lifecycle
description: How Lucia sessions work
related_code:
  - packages/auth/src/session.service.ts
  - packages/auth/**/*.ts
implements_task: E02-T002
last_verified: 2026-01-14
outline: [2, 3]
lastUpdated: false
---
```

| Field | Type | Purpose |
|-------|------|---------|
| `related_code` | string[] | File paths or glob patterns for staleness tracking |
| `implements_task` | string | Backlog task ID this doc implements (e.g., `E02-T002`) |
| `last_verified` | string | ISO date (YYYY-MM-DD) when doc was verified against code |
| `outline` | number[] | Control which heading levels appear in right TOC (default: [2, 3]) |
| `lastUpdated` | boolean | Set `false` to hide git timestamp |

## Doc Type Templates

Choose the template that matches your content type. Copy the full template and fill in the placeholders.

### Concept Template

Use for explaining mental models, core ideas, and "how X works" documentation.

```markdown
---
title: [Concept Name]
description: [One-sentence description]
related_code:
  - [relevant/code/path.ts]
last_verified: [YYYY-MM-DD]
---

# [Concept Name]

[1-2 paragraphs explaining what this is and why it matters]

## Overview

[High-level explanation of the concept]

## How It Works

[Detailed explanation with diagrams if helpful]

## Usage Examples

[Code examples from actual implementation]

```typescript
// Example code here
```

## Common Patterns

[Variations or related patterns]

## References

**Key Files:**
- [file.ts](https://github.com/ryandt33/raptscallions/blob/main/path/to/file.ts) - Description

**Related Docs:**
- Related Concept (link to actual concept page)
```

### Pattern Template

Use for reusable implementation patterns and "how to do X" guides.

```markdown
---
title: [Pattern Name]
description: [One-sentence description]
related_code:
  - [implementation/file.ts]
last_verified: [YYYY-MM-DD]
---

# [Pattern Name]

## Problem

[What problem does this pattern solve? When would you encounter it?]

## Solution

[How does the pattern solve it? High-level description]

## Implementation

[Detailed implementation with code examples]

```typescript
// Pattern implementation
```

## When to Use

[Situations where this pattern applies]

## When NOT to Use

[Anti-patterns or situations where it's inappropriate]

## References

**Key Files:**
- [file.ts](https://github.com/ryandt33/raptscallions/blob/main/path/to/file.ts) - Description

**Related Docs:**
- Related Pattern (link to actual pattern page)
```

### Decision Record (ADR) Template

Use for documenting architecture decisions and "why we chose X over Y".

```markdown
---
title: "ADR-NNN: [Decision Title]"
description: [Why we chose X]
implements_task: [E0X-T0XX]
---

# ADR-NNN: [Decision Title]

**Status:** Accepted
**Date:** [YYYY-MM-DD]
**Decision Makers:** [Names or roles]

## Context

[What situation led to this decision? What constraints exist?]

## Decision

[What was decided?]

## Rationale

[Why was this the best choice?]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Tradeoff 1]
- [Tradeoff 2]

### Neutral
- [Implication]

## Alternatives Considered

### [Alternative 1]
- Pros: [...]
- Cons: [...]
- Why rejected: [...]

### [Alternative 2]
- Pros: [...]
- Cons: [...]
- Why rejected: [...]

## References

**Implements:** [E0X-T0XX](/backlog/completed/E0X/E0X-T0XX.md)

**Related Docs:**
- [Related Decision](/domain/decisions/related)
```

### Troubleshooting Template

Use for problem → solution guides and "how to fix X when Y happens".

```markdown
---
title: [Problem Summary]
description: [How to fix X when Y happens]
related_code:
  - [relevant/file.ts]
last_verified: [YYYY-MM-DD]
---

# [Problem Summary]

## Symptoms

[What does the developer observe?]

- Symptom 1
- Symptom 2
- Error message: `exact error text`

## Cause

[Why does this happen? Technical explanation]

## Solution

[Step-by-step fix]

### Step 1: [Action]

```bash
# Command or code
```

### Step 2: [Action]

[Explanation]

## Prevention

[How to avoid this in the future]

- Prevention measure 1
- Prevention measure 2

## References

**Key Files:**
- [file.ts](https://github.com/ryandt33/raptscallions/blob/main/path/to/file.ts) - Relevant file

**Related Docs:**
- Related Troubleshooting (link to actual troubleshooting page)
```

## Domain Selection Guide

### Decision Tree

Ask these questions in order:

1. **Is it about how to write/contribute to docs?** → `contributing/`
2. **Is it about testing code?** → `testing/`
3. **Does it involve AI/LLM calls?** → `ai/`
4. **Does it involve authentication or authorization?** → `auth/`
5. **Does it involve database or ORM?** → `database/`
6. **Does it involve HTTP/routes/middleware?** → `api/`

### Domain Reference Table

| Your Topic | Domain | Example Topics |
|------------|--------|----------------|
| Sessions, login, permissions, CASL, OAuth | `auth/` | Login flow, session validation, permission guards |
| Drizzle, migrations, PostgreSQL, entities | `database/` | Schema design, query patterns, migration strategies |
| Fastify routes, middleware, validation | `api/` | Route handlers, error handling, request validation |
| OpenRouter, streaming, AI errors | `ai/` | Model selection, streaming responses, retry logic |
| Vitest, mocking, test patterns | `testing/` | Test setup, dependency injection, integration tests |
| How to contribute, KB guidelines | `contributing/` | This guide, page design, design system |

### Content Type Selection

Within each domain, choose the appropriate subdirectory:

| Your Content | Subdirectory | Example |
|--------------|--------------|---------|
| Explaining a concept/mental model | `concepts/` | "How sessions work" |
| Showing how to implement something reusable | `patterns/` | "Guard middleware pattern" |
| Recording why we chose X over Y | `decisions/` | "ADR-001: Why Drizzle over Prisma" |
| Fixing a problem/error | `troubleshooting/` | "Session middleware not firing" |

### File Naming

- Use **kebab-case** for file names: `session-lifecycle.md`, `guard-middleware.md`
- Keep names descriptive but concise
- Maximum path depth: 3 levels (`domain/type/article.md`)

## Reference Section Template

Every KB doc should end with a References section. Include only relevant subsections:

```markdown
## References

**Implements:** [E02-T002](/backlog/completed/E02/E02-T002.md)

**Key Files:**
- [session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts) - Session creation and validation
- [session.middleware.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/middleware/session.middleware.ts) - Fastify request hook

**Related Docs:**
- [OAuth Flow](/auth/concepts/oauth-flow)
- [Guard Middleware Pattern](/auth/patterns/guard-middleware)

**External Resources:**
- [Lucia Auth Documentation](https://lucia-auth.com)
```

### Subsections to Include

| Subsection | When to Include |
|------------|-----------------|
| **Implements:** | Doc was created for a specific backlog task |
| **Key Files:** | Doc describes specific source code files |
| **Related Docs:** | There are related KB pages readers should know about |
| **External Resources:** | Referencing external documentation/libraries |

Keep to 3-6 related docs maximum. Prioritize direct dependencies or common next steps.

## Staleness Tracking

The KB uses optional frontmatter fields to track documentation freshness.

### How It Works

```yaml
---
title: Session Lifecycle
description: How Lucia sessions work
related_code:
  - packages/auth/src/session.service.ts
  - packages/auth/**/*.ts
last_verified: 2026-01-14
---
```

1. `related_code` lists files or glob patterns this doc describes
2. `last_verified` records when the doc was last verified against code
3. `pnpm docs:check-stale` compares dates and flags stale docs
4. Docs are "stale" if any related file was modified after `last_verified`

### Supported Patterns

- **Single file:** `packages/auth/src/session.service.ts`
- **Wildcard:** `apps/api/src/middleware/*.middleware.ts`
- **Deep match:** `packages/auth/**/*.ts` (all TypeScript files in auth package)

### Keeping Docs Fresh

1. After modifying documented code, update the related KB page
2. Update `last_verified` to today's date
3. Run `pnpm docs:check-stale` before releases

### When NOT to Use Staleness Tracking

Skip `related_code` and `last_verified` for:

- Conceptual guides not tied to specific code
- General tutorials
- Reference docs for external libraries
- Contributing guidelines

::: tip
Only use staleness tracking for pages that document specific code implementations. The goal is to detect when code changes invalidate documentation, not to track every page.
:::

## Common Mistakes

### Broken Links

**VitePress build output:**
```
⚠ dead link found:
  source: /auth/concepts/sessions.md
  link: /auth/patterns/guard
```

**Common causes and fixes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| "dead link found" | Path doesn't exist | Check for typos in path |
| Link works locally but not on build | Included `.md` extension | Remove `.md` from KB links |
| Link works in VitePress but breaks in GitHub | Used absolute KB path | Expected behavior — GitHub doesn't know VitePress routing |

### Frontmatter Errors

**VitePress output:**
```
Error parsing frontmatter of /auth/concepts/sessions.md
```

**Common causes:**

- Missing `---` delimiters (need opening and closing)
- Invalid YAML indentation
- Unquoted special characters in titles: use `title: "ADR-001: Why We Chose X"`

### Quick Verification

Always test locally before pushing:

```bash
# Start dev server and click through links
pnpm docs:dev

# Build and see dead link warnings
pnpm docs:build
```

## Adding a New Page Checklist

- [ ] Chose appropriate domain folder
- [ ] Chose content type (concepts, patterns, decisions, troubleshooting)
- [ ] Created file with kebab-case name
- [ ] Added required frontmatter (`title`, `description`)
- [ ] Added optional frontmatter if applicable (`related_code`, `last_verified`)
- [ ] H1 matches frontmatter title
- [ ] Used correct link format (no `.md` for KB links)
- [ ] Added References section with relevant subsections
- [ ] Tested in `pnpm docs:dev`
- [ ] Ran `pnpm docs:build` to check for dead links

## Related Pages

- [KB Page Design Patterns](/contributing/kb-page-design) — Markdown formatting, code blocks, containers
- [Design System](/contributing/design-system) — Colors, typography, visual identity
- [Contributing Overview](/contributing/) — General contribution guidelines
