---
description: Review implementation spec for UX concerns
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Review UX

Review an implementation spec for user experience concerns before architecture review.

## Usage

```
/review-ux E01-T001
```

## Process

1. Load the designer agent: `@designer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md` for acceptance criteria
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Review for UX concerns (user flow, accessibility, consistency)
5. Append UX review to spec file
6. Update task `workflow_state` to `PLAN_REVIEW` (continues to architect) or back to `ANALYZING`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the **development** workflow (frontend):

**If APPROVED:**
Run `/developer:write-tests {task-id}` - Write tests (TDD red phase)

**If NEEDS_REVISION:**
Run `/analyst:analyze {task-id}` - Revise analysis based on UX feedback

---

*UX review happens before implementation begins to catch usability issues early.*
