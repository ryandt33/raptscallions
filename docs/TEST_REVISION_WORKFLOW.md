# Test Revision Workflow

This document explains how the test revision workflow prevents developers from implementing hacks to satisfy bad tests.

## Problem

In TDD, tests are written first, then implementation follows. However, if tests are written with **incorrect assumptions about library APIs**, the developer faces a choice:

1. **BAD**: Hack the implementation to satisfy the bad tests
2. **GOOD**: Reject the tests back to the test writer

Example of the problem:
```typescript
// Test written with incorrect API assumption
it('should have _ property', () => {
  expect(users._).toBeDefined();  // Drizzle tables don't have this!
});

// Developer tempted to hack it
export const users = pgTable('users', { ...columns });
Object.assign(users, { _: {} });  // ❌ Testability hack!
```

## Solution: TESTS_REVISION_NEEDED State

The workflow includes a rejection path that sends bad tests back to the test writer.

## Workflow States

```
APPROVED
  ↓ /write-tests
WRITING_TESTS
  ↓
TESTS_READY
  ↓ /implement
IMPLEMENTING
  ↓
[Developer discovers test-API mismatch]
  ↓
TESTS_REVISION_NEEDED  ← Rejection!
  ↓ /write-tests (again)
WRITING_TESTS
  ↓
TESTS_READY
  ↓ /implement
IMPLEMENTING
  ↓
IMPLEMENTED
```

## How It Works

### Phase 1: Initial Test Writing

1. Developer agent writes tests based on spec
2. Tests compile and run (red phase - fail due to missing implementation)
3. Task moves to `TESTS_READY`

### Phase 2: Implementation Attempt

Developer agent reads tests and **validates them BEFORE implementing**:

1. **Read all test files**
2. **Check if tests use real library APIs**
   - Check library documentation
   - Check type definitions
   - Verify methods/properties exist
3. **If ANY test uses non-existent API:**
   - **STOP IMMEDIATELY**
   - **DO NOT IMPLEMENT**
   - Proceed to rejection process

### Phase 3: Test Rejection (when API mismatch found)

Developer agent rejects bad tests:

1. **Set `workflow_state: TESTS_REVISION_NEEDED`**
2. **Add History entry:**
   ```markdown
   | 2026-01-12 | TESTS_REVISION_NEEDED | developer | Tests expect `users._` property which doesn't exist in Drizzle ORM |
   ```
3. **Add detailed feedback in Reviews section:**
   ```markdown
   ### Test Revision Required (Developer)

   **Problem:** Tests expect `users._` property but Drizzle tables don't have this.

   **Evidence:**
   - Checked drizzle-orm@0.45.1 types - no `_` property
   - Drizzle docs don't mention `_` accessor

   **What actually exists:**
   ```typescript
   // ✓ Available
   users.id, users.email  // Column definitions

   // ✗ Not available
   users._
   ```

   **Suggested approach:**
   Test actual Drizzle APIs instead.
   ```
4. **Exit without implementing**

### Phase 4: Test Revision

Orchestrator sees `TESTS_REVISION_NEEDED` and calls `/write-tests` again:

1. Developer agent reads the task
2. **Reads "Test Revision Required" feedback**
3. Reviews existing test files
4. **Fixes tests** based on feedback:
   - Removes tests for non-existent APIs
   - Rewrites tests using actual library APIs
   - Checks library docs to verify correctness
5. Tests now use real APIs
6. Task returns to `TESTS_READY`

### Phase 5: Successful Implementation

Now that tests use real APIs:

1. Developer reads corrected tests
2. Validates tests use real APIs ✓
3. Implements minimum code to pass tests
4. No hacks or wrappers needed
5. Task moves to `IMPLEMENTED`

## Signs of Test-API Mismatch

Developer should reject tests if:

- Tests expect methods/properties that don't exist in library
- You'd need wrapper code just to make tests pass
- You'd need to expose internal details not required by feature
- "Minimum code to pass" is more than the feature actually needs
- You find yourself using `Object.assign`, custom getters, or tricks

## What Qualifies as a Mismatch

### Valid Rejections

```typescript
// ❌ Test expects non-existent property
expect(users._).toBeDefined();
// Drizzle tables don't have `_` → REJECT

// ❌ Test expects non-existent method
expect(ltree.dataType()).toBe('ltree');
// customType doesn't expose dataType() → REJECT

// ❌ Test expects different signature
await service.getUser('123', { cache: true });
// Method doesn't accept options param → REJECT
```

### Invalid Rejections (don't reject these)

```typescript
// ✅ Test uses actual API correctly
expect(users.id).toBeDefined();
// This exists → Don't reject

// ✅ Test checks correct behavior
await expect(service.getUser('invalid')).rejects.toThrow();
// Testing error handling is valid → Don't reject

// ✅ Test requires implementation detail
expect(result.length).toBe(5);
// You need to return 5 items → Don't reject, implement it
```

## Benefits

### Prevents Testability Hacks

**Without test revision:**
```typescript
// Bad: Implementation polluted with test-only code
export const users = pgTable('users', { ...columns });
Object.assign(users, { _: { /* fake metadata */ } });
```

**With test revision:**
```typescript
// Good: Clean implementation, tests use real API
export const users = pgTable('users', { ...columns });
// Tests check users.id, users.email instead of users._
```

### Maintains Code Quality

- No wrapper abstractions added just for tests
- No exposure of internals not needed by features
- Implementation stays clean and minimal
- Codebase doesn't accumulate unnecessary complexity

### Educates Test Writers

- Feedback explains what the library actually provides
- Test writers learn correct APIs
- Future tests will be more accurate
- Reduces cycle time over multiple tasks

## Configuration

### Orchestrator State Machine

```typescript
const STATE_TRANSITIONS: Record<WorkflowState, WorkflowState | null> = {
  // ...
  TESTS_READY: "IMPLEMENTING",
  TESTS_REVISION_NEEDED: "TESTS_READY",  // Loop back to test writing
  IMPLEMENTING: "IMPLEMENTED",
  // ...
};

const STATE_COMMANDS: Record<WorkflowState, string | null> = {
  // ...
  APPROVED: "write-tests",
  TESTS_READY: "implement",
  TESTS_REVISION_NEEDED: "write-tests",  // Rerun test writing
  // ...
};
```

### Command Files

- `.claude/commands/implement.md` - Includes CRITICAL section about rejecting bad tests
- `.claude/commands/write-tests.md` - Includes revision process and API validation

### Agent Instructions

- `.claude/agents/developer.md` - Detailed rejection process with examples

## Example Scenario

### Scenario: Drizzle Table Tests

**Initial test (wrong):**
```typescript
describe('users table', () => {
  it('should have _ property for metadata', () => {
    expect(users._).toBeDefined();
    expect(users._.name).toBe('users');
  });
});
```

**Developer validation:**
```
1. Read test file
2. Check: Does Drizzle table have `_` property?
3. Check drizzle-orm types: No `_` property found
4. Check Drizzle docs: No mention of `_`
5. Decision: TEST-API MISMATCH → REJECT
```

**Developer rejection:**
```markdown
workflow_state: TESTS_REVISION_NEEDED

History:
| 2026-01-12 | TESTS_REVISION_NEEDED | developer | Tests expect `users._` but Drizzle tables don't have this property |

Reviews:
### Test Revision Required (Developer)

**Problem:** Tests expect `users._` property which doesn't exist.

**Evidence:** Checked drizzle-orm@0.45.1 - no `_` property on tables.

**Suggested approach:** Test column definitions directly:
- `expect(users.id).toBeDefined()`
- `expect(users.email.columnType).toBe('PgVarchar')`
```

**Test revision:**
```typescript
describe('users table', () => {
  it('should have id column', () => {
    expect(users.id).toBeDefined();
  });

  it('should have email column with correct type', () => {
    expect(users.email).toBeDefined();
    expect(users.email.columnType).toBe('PgVarchar');
  });
});
```

**Successful implementation:**
```typescript
// Clean implementation with no hacks
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }),
});
```

## Monitoring

To track test rejections:

```bash
# Find all TESTS_REVISION_NEEDED transitions in history
grep -r "TESTS_REVISION_NEEDED" backlog/tasks/*/

# Count rejections per epic
grep -c "TESTS_REVISION_NEEDED" backlog/tasks/E01/*.md
```

High rejection rates indicate:
- Test writer needs more training on library APIs
- Spec might not be clear about what library provides
- Library documentation might be unclear

## Best Practices

### For Test Writers

1. **Always verify API exists** before writing tests
2. **Check library documentation first**
3. **Read type definitions** to see what's available
4. **Write spike tests** if unsure about API
5. **Accept rejections gracefully** - they improve code quality

### For Implementers

1. **Validate tests BEFORE implementing** - don't write any code first
2. **Be strict about rejections** - better to reject than hack
3. **Provide detailed feedback** - help test writer understand the issue
4. **Suggest correct approach** - don't just say "wrong", show what's right
5. **Check library version** - APIs change between versions

### For Spec Writers

1. **Document library versions** being used
2. **Include API references** in specs
3. **Show example code** using real library APIs
4. **Note any API quirks** or gotchas

## Related Documentation

- [WORKFLOW_COMPLETE.md](WORKFLOW_COMPLETE.md) - Full workflow with all phases
- [CONVENTIONS.md](CONVENTIONS.md) - Testing conventions
- [.claude/agents/developer.md](../.claude/agents/developer.md) - Developer agent instructions
- [.claude/commands/implement.md](../.claude/commands/implement.md) - Implement command
- [.claude/commands/write-tests.md](../.claude/commands/write-tests.md) - Write tests command
