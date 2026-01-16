---
title: Designer (Archived)
description: Historical designer agent for UX/UI review
source_synced_at: 2026-01-16
---

# Designer (Archived)

::: warning Archived
This agent definition was archived on 2026-01-16. See `.claude/agents/designer.md` for the current version.
:::

## Role

The archived designer agent ensured the product was usable, accessible, and consistent. The designer performed two types of reviews:

- **UX Review** (spec stage) — Reviewed specs for user experience concerns
- **UI Review** (implementation stage) — Reviewed implemented UI for quality

## Key Differences from Current

| Aspect | Archived | Current |
|--------|----------|---------|
| **Design guide command** | Not available | Added `/align-design` command |
| **Task type handling** | Basic skip logic | Explicit `task_type` check with `NOT_APPLICABLE` verdict |

## What Remained Similar

The core designer responsibilities remained largely unchanged:

### UX Review Checklist
- User flow analysis
- Information architecture
- Accessibility planning
- Consistency with existing patterns

### UI Review Checklist
- Visual consistency (shadcn/ui, Tailwind)
- Component quality (states, error handling)
- Accessibility (semantic HTML, ARIA, keyboard nav)
- Responsive design
- Interactions and feedback

### Verdict Options
- `APPROVED` — Ready to proceed
- `NEEDS_UX_CHANGES` / `NEEDS_UI_CHANGES` — Issues to fix
- `NOT_APPLICABLE` — Backend-only task

## Minor Changes

The current designer agent adds:

1. **`/align-design` command** — Reviews/creates design guides for UI alignment
2. **Explicit task type check** — First step is always checking `task_type` field
3. **Re-review process** — Distinct process for re-reviews vs initial reviews

## Source Reference

- Archived: `.claude/archive/1_16/agents/designer.md`
- Current: `.claude/agents/designer.md`
