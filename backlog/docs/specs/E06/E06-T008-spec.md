# E06-T008: Cross-Linking Conventions and Contribution Guide

## Implementation Specification

**Task:** Cross-Linking Conventions and Contribution Guide
**Epic:** E06 - Knowledge Base Infrastructure
**Priority:** Medium
**Status:** ANALYZED

---

## 1. Overview

### 1.1 Problem Statement

The KB infrastructure is in place but lacks standardized conventions for cross-referencing between documentation, code files, and backlog tasks. Without consistent linking patterns and a contribution guide, documentation will become inconsistent and difficult to maintain.

### 1.2 Goals

1. Define a Reference section template for all KB documentation
2. Establish conventions for linking to backlog tasks, source code, and other KB pages
3. Write a comprehensive contribution guide at `apps/docs/src/contributing/documentation.md`
4. Provide copy-pasteable templates for each doc type
5. Document frontmatter requirements with examples
6. Create domain selection guidance
7. Explain staleness tracking system
8. Integrate existing testing KB content from `docs/kb/testing/`
9. Link contribution guide from KB homepage

### 1.3 Success Criteria

- All 11 acceptance criteria met
- Links work in both VitePress and raw GitHub markdown
- Templates are actionable and copy-pasteable
- Task references are machine-parseable

---

## 2. Current State Analysis

### 2.1 Existing Documentation

The KB already has:

1. **KB Page Design Patterns** (`apps/docs/src/contributing/kb-page-design.md`) - Covers VitePress markdown patterns, code blocks, containers, heading hierarchy
2. **Design System** (`apps/docs/src/contributing/design-system.md`) - Color palette, typography, design tokens
3. **Contributing Index** (`apps/docs/src/contributing/index.md`) - Basic structure, placeholder content
4. **Homepage** (`apps/docs/src/index.md`) - Domain links, basic navigation

### 2.2 Existing Testing Content to Integrate

Located at `docs/kb/testing/fastify/`:
- `README.md` - Quick reference for testing gotchas
- `plugin-encapsulation.md` - Detailed pattern for Fastify plugin testing

### 2.3 Gap Analysis

| What Exists | What's Missing |
|-------------|----------------|
| KB page design patterns | Reference section template |
| Basic contributing index | Backlog task linking conventions |
| Staleness tracking fields | Source code linking conventions |
| Domain structure | KB-to-KB relative path conventions |
| - | Contribution guide (documentation.md) |
| - | Doc type templates (concept, pattern, decision, troubleshooting) |
| - | Domain selection guidance |
| - | Staleness tracking explanation |
| - | Testing content integrated |
| - | Homepage link to contribution guide |

---

## 3. Technical Design

### 3.1 Reference Section Template

Every KB doc should end with a References section following this format:

```markdown
## References

**Implements:** [E02-T002](/backlog/completed/E02/E02-T002.md)

**Key Files:**
- [session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts) - Session CRUD operations
- [session.middleware.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/middleware/session.middleware.ts) - Request hook

**Related Docs:**
- [OAuth Flow](./oauth-flow)
- [Guard Middleware Pattern](/auth/patterns/guard-middleware)

**External Resources:**
- [Lucia Auth Documentation](https://lucia-auth.com)
```

**Key Design Decisions:**
1. **Backlog links use relative paths** - Works in VitePress and GitHub
2. **Source code links use GitHub URLs** - VitePress can't resolve repo-relative paths; GitHub URLs ensure clickability
3. **KB links omit `.md` extension** - VitePress requirement for clean URLs
4. **Same-domain uses relative paths** - `./sibling.md` or `../parent/child`
5. **Cross-domain uses absolute paths** - `/auth/concepts/sessions`

### 3.2 Linking Convention Table

| Link Type | Format | VitePress | GitHub | Example |
|-----------|--------|-----------|--------|---------|
| KB doc (same domain) | `./file` or `../type/file` | ✓ | ✓ | `[Sessions](./sessions)` |
| KB doc (other domain) | `/domain/type/file` | ✓ | ✓* | `[CASL](/auth/concepts/casl)` |
| Backlog task | Relative path with `.md` | ✓ | ✓ | `[E02-T002](/backlog/completed/E02/E02-T002.md)` |
| Source file | GitHub URL | ✓ | ✓ | `[file.ts](https://github.com/...)` |
| External URL | Full URL | ✓ | ✓ | `[Docs](https://lucia-auth.com)` |

*GitHub requires navigation to `apps/docs/src/` first

### 3.3 Machine-Parseable Task References

For tooling to extract task references, use this format in frontmatter:

```yaml
---
title: Session Lifecycle
implements_task: E02-T002
---
```

And in prose:
```markdown
**Implements:** [E02-T002](/backlog/completed/E02/E02-T002.md)
```

Regex pattern for extraction:
```
implements_task:\s*([A-Z]\d+-T\d+)
\[([A-Z]\d+-T\d+)\]
```

### 3.4 Frontmatter Requirements

#### Required Fields

```yaml
---
title: Page Title Here           # Required - appears in sidebar, search, browser tab
description: Brief one-sentence  # Required - used in search previews, SEO
---
```

#### Optional Fields

```yaml
---
title: Session Lifecycle
description: How Lucia sessions work
related_code:                    # Optional - enables staleness tracking
  - packages/auth/src/session.service.ts
  - packages/auth/**/*.ts        # Glob patterns supported
implements_task: E02-T002        # Optional - links to backlog task
last_verified: 2026-01-14        # Optional - for staleness tracking (YYYY-MM-DD)
outline: [2, 3]                  # Optional - control right sidebar TOC
lastUpdated: false               # Optional - hide git timestamp
---
```

### 3.5 Doc Type Templates

#### Concept Template

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
- [Related Concept](/domain/concepts/related)
```

#### Pattern Template

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
- [Related Pattern](/domain/patterns/related)
```

#### Decision Record (ADR) Template

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

#### Troubleshooting Template

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
- [Related Troubleshooting](/domain/troubleshooting/related)
```

### 3.6 Domain Selection Guide

| Your Topic | Domain | Subdirectory |
|------------|--------|--------------|
| Sessions, login, permissions, CASL, OAuth | auth | concepts/, patterns/, decisions/, troubleshooting/ |
| Drizzle, migrations, PostgreSQL, entities | database | concepts/, patterns/, decisions/, troubleshooting/ |
| Fastify routes, middleware, validation, services | api | concepts/, patterns/, decisions/, troubleshooting/ |
| OpenRouter, streaming, AI errors | ai | concepts/, patterns/, decisions/, troubleshooting/ |
| Vitest, mocking, test patterns, coverage | testing | patterns/, troubleshooting/ |
| How to contribute, KB guidelines | contributing | (no subdirectories) |

**Decision tree:**

1. **Is it about how to write/contribute to docs?** → `contributing/`
2. **Is it about testing code?** → `testing/`
3. **Does it involve AI/LLM calls?** → `ai/`
4. **Does it involve authentication or authorization?** → `auth/`
5. **Does it involve database or ORM?** → `database/`
6. **Does it involve HTTP/routes/middleware?** → `api/`

**Content type decision:**

1. **Explaining a concept/mental model?** → `concepts/`
2. **Showing how to implement something reusable?** → `patterns/`
3. **Recording why we chose X over Y?** → `decisions/`
4. **Fixing a problem/error?** → `troubleshooting/`

### 3.7 Staleness Tracking

The KB uses optional frontmatter fields to track documentation freshness:

```yaml
related_code:
  - packages/auth/src/session.service.ts
  - packages/auth/**/*.ts
last_verified: 2026-01-14
```

**How it works:**
1. `related_code` lists files or glob patterns this doc describes
2. `last_verified` records when the doc was last verified against code
3. `pnpm docs:check-stale` compares dates and flags stale docs
4. Docs are "stale" if any related file was modified after `last_verified`

**Keeping docs fresh:**
1. After modifying documented code, update the related KB page
2. Update `last_verified` to today's date
3. Run `pnpm docs:check-stale` before releases

**When NOT to use staleness tracking:**
- Conceptual guides not tied to specific code
- General tutorials
- Reference docs for external libraries

### 3.8 Common Mistakes

The contribution guide should include error recovery guidance:

#### Broken Links

**VitePress build output:**
```
⚠ dead link found:
  source: /auth/concepts/sessions.md
  link: /auth/patterns/guard
```

**Fixes:**
- Check the path exists (typo?)
- KB links should NOT have `.md` extension
- Use `/domain/type/file` format for cross-domain links

#### Frontmatter Errors

**VitePress output:**
```
Error parsing frontmatter of /auth/concepts/sessions.md
```

**Common causes:**
- Missing `---` delimiters
- Invalid YAML (bad indentation, unquoted special characters)
- Colons in titles need quotes: `title: "ADR-001: Why We Chose X"`

#### Links Work in VitePress But Break in GitHub (or vice versa)

| Symptom | Cause | Fix |
|---------|-------|-----|
| Works in VitePress, breaks in GitHub | Used `/domain/...` for KB links | This is expected — GitHub doesn't know about VitePress routing |
| Works in GitHub, breaks in VitePress | Included `.md` extension on KB links | Remove `.md` for KB links |
| Breaks in both | Path is wrong | Double-check the file exists |

#### Quick Verification

```bash
# Test locally before pushing
pnpm docs:dev    # Check links work in browser
pnpm docs:build  # See dead link warnings
```

### 3.9 Guide Relationships

Clarify the relationship between contribution guides:

| Guide | Purpose |
|-------|---------|
| `documentation.md` | **What to write** — templates, conventions, where things go |
| `kb-page-design.md` | **How to format** — markdown syntax, VitePress features |
| `design-system.md` | **Visual identity** — colors, typography, spacing |

Include cross-reference: "For VitePress markdown formatting (code blocks, containers, tables), see [KB Page Design Patterns](/contributing/kb-page-design)."

### 3.10 Source Code URL Convention

Source code links use full GitHub URLs:

```markdown
[session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts)
```

**Base URL:** `https://github.com/ryandt33/raptscallions/blob/main/`

**Note:** If the repository is moved or renamed, use find-and-replace to update all source code URLs. This is a rare event but documented here for completeness.

---

## 4. Implementation Plan

### 4.1 Phase 1: Create Contribution Guide

**File:** `apps/docs/src/contributing/documentation.md`

**Sections:**
1. Linking Conventions (table with all link types) — see §3.2
2. Frontmatter Requirements (required vs optional fields) — see §3.4
3. Doc Type Templates (all 4 templates) — see §3.5
4. Domain Selection Guide (decision tree + table) — see §3.6
5. Staleness Tracking (explanation + workflow) — see §3.7
6. Reference Section Template (standard footer) — see §3.1
7. Common Mistakes (error recovery) — see §3.8
8. Guide Relationships (documentation vs kb-page-design) — see §3.9

### 4.2 Phase 2: Integrate Testing Content

**Actions:**
1. Copy `docs/kb/testing/fastify/plugin-encapsulation.md` → `apps/docs/src/testing/patterns/fastify-plugin-encapsulation.md`
2. Update frontmatter to match KB standards
3. Add References section
4. Copy key content from `docs/kb/testing/fastify/README.md` → `apps/docs/src/testing/index.md`
5. Update testing sidebar in VitePress config

### 4.3 Phase 3: Update Contributing Index

**File:** `apps/docs/src/contributing/index.md`

**Changes:**
1. Add link to documentation.md
2. Improve structure with links to all guides:
   - Documentation Guide
   - KB Page Design Patterns
   - Design System

### 4.4 Phase 4: Update Homepage

**File:** `apps/docs/src/index.md`

**Changes:**
1. Add "Contributing" section to features
2. Ensure contribution guide is prominently linked

---

## 5. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `apps/docs/src/contributing/documentation.md` | Main contribution guide for KB docs |
| `apps/docs/src/testing/patterns/fastify-plugin-encapsulation.md` | Migrated from docs/kb/ |

### Modified Files

| File | Changes |
|------|---------|
| `apps/docs/src/contributing/index.md` | Add link to documentation.md |
| `apps/docs/src/testing/index.md` | Add content from docs/kb/testing/fastify/README.md |
| `apps/docs/src/index.md` | Add link to contribution guide |

### Files to Delete (Post-Migration)

| File | Reason |
|------|--------|
| `docs/kb/testing/fastify/README.md` | Content migrated to KB |
| `docs/kb/testing/fastify/plugin-encapsulation.md` | Content migrated to KB |

---

## 6. Testing Approach

### 6.1 Manual Verification

1. **VitePress rendering:**
   - Run `pnpm docs:dev`
   - Verify all internal links work
   - Check all templates render correctly
   - Test code block syntax highlighting

2. **GitHub rendering:**
   - Push to branch
   - Verify links work in GitHub markdown preview
   - Check frontmatter displays correctly

3. **Search functionality:**
   - Verify new pages appear in search
   - Check descriptions show in previews

### 6.2 Link Validation

Run VitePress dead link detection:
```bash
pnpm docs:build
```

VitePress logs warnings for broken internal links during build.

---

## 7. Acceptance Criteria Mapping

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC1 | Reference section template defined | documentation.md § Reference Section Template |
| AC2 | Backlog task linking convention | documentation.md § Linking Conventions |
| AC3 | Source code linking convention | documentation.md § Linking Conventions (GitHub URLs) |
| AC4 | KB doc linking convention (relative) | documentation.md § Linking Conventions |
| AC5 | Contribution guide at documentation.md | New file created |
| AC6 | Templates for all doc types | documentation.md § Doc Type Templates |
| AC7 | Frontmatter requirements documented | documentation.md § Frontmatter Requirements |
| AC8 | Domain selection guidance | documentation.md § Domain Selection Guide |
| AC9 | Staleness tracking explained | documentation.md § Staleness Tracking |
| AC10 | Testing content integrated | fastify-plugin-encapsulation.md + testing/index.md updates |
| AC11 | Guide linked from homepage | index.md modification |

---

## 8. Constraints Verification

| Constraint | Solution |
|------------|----------|
| Links work in VitePress and GitHub | Use absolute KB paths + GitHub URLs for code |
| Relative paths for portability | Same-domain uses `./` paths |
| Task references machine-parseable | `implements_task` in frontmatter + `[E0X-T0XX]` pattern |
| Guide is actionable | Step-by-step quick start + copy-paste templates |
| Templates copy-pasteable | Full markdown blocks with placeholders |

---

## 9. Out of Scope

Explicitly excluded per task definition:
- Automatic link generation
- Backlinks (showing what links to a page)
- External link validation
- Style guide for prose (grammar, tone)
- Spell check or linting setup

---

## 10. Dependencies

None - this task can proceed independently.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub URL links break if repo moves | Low | Medium | Document URL pattern; can update with search/replace |
| Templates become outdated | Medium | Low | Reference existing pages as canonical examples |
| Staleness tracking not used | Medium | Low | Document benefits; make it optional |

---

## 12. Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Create contribution guide | 60 min |
| Phase 2: Integrate testing content | 20 min |
| Phase 3: Update contributing index | 10 min |
| Phase 4: Update homepage | 10 min |
| Testing and verification | 15 min |
| **Total** | ~2 hours |

---

## Appendix: Sample Reference Section

Here's a complete example of a References section:

```markdown
## References

**Implements:** [E02-T002](/backlog/completed/E02/E02-T002.md)

**Key Files:**
- [session.service.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/auth/src/session.service.ts) - Session creation and validation
- [session.middleware.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/middleware/session.middleware.ts) - Fastify request hook

**Related Docs:**
- [OAuth Flow](/auth/concepts/oauth-flow)
- [Guard Middleware Pattern](/auth/patterns/guard-middleware)
- [Session Troubleshooting](/auth/troubleshooting/session-issues)

**External Resources:**
- [Lucia Auth Documentation](https://lucia-auth.com)
- [Fastify Cookies Plugin](https://github.com/fastify/fastify-cookie)
```

---

## UX Review

**Reviewer:** Designer Agent
**Date:** 2026-01-14
**Status:** PASS WITH CONCERNS

### Summary

The spec is well-structured and thoughtfully addresses the core problem of documentation consistency. The conventions are practical and the templates are actionable. However, there are several cognitive load and discoverability concerns that should be addressed to ensure contributors (particularly less experienced ones) can successfully use the guide.

### Strengths

- **Clear decision trees** - The domain selection guide with step-by-step questions helps contributors navigate where their content belongs
- **Copy-pasteable templates** - All four doc type templates are complete and ready to use with clear placeholders
- **Machine-parseable patterns** - The regex patterns for task extraction enable future tooling without adding human burden
- **Dual-environment awareness** - Thoughtful consideration of both VitePress and GitHub rendering requirements
- **Staleness tracking explanation** - Clear guidance on when to use vs. when not to use staleness tracking
- **Progressive disclosure** - Required vs. optional frontmatter fields are clearly distinguished
- **Gap analysis** - Good understanding of what already exists vs. what needs to be created

### Concerns

#### ~~Should Fix: Linking Convention Inconsistency Between Spec Sections~~ ✓ ADDRESSED

**Resolution:** Added §3.11 documenting full GitHub URLs for source code links with explicit base URL. Backlog links not needed from KB docs (backlog is internal project management, not user-facing documentation).

---

#### ~~Should Fix: No Error Recovery Guidance~~ ✓ ADDRESSED

**Resolution:** Added §3.8 Common Mistakes with guidance on broken links, frontmatter errors, and environment-specific link behavior.

---

#### Suggestion: Consider Adding Visual Hierarchy to the Contribution Guide

**Issue:** The contribution guide will have many sections (Quick Start, Linking Conventions, Frontmatter Requirements, Doc Type Templates, Domain Selection Guide, Staleness Tracking, Reference Section Template). This is a lot of content for one page.

**Impact:** Contributors may struggle to find the specific guidance they need, especially returning users who just need to look up one thing.

**Recommendation:** Consider structuring the guide with clear visual hierarchy:
- Use a prominent Quick Reference table at the top (similar to kb-page-design.md pattern)
- Consider using VitePress tabs or collapsible sections for the 4 doc type templates to reduce scrolling
- Add anchor links in the Quick Reference to each major section

---

#### ~~Suggestion: Clarify Template vs. Existing Guide Relationship~~ ✓ ADDRESSED

**Resolution:** Added §3.9 Guide Relationships with clear table distinguishing documentation.md, kb-page-design.md, and design-system.md.

---

#### ~~Suggestion: Source Code Links May Become Stale~~ ✓ ADDRESSED

**Resolution:** Added §3.10 Source Code URL Convention documenting the base URL and find-and-replace mitigation strategy.

---

#### Suggestion: Homepage Link Placement Not Specified

**Issue:** AC11 requires the guide to be "linked from KB homepage" but the spec only says "Add 'Contributing' section to features" and "Ensure contribution guide is prominently linked." The exact placement and prominence is undefined.

**Impact:** The implementation may place the link somewhere non-obvious, reducing discoverability.

**Recommendation:** Specify the exact location on the homepage. For example: "Add to the main features grid as 'Contributing - Learn how to add and update documentation'" with a direct link to documentation.md (not just the contributing index).

### Overall Assessment

**PASS** ✓

~~**PASS WITH CONCERNS**~~

~~The spec is comprehensive and addresses the core acceptance criteria well. The doc type templates are excellent and the linking conventions are practical. The three "Should Fix" items (linking convention clarity, error recovery guidance, and quick start content) should be addressed to ensure the contribution guide is truly actionable for new contributors. The "Suggestion" items would improve the UX but are not blocking.~~

**Update (2026-01-14):** "Should Fix" items and key "Suggestion" items have been addressed in sections §3.8–§3.10. Remaining suggestions (visual hierarchy, homepage link placement) are implementation details that can be handled during development.
