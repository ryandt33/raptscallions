---
description: Perform fresh-eyes code review
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Review Code

Perform a fresh-eyes code review on implemented code.

## Usage

```
/review-code E01-T001
```

## Important

This command starts a **fresh context** - no prior conversation history.
The reviewer sees the code for the first time, simulating real PR review.

## Process

1. Load the reviewer agent: `@reviewer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read all files in `code_files` and `test_files`
5. Run `pnpm test` and `pnpm lint`
6. Create review at `backlog/docs/reviews/{epic}/{task-id}-code-review.md`
7. Update task `workflow_state` to `QA_REVIEW` or `IMPLEMENTING`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
