---
description: Implement code to pass tests (TDD green phase)
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Implement

Write implementation code to pass the tests (TDD green phase).

## Usage

```
/implement E01-T001
```

## Process

1. Load the developer agent: `@developer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read existing test files
5. Write implementation code
6. Run `pnpm test` - all tests must pass
7. Run `pnpm lint` - must pass
8. Run `pnpm typecheck` - must pass
9. Update task `workflow_state` to `IMPLEMENTED`
10. Update `code_files` in task frontmatter

## CRITICAL: Test-API Mismatch Detection

⚠️ **If you discover that tests were written with incorrect assumptions about a library's actual API:**

**DO NOT:**
- Hack the implementation to satisfy bad tests
- Add wrapper code just to make tests pass
- Expose internal details that wouldn't otherwise be needed
- Write `Object.assign` tricks or other test-only methods

**INSTEAD:**
1. Set `workflow_state: TESTS_REVISION_NEEDED`
2. Document the mismatch in History table
3. Add detailed feedback in Reviews section explaining:
   - What the test expected
   - What the library actually provides
   - Suggested test approach
4. DO NOT implement anything

**Signs of a test-API mismatch:**
- You're adding code just to satisfy test expectations, not feature requirements
- You're creating wrappers around library APIs
- The "minimum code to pass" is more than the actual feature needs
- Library documentation doesn't match what tests expect

**Example:**
```
Tests expect `users._` property but Drizzle tables don't have this.
→ Set workflow_state to TESTS_REVISION_NEEDED
→ Explain in Reviews section what Drizzle actually provides
→ Tests will be rewritten to use correct API
```

This ensures clean code without "testability hacks."

## CRITICAL: Test Coherence Issues

⚠️ **Tests can be technically valid (use real APIs, compile correctly) but still be fundamentally flawed.**

Reject tests that are internally contradictory or don't reflect the spec. Do NOT contort your implementation to satisfy poorly designed tests.

### When to Reject for Coherence Issues

**1. Internally Contradictory Tests**

Different test cases have mutually exclusive expectations that can only be satisfied by bizarre conditional logic.

**Signs:**
- You're adding conditions like `if (A && B && !C)` that have no basis in requirements
- Test case 1 passes without X, but test case 4 fails without X under slightly different conditions
- You can't explain WHY the logic works, only that it makes tests pass

**Example of bad implementation forced by contradictory tests:**
```typescript
// ❌ This logic exists only to satisfy contradictory tests
// Why these three conditions together? No spec justification.
if (hasFetchDepth && hasTimeout && !stalenessStep) {
  errors.push('Missing artifact');
}
```

**2. Tests That Don't Reflect the Spec**

Tests encode requirements that don't exist in the acceptance criteria, or contradict them.

**Signs:**
- You're implementing behavior not mentioned in any AC
- The spec says "always require X" but tests only require X in specific scenarios
- You can't trace test assertions back to spec requirements

**3. Tests Written Incrementally Without Reconciliation**

Later tests were added without checking if they conflict with earlier tests.

**Signs:**
- Early tests pass with minimal config
- Later tests add requirements that early tests don't have
- No test covers the "full happy path" that satisfies all requirements

### The Rejection Rule

**If you find yourself writing logic that:**
1. You cannot justify from the spec
2. You cannot explain without saying "because the tests expect it"
3. Creates coupling between unrelated concerns
4. Would fail code review for being "magic" or "unexplainable"

**→ Reject the tests. Do NOT implement.**

### Rejection Process

1. Set `workflow_state: TESTS_REVISION_NEEDED`
2. Add History entry explaining the coherence issues
3. Add detailed feedback in Reviews section:
   - Which specific tests contradict each other (with line numbers)
   - What the spec actually requires
   - What clean implementation would look like
   - Request that tests be reconciled before implementation continues

**Example feedback:**
```markdown
### Test Revision Required (Developer)

**Date:** 2026-01-14
**Reason:** Test Coherence Issues

**Problem:**
Tests are internally contradictory. Cannot implement clean logic that satisfies all tests.

**Contradictions:**
- Test at line 19-43: Workflow WITHOUT fetch-depth → expects valid: true
- Test at line 63-85: Workflow WITHOUT fetch-depth → expects error about fetch-depth
- Test at line 411-439: Workflow WITH fetch-depth + timeout → expects artifact error

**Spec says (AC8):** "Build artifacts available for preview" - implies always required.

**What I'd have to implement:**
```typescript
// Bizarre coupling with no spec basis
if (hasFetchDepth && hasTimeout && !stalenessStep && !artifactStep) {
  errors.push('Missing artifact');
}
```

**What clean implementation would be:**
```typescript
// Simple, matches AC8
if (!artifactStep) {
  errors.push('Missing artifact upload step');
}
```

**Request:** Please reconcile test cases so requirements are consistent. Either artifact is always required (per AC8) or clarify when it's optional.
```

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the task workflow:

**Development workflow:**
- If task has `frontend` label: Run `/review-ui {task-id}` (designer)
- Otherwise: Run `/review-code {task-id}` (reviewer)

**Schema workflow:**
Run `/review-migration {task-id}` (reviewer) - Migration safety review

**Infrastructure workflow (standard):**
Run `/review-code {task-id}` (reviewer) - Code review

**Infrastructure workflow (simple - `infra:simple`):**
Run `/update-docs {task-id}` (writer) - Update documentation

**Bugfix workflow (standard):**
Run `/review-code {task-id}` (reviewer) - Code review

**Bugfix workflow (simple - `bugfix:simple`):**
Run `/verify-fix {task-id}` (qa) - Verify bug is fixed

**Bugfix workflow (hotfix - `bugfix:hotfix`):**
Run `/write-tests {task-id}` (developer) - Write regression test (after fix)

---

*Implementation varies by workflow. Check task's workflow category and variant.*
