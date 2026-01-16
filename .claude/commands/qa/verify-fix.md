---
description: Verify bug is fixed with fresh context
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Verify Bug Fix

You are a **QA agent** verifying that a bug has been fixed. You have fresh context - you haven't seen the fix code.

## Input

- Task ID (e.g., `E06-T020`)

## Process

### 1. Read the Bug Report

Read the task file to understand:
- Original bug description
- Expected behavior
- Root cause analysis (from investigation)
- What was changed (from implementation notes)

### 2. Check Regression Test

Verify a regression test exists and passes:

```bash
# Run all tests
pnpm test

# Check coverage includes the fix
pnpm test:coverage
```

The regression test should:
- [ ] Test the specific scenario that was broken
- [ ] Pass with the fix applied
- [ ] Would fail if the fix is reverted

### 3. Manual Verification

Reproduce the original bug scenario:
- Follow the reproduction steps from the bug report
- Verify the bug no longer occurs
- Check that the expected behavior now works

### 4. Check for Regressions

Verify no new issues were introduced:
- [ ] All existing tests pass
- [ ] Build succeeds (`pnpm build`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Related functionality still works

### 5. Acceptance Criteria

Verify each acceptance criterion from the task:
- [ ] AC1: [Provide evidence]
- [ ] AC2: [Provide evidence]
- [ ] AC3: [Provide evidence]

## Output

Create verification report at `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-verification.md`:

```markdown
# Bug Fix Verification: {TASK-ID}

## Bug Summary

[Original bug description]

## Verification Results

### Regression Test
- **Test file:** [path]
- **Status:** ✅ PASS / ❌ FAIL
- **Notes:** [any observations]

### Manual Verification
- **Bug reproduced:** No (fix works)
- **Expected behavior:** Confirmed
- **Notes:** [any observations]

### Regression Check
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Type check passes
- [ ] Lint passes
- [ ] Related functionality works

### Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | ✅/❌ | [evidence] |
| AC2 | ✅/❌ | [evidence] |

## Verdict

**✅ VERIFIED** / **❌ NOT VERIFIED**

[If not verified, explain what's still broken]

## Notes

[Any additional observations or recommendations]
```

## Update Task Status

**If verified:**
```yaml
workflow_state: "VERIFIED"
```

**If not verified:**
```yaml
workflow_state: "FIXING"  # Back to developer
```

Add to History:
```
| {DATE} | VERIFIED | qa | Bug fix verified - [summary] |
```

Or:
```
| {DATE} | FIXING | qa | Verification failed - [reason] |
```

## Next Step

**If verified:**

Based on the **bugfix** workflow:

Run manual PR creation (human step)

Task is ready for PR review and merge.

**If not verified:**

Run `/developer:implement {task-id}` - Fix needs more work

---

*For hotfix workflows: After verification, remember to create the hotfix-debt follow-up task if steps were skipped.*
