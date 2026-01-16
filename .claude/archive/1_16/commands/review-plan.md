---
description: Review implementation plan as architect
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Review Plan

Review an implementation spec for architectural fit.

## Usage

```
/review-plan E01-T001
```

## Process

1. Load the architect agent: `@architect`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`
5. Review against architecture checklist
6. Append review to spec file
7. Update task `workflow_state` to `APPROVED` or back to `ANALYZING`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
