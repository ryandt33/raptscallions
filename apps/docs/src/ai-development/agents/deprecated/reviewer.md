---
title: Reviewer (Archived)
description: Historical reviewer agent for code review
source_synced_at: 2026-01-16
---

# Reviewer (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/reviewer.md` for the current version.
:::

## Role

The archived reviewer agent performed code review with fresh eyes. The agent had two modes: initial comprehensive review and focused re-review after fixes.

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Commands** | Single `/review-code` | Added `/review-migration` for schema tasks |
| **Review types** | General code review | Specialized reviews by task type |

## What Remained Similar

The core reviewer approach remained largely unchanged:

### Review Criteria

**TypeScript Strictness (Blocking):**
- Zero TypeScript errors
- Zero `any` types
- No `@ts-ignore` or `@ts-expect-error`
- Explicit return types
- `import type` syntax

**Code Quality:**
- Correctness — Does it implement the spec?
- Readability — Can you understand without explanation?
- Maintainability — Is it modular and well-organized?
- Testing — Do tests cover acceptance criteria?
- Conventions — Follows project patterns?

### Issue Categories
- 🔴 **Must Fix** — Blocking issues
- 🟡 **Should Fix** — Non-blocking issues
- 💡 **Suggestions** — Optional improvements

### Verdict Options
- `APPROVED` — Ready for QA
- `CHANGES_REQUESTED` — Issues must be fixed

## Minor Changes

The current reviewer agent adds:

1. **`/review-migration`** — Specialized review for database migrations
2. **Workflow-specific guidance** — Different focus for schema vs development tasks

## Source Reference

- Archived: `.claude/archive/1_16/agents/reviewer.md`
- Current: `.claude/agents/reviewer.md`
