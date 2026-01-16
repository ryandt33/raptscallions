---
description: Write tests for an approved task (TDD red phase)
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Write Tests

Write tests for an approved task (TDD red phase - tests should fail initially).

## Usage

```
/write-tests E01-T001
```

## Process

### Initial Test Writing (APPROVED → TESTS_READY)

1. Load the developer agent: `@developer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read `docs/CONVENTIONS.md` for test patterns
5. Write test files according to the spec's Test Strategy
6. **CRITICAL**: Verify tests use correct library APIs (check docs/types)
7. Run `pnpm typecheck` - tests must compile with zero TypeScript errors
8. Run `pnpm lint` - must pass
9. Run `pnpm test` to verify tests fail (red phase - tests fail due to missing implementation, NOT type errors)
10. Update task `workflow_state` to `TESTS_READY`
11. Update `test_files` in task frontmatter

### Test Revision (TESTS_REVISION_NEEDED → TESTS_READY)

If the task is in `TESTS_REVISION_NEEDED` state (developer rejected tests):

1. Load the developer agent: `@developer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. **Read the "Test Revision Required" feedback in Reviews section** - this explains what's wrong
4. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
5. **Review existing test files** to understand what needs fixing
6. **Fix the tests** based on developer feedback:
   - Use actual library APIs (not imagined ones)
   - Remove tests for non-existent methods/properties
   - Rewrite tests to match library's real behavior
7. Run `pnpm typecheck` - must pass
8. Run `pnpm lint` - must pass
9. Run `pnpm test` to verify tests fail correctly (implementation still missing)
10. Update task `workflow_state` to `TESTS_READY`
11. Add History entry noting tests were revised

## CRITICAL: Use Real Library APIs

⚠️ **Tests must use actual, documented library APIs - not imagined ones.**

Before writing tests:
1. Check library documentation
2. Check library type definitions (`node_modules/{library}/dist/*.d.ts`)
3. Check library examples/repos
4. If unsure, write a quick spike to verify API exists

**Bad test example:**
```typescript
// ❌ Assumes API that doesn't exist
expect(users._).toBeDefined();  // Drizzle tables don't have `_` property
expect(ltree.dataType()).toBe('ltree');  // customType doesn't have this method
```

**Good test example:**
```typescript
// ✅ Tests actual Drizzle API
expect(users.id).toBeDefined();
expect(users.email.columnType).toBe('PgVarchar');
```

If you write tests with incorrect API assumptions, the implementer will reject them back to you with `TESTS_REVISION_NEEDED`.

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the task workflow:

**Development workflow:**
Run `/implement {task-id}` (developer) - Write implementation to pass tests

**Infrastructure workflow (standard):**
Run `/implement {task-id}` (developer) - Implement scripts/config

**Bugfix workflow (standard):**
Run `/implement {task-id}` (developer) - Implement the fix

---

*Tests are written first (TDD red phase). Implementation follows to make them pass.*
