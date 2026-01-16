---
title: Writer (Archived)
description: Historical writer agent for documentation updates
source_synced_at: 2026-01-16
---

# Writer (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/writer.md` for the current version.
:::

## Role

The archived writer agent kept documentation in sync with the codebase. After a feature was implemented and tested, the writer updated relevant docs so developers and users always had accurate information.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Commands** | Single `/update-docs` | Added `/outline`, `/write-docs`, `/review-docs`, `/document` |
| **Documentation types** | Post-implementation updates | Both standalone docs and implementation updates |
| **Workflow** | Always ran after QA | Dedicated documentation workflow category |

## What Remained Similar

The core writer responsibilities remained largely unchanged:

### Documentation to Update
- `docs/ARCHITECTURE.md` — New components, patterns
- `docs/CONVENTIONS.md` — New coding patterns
- `README.md` files — Setup steps, features
- API documentation — New endpoints
- Database documentation — Schema changes

### Documentation Standards
- Write for developers who haven't seen the code
- Be concise but complete
- Use examples liberally
- Keep formatting consistent

### Task Archival
- Move completed tasks to `backlog/completed/{epic}/`
- Maintain epic folder structure

## Minor Changes

The current writer agent adds:

1. **`/outline`** — Create document structure before writing
2. **`/write-docs`** — Standalone documentation creation
3. **`/review-docs`** — Technical accuracy review
4. **`/document`** — Combined write + review workflow
5. **Documentation workflow** — Formal workflow category for doc-only tasks

## Source Reference

- Archived: `.claude/archive/1_16/agents/writer.md`
- Current: `.claude/agents/writer.md`
