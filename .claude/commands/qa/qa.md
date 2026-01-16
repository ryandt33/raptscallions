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

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the task workflow:

**If PASS:**

**Development workflow:**
Run `/writer:update-docs {task-id}` - Update documentation

**Schema workflow:**
Run `/writer:update-docs {task-id}` - Update documentation

**Infrastructure workflow (standard):**
Run `/writer:update-docs {task-id}` - Update documentation

**If FAIL:**
Run `/developer:implement {task-id}` - Address QA issues

---

*QA validation includes both unit and integration testing. After pass, docs are updated before PR.*
