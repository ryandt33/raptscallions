---
title: Designer Commands
description: Commands for UX and UI review
source_synced_at: 2026-01-16
---

# Designer Commands

Commands that invoke the [Designer Agent](/ai-development/agents/current/designer) for UX and UI review.

## Overview

Designer commands handle user experience review (at spec stage) and user interface review (after implementation). These commands only apply to tasks with `frontend` label or `task_type: "frontend"/"fullstack"`.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/review-ux` | UX review of spec before development | development (frontend) |
| `/review-ui` | UI review of implementation | development (frontend) |
| `/align-design` | Review design guides for UI alignment | development (frontend) |

---

## `/review-ux`

UX review of spec before development begins.

### Purpose

Review specs for user experience concerns:
- User flow clarity and efficiency
- Information architecture
- Accessibility planning
- Consistency with existing patterns

### Invocation

```bash
/review-ux E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must have `frontend` label or `task_type: "frontend"/"fullstack"`
- Spec must exist

### NOT_APPLICABLE Handling

If `task_type: "backend"` or spec has no UI components:
- Returns `NOT_APPLICABLE` verdict
- Task continues to architect review

### Process

1. Check task_type — skip if backend
2. Read task file for user-facing ACs
3. Read spec
4. Review for UX concerns
5. Add UX notes to spec

### Output

UX Review section added to spec:

```markdown
## UX Review

**Reviewer:** designer
**Date:** {DATE}
**Verdict:** APPROVED | NEEDS_UX_CHANGES | NOT_APPLICABLE

### User Flow Analysis
[Assessment of user journey]

### Accessibility Notes
[A11y requirements]

### Interaction Patterns
[How components should behave]

### Concerns
[Any UX issues]
```

### Next Step

**If APPROVED/NOT_APPLICABLE:**
Run `/write-tests {task-id}` (developer)

**If NEEDS_UX_CHANGES:**
Run `/analyze {task-id}` (analyst) — Revise based on feedback

### Source Reference

`.claude/commands/designer/review-ux.md`

---

## `/review-ui`

UI review of implementation quality.

### Purpose

Review implemented UI for:
- shadcn/ui component usage
- Tailwind conventions
- Accessibility compliance
- Responsive design
- Interaction patterns

### Invocation

```bash
/review-ui E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `IMPLEMENTED` state
- Must have `.tsx` files in `code_files`

### NOT_APPLICABLE Handling

If `task_type: "backend"` or no `.tsx` files:
- Returns `NOT_APPLICABLE` verdict
- Task continues to code review

### Re-Review Handling

If UI review file already exists:
- Focus only on previously identified issues
- Update existing report (don't create new)

### Process

1. Check task_type — skip if backend
2. Check for existing review (re-review vs. initial)
3. Read component code
4. Check design system compliance
5. Review accessibility
6. Create/update UI review report

### Output

UI review at `backlog/docs/reviews/{epic}/{task-id}-ui-review.md`:

```markdown
# UI Review: {TASK-ID}

**Verdict:** APPROVED | NEEDS_UI_CHANGES | NOT_APPLICABLE

## Checklist Results
- ✅ Visual Consistency
- ✅ Component Quality
- ⚠️ Accessibility - [concern]
- ✅ Responsive Design

## Issues

### 🔴 Must Fix (Blocking)
1. **File: `path/to/component.tsx`**
   Issue: Missing keyboard navigation

### 🟡 Should Fix (Non-blocking)
1. **File: `path/to/component.tsx`**
   Issue: Loading state could be smoother
```

### Next Step

**If APPROVED/NOT_APPLICABLE:**
Run `/review-code {task-id}` (reviewer)

**If NEEDS_UI_CHANGES:**
Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/designer/review-ui.md`

---

## `/align-design`

Review design guides for UI alignment and theming.

### Purpose

Review and potentially create design guides to ensure UI consistency across the application.

### Invocation

```bash
/align-design E01-T001
```

### Process

1. Review existing design system docs
2. Check component theming consistency
3. Identify alignment issues
4. Create/update design guides if needed

### Source Reference

`.claude/commands/designer/align-design.md`

---

## Related Commands

- [Architect Commands](/ai-development/commands/architect) — Receives UX-reviewed specs
- [Developer Commands](/ai-development/commands/developer) — Implements UI that designer reviews
- [Reviewer Commands](/ai-development/commands/reviewer) — Reviews code after UI review
