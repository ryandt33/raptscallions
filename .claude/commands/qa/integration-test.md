---
description: Run integration tests against real infrastructure
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Integration Test

> **⚠️ DEPRECATED:** This command is now merged into `/qa`. The QA command
> includes both unit testing and integration testing against Docker infrastructure.
> This standalone command is kept for edge cases requiring integration-only testing.

Run integration tests against real Docker infrastructure to validate the
implementation works in the real environment.

## Usage

```
/integration-test E01-T001
```

## Important

This command runs AFTER `/qa` passes. It verifies that code which passes
unit tests (with mocks) also works against real PostgreSQL and Redis.

## Process

**⚠️ BEFORE STARTING:** Remember you are in READ-ONLY mode. No code changes allowed.

1. Read the task at `backlog/tasks/{epic}/{task-id}.md`
2. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
3. Read the QA report at `backlog/docs/reviews/{epic}/{task-id}-qa-report.md`
4. **Complete Prerequisites Checklist** (see section below)
5. For each acceptance criterion:
   - Construct real HTTP requests (curl, fetch, or similar)
   - Execute against http://localhost:3000
   - Verify expected responses and behavior
6. Stop infrastructure: `pnpm docker:down`
7. Create report at `backlog/docs/reviews/{epic}/{task-id}-integration-report.md`
8. Update task workflow_state:
   - Pass: `DOCS_UPDATE`
   - Fail: `INTEGRATION_FAILED`

## Prerequisites

Before running acceptance criteria tests, complete these setup steps and document
the results in the Prerequisites Checklist section of your report.

### 1. Infrastructure Verification

```bash
# Start infrastructure
pnpm docker:up

# Wait for all services to be healthy
docker compose ps  # All should show "healthy"

# Verify API responds
curl -s http://localhost:3000/health  # Should return 200 OK
```

### 2. Database State

For tests requiring existing data:
- Seed via API calls or direct database commands
- Document any required seed data in the report
- Note: Each test run should be independent - clean up test data after

### 3. Authentication Setup (for protected endpoints)

If the task involves authenticated endpoints, establish a test session:

```bash
# Step 1: Register test user (or use existing)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"integration-test@example.com","name":"Integration Test","password":"TestPass123!"}' \
  -c cookies.txt

# Step 2: Or login if user already exists
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"integration-test@example.com","password":"TestPass123!"}' \
  -c cookies.txt

# Step 3: Use cookie in authenticated requests
curl http://localhost:3000/api/protected-endpoint \
  -b cookies.txt
```

**Cookie Details:**
- Name: `rapt_session`
- Format: Session ID (cryptographic random string)
- Required headers: Automatically sent via `-b cookies.txt`
- Session duration: Short-lived with automatic extension on activity

### 4. Common Prerequisites by Feature Area

| Feature Area | Prerequisites |
|--------------|---------------|
| Public endpoints (health, docs) | Infrastructure only |
| User profile/settings | Auth + test user |
| Admin operations | Auth + admin role user |
| Resource CRUD (tools, sessions) | Auth + seed data as needed |
| Multi-user flows | Multiple test users with different roles |
| Group/class operations | Auth + group hierarchy seed data |

## Integration Test Approach

For each acceptance criterion from the task:

1. **Translate to real requests** - Convert the acceptance criterion into
   actual HTTP requests, database queries, or API calls
2. **Execute against real stack** - Run against Docker services, not mocks
3. **Verify real responses** - Check actual API responses, database state
4. **Document results** - Record what worked and what failed

## Example Integration Tests

For an authentication task with AC "User can register with email/password":

```bash
# Start infrastructure
pnpm docker:up

# Wait for API to be ready
until curl -s http://localhost:3000/health > /dev/null; do sleep 1; done

# Test registration endpoint
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass123!"}'

# Verify response has expected shape
# Check database has user record
# Test login with created credentials

pnpm docker:down
```

## Report Format

Create `backlog/docs/reviews/{epic}/{task-id}-integration-report.md`:

```markdown
# Integration Test Report: {task-id}

## Summary
- **Status:** PASS / FAIL
- **Date:** {date}
- **Infrastructure:** Docker (postgres:16, redis:7, api)

## Prerequisites Checklist

| Step | Status | Details |
|------|--------|---------|
| Docker services healthy | ✅ PASS / ❌ FAIL | postgres, redis, api status |
| Health endpoint responds | ✅ PASS / ❌ FAIL | GET /health → 200 OK |
| Test user created | ✅ PASS / ⏭️ SKIP | user_id: {uuid} (if auth needed) |
| Session cookie obtained | ✅ PASS / ⏭️ SKIP | rapt_session acquired (if auth needed) |
| Seed data created | ✅ PASS / ⏭️ SKIP | Description of seed data (if needed) |

## Test Results

### AC1: [Description]
**Prerequisites:** [e.g., Session cookie required, Seed data: tool record]
**Request:**
```
POST /api/resource
Cookie: rapt_session=...
Content-Type: application/json

{"field": "value"}
```
**Expected:** [What we expected - status code, response shape]
**Actual:** [What happened - actual response]
**Status:** ✅ PASS / ❌ FAIL

### AC2: [Description]
...

## Infrastructure Notes
- Startup time: X seconds
- Any warnings or issues observed

## Conclusion
[Overall assessment - ready for docs or needs investigation]
```

## Critical Constraints: READ-ONLY MODE

**You are operating in VALIDATION MODE ONLY:**

### ✅ ALLOWED Operations:
- Run build commands (`pnpm build`, `pnpm test`, etc.)
- Execute tests and validation scripts
- Query APIs with curl/fetch
- Read files for validation purposes
- Write the integration report ONLY
- Start/stop Docker infrastructure

### ❌ FORBIDDEN Operations:
- Edit ANY code files
- Modify configuration files (package.json, tsconfig, vitepress config, etc.)
- Change build scripts or tooling
- Create new files (except the integration report)
- Fix bugs or issues found during testing
- Attempt workarounds or alternative implementations
- Make "experimental" or "temporary" changes

### When Issues Are Found

**If any test fails or reveals unexpected behavior:**

1. **Document the issue completely** in the integration report:
   - What was expected vs. what actually happened
   - Full error messages and responses
   - Steps to reproduce
   - Impact assessment

2. **Determine if behavior might be expected:**
   - If clearly a bug/failure → Mark as FAIL
   - If ambiguous (e.g., 404s, missing features) → **ASK USER**: "Is this expected behavior or a defect?"

3. **Set workflow_state appropriately:**
   - Clear failure: `INTEGRATION_FAILED`
   - User confirms expected: `DOCS_UPDATE` (document limitation)
   - User confirms defect: `INTEGRATION_FAILED`

4. **STOP immediately** - Do NOT attempt to fix

5. **Recommend next steps:**
   - Create follow-up task for missing features
   - Use `/investigate-failure` for root cause analysis
   - Update spec if requirements were unclear

### Anti-Patterns to Avoid

❌ **"Let me fix that for you"** - Never make unsolicited fixes
❌ **"I'll try approach X"** - No architecture exploration
❌ **"This should work if..."** - No experimental changes
❌ **"Just a small config change"** - No "harmless" edits
❌ **Scope creep** - Stick to validation only

## Failure Handling

If any integration test fails:

1. Document exactly what failed in the report
2. Include full error messages and responses
3. **If behavior is ambiguous, ASK USER** if it's expected
4. Set workflow_state to `INTEGRATION_FAILED` (or `DOCS_UPDATE` if user confirms expected)
5. Recommend next steps (new task, investigation, spec update)
6. **STOP** - The `/investigate-failure` command will analyze root cause

**Do NOT attempt to fix issues** - just document and transition workflow state.

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

**If PASS:**
Run `/update-docs {task-id}` (writer) - Update documentation

**If FAIL:**
Run `/investigate-failure {task-id}` - Analyze root cause of failure

---

*Note: Prefer using `/qa` which includes integration testing. This command is deprecated.*
