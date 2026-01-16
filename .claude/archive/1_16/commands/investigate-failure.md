---
description: Investigate integration test failure and determine root cause
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Investigate Failure

Analyze why integration tests failed and determine if the issue is with
the tests (wrong assumptions) or the implementation (runtime bugs).

## Usage

```
/investigate-failure E01-T001
```

## Important

This command runs when a task is in `INTEGRATION_FAILED` state. Your job is
to determine the ROOT CAUSE and route to the appropriate fix path.

## Process

1. Read the integration report at `backlog/docs/reviews/{epic}/{task-id}-integration-report.md`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read the test files listed in task frontmatter (`test_files`)
5. Read the implementation files listed in task frontmatter (`code_files`)
6. Analyze the failure by comparing:
   - What unit tests expected (mocked behavior)
   - What actually happened in the real system
7. Determine root cause category
8. Create failure analysis report
9. Update task workflow_state to appropriate next state

## Root Cause Analysis

### Category 1: Tests Are Wrong → TESTS_REVISION_NEEDED

**Signs that tests have incorrect assumptions:**

- Tests mock an API method that doesn't exist or works differently
- Tests expect response shapes that real implementation can't provide
- Tests assume database behavior that differs from actual PostgreSQL/Drizzle
- Tests mock Redis/session behavior incorrectly
- Mocked dependencies return data structures that real deps don't
- Test setup creates state that can't exist in real system

**Example:**
```typescript
// Test assumes this API exists
mockDb.users.findByEmail("test@example.com")

// But real Drizzle API is:
db.query.users.findFirst({ where: eq(users.email, "test@example.com") })
```

**Action:**
1. Document what tests assumed incorrectly
2. Set workflow_state to `TESTS_REVISION_NEEDED`
3. Add specific guidance for test revision in Reviews section

### Category 2: Implementation Is Wrong → IMPLEMENTING

**Signs that implementation has bugs:**

- Real API throws unexpected runtime errors
- Database constraints violated (foreign keys, unique, not null)
- Missing environment variable handling
- Race conditions or timing issues
- Incorrect error handling
- Type coercion issues at runtime
- Tests correctly describe expected behavior, code doesn't deliver

**Example:**
```typescript
// Test correctly expects user creation
expect(response.status).toBe(201)
expect(response.body.user.id).toBeDefined()

// But implementation throws because it forgot to await
const user = db.insert(users).values(data) // Missing await!
```

**Action:**
1. Document the implementation bugs found
2. Set workflow_state to `IMPLEMENTING`
3. Add specific fix guidance in Reviews section

## Decision Framework

Ask yourself:

1. "If we rewrote the tests to match reality, would the feature work?"
   - YES → Tests are wrong → `TESTS_REVISION_NEEDED`
   - NO → Implementation is wrong → `IMPLEMENTING`

2. "Are the test expectations reasonable based on the spec?"
   - YES, but code doesn't meet them → `IMPLEMENTING`
   - NO, tests expect impossible things → `TESTS_REVISION_NEEDED`

3. "Is the real system behaving correctly per the spec?"
   - YES, tests just expected wrong behavior → `TESTS_REVISION_NEEDED`
   - NO, system has bugs → `IMPLEMENTING`

## Report Format

Create/update `backlog/docs/reviews/{epic}/{task-id}-failure-analysis.md`:

```markdown
# Integration Failure Analysis: {task-id}

## Summary
[One sentence: what failed and why]

## Root Cause
**Category:** Tests / Implementation

## Evidence

### What Tests Expected
[Describe what the unit tests assumed would happen]

### What Actually Happened
[Describe the real behavior observed in integration tests]

### Key Discrepancy
[The core mismatch between expectations and reality]

## Resolution Path
**Next State:** TESTS_REVISION_NEEDED / IMPLEMENTING

### Required Changes

#### If TESTS_REVISION_NEEDED:
1. [Specific test file and what to change]
2. [Mock that needs to match real API]
3. [Expected behavior to update]

#### If IMPLEMENTING:
1. [Specific code file and bug to fix]
2. [Missing handling to add]
3. [Correct behavior to implement]

## Additional Notes
[Any other context that will help the next agent]
```

## Updating Task State

After analysis, update the task file:

1. Set `workflow_state` to either `TESTS_REVISION_NEEDED` or `IMPLEMENTING`
2. Add entry to History table
3. Add notes to Reviews section with your analysis summary

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
