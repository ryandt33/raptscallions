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

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
