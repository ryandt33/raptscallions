---
description: Review implemented UI for design quality and accessibility
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Review UI

Review implemented UI components for design system compliance, accessibility, and quality.

## Usage

```
/review-ui E01-T001
```

## Process

1. Load the designer agent: `@designer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read the component code listed in `code_files`
5. Review for UI quality (visual consistency, accessibility, responsiveness)
6. Create UI review file at `backlog/docs/reviews/{epic}/{task-id}-ui-review.md`
7. Update task `workflow_state` to `CODE_REVIEW` (continues to code review) or back to `IMPLEMENTING`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the **development** workflow (frontend):

**If APPROVED:**
Run `/reviewer:review-code {task-id}` - Fresh-eyes code review

**If NEEDS_REVISION:**
Run `/developer:implement {task-id}` - Address UI review feedback

---

*UI review checks design system compliance after implementation, before code review.*
