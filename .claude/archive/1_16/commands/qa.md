---
description: Run QA validation against requirements
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# QA Validation

Validate implementation against acceptance criteria.

## Usage

```
/qa E01-T001
```

## Important

This command starts a **fresh context** - no prior conversation history.
QA tests the finished product against requirements, like a real QA tester.

## Process

1. Load the QA agent: `@qa`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md` for acceptance criteria
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read implementation code
5. Run `pnpm test` - all tests must pass
6. Run `pnpm build` - must succeed with no errors
7. Run `pnpm typecheck` - must pass
8. **Runtime validation** (if task involves API/server code):
   - Start the app with `pnpm dev` in background
   - Wait 5-10 seconds for startup
   - Check output for crashes or startup errors
   - Kill the process after validation
9. Verify each acceptance criterion against the code
10. Test edge cases
11. Create report at `backlog/docs/reviews/{epic}/{task-id}-qa-report.md`
12. Update task `workflow_state`:
    - Pass: `INTEGRATION_TESTING` (proceed to real integration tests)
    - Fail: `IMPLEMENTING` (implementation issues found)

## Next Step

After QA passes, the task moves to `INTEGRATION_TESTING` where `/integration-test`
will run the actual app against Docker infrastructure (real PostgreSQL, Redis)
to verify the implementation works in the real environment, not just with mocks.

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
