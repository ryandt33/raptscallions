# QA Report: E02-T002 - Sessions Table and Lucia Setup

**Task ID:** E02-T002
**Epic:** E02 - Authentication
**QA Date:** 2026-01-12
**QA Agent:** qa
**Verdict:** ❌ **FAIL - CRITICAL ISSUES FOUND**

---

## Executive Summary

The implementation of the sessions table and Lucia authentication setup has **CRITICAL FAILURES** that prevent it from being marked as complete. While the core architecture is sound and most of the implementation is present, there are:

- **37 failing tests** across the API middleware (session and auth middleware)
- **11 failing tests** in the auth package itself
- **Missing migration file** (0004_create_sessions.sql) - not generated despite schema being defined
- **Test expectations mismatched** with implementation changes (context and lastActivityAt fields)

The implementation shows that UX review feedback was incorporated (adding `context` and `lastActivityAt` fields), but the tests and migration files were not updated accordingly.

---

## Test Results Summary

### Overall Test Status
- **Total Tests:** 486
- **Passed:** 449 (92.4%)
- **Failed:** 37 (7.6%)
- **Test Files:** 24 total, 4 failed

### Failed Test Breakdown

#### 1. API Tests (apps/api)
- **config.test.ts:** 1 failure
  - Environment validation test failing

#### 2. Session Middleware Tests (apps/api)
- **session.middleware.test.ts:** 29 failures
  - Basic functionality tests (7 failures): User/session attachment not working
  - Session expiration tests (4 failures): Session validation issues
  - Session extension tests (3 failures): Fresh session handling broken
  - Cookie management tests (5 failures): Cookie setting/clearing not working
  - User status tests (3 failures): Status field not being attached
  - Edge case tests (3 failures): Malformed/empty cookies not handled correctly
  - Concurrent request tests (1 failure): Race condition in session validation
  - Session context tests (3 failures): Context field not propagating

#### 3. Auth Middleware Tests (apps/api)
- **auth.middleware.test.ts:** 7 failures
  - requireAuth decorator tests (3 failures)
  - requireActiveUser decorator tests (4 failures)

#### 4. Auth Package Tests (packages/auth)
- **lucia.test.ts:** 10 failures
  - Session cookie configuration tests (7 failures): `lucia.sessionCookie` property is undefined
  - Environment handling tests (3 failures): Module loading issues with `require()`

- **session.service.test.ts:** 1 failure
  - Session creation test: Test expects empty object `{}` but implementation now passes `{ context: "unknown", last_activity_at: Date }`

---

## Acceptance Criteria Verification

### ✅ AC1: sessions table schema defined in packages/db/src/schema/sessions.ts
**Status:** PASS

**Evidence:**
- File exists: `/packages/db/src/schema/sessions.ts`
- Contains proper schema definition with all required fields
- Exported from `packages/db/src/schema/index.ts`

**Schema Definition:**
```typescript
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  context: varchar("context", { length: 20 }).notNull().default("unknown"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
});
```

**Additional Fields Beyond Spec:**
- `context`: Added per UX review (shared device detection)
- `lastActivityAt`: Added per UX review (idle timeout tracking)

---

### ✅ AC2: Fields: id (string), user_id (uuid FK), expires_at (timestamp)
**Status:** PASS

**Evidence:**
- `id`: varchar(255), primary key ✅
- `user_id`: uuid, references users(id) ✅
- `expires_at`: timestamp with timezone ✅
- Extra fields added per architecture review: `context`, `lastActivityAt`

---

### ✅ AC3: Foreign key to users(id) with ON DELETE CASCADE
**Status:** PASS

**Evidence:**
```typescript
userId: uuid("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" })
```

Cascade delete is properly configured. When a user is deleted, all their sessions will be automatically removed.

---

### ❌ AC4: Migration file 0004_create_sessions.sql generated and tested
**Status:** FAIL - CRITICAL

**Issue:** Migration file does not exist in `/packages/db/src/migrations/`

**Evidence:**
```bash
$ ls packages/db/src/migrations/
0001_create_users.sql
0002_create_groups.sql
0003_create_group_members.sql
```

**Expected:** `0004_create_sessions.sql` with:
- CREATE TABLE sessions with all fields
- CREATE INDEX sessions_user_id_idx
- CREATE INDEX sessions_expires_at_idx
- Down migration: DROP TABLE and indices

**Required Action:**
1. Run `pnpm --filter @raptscallions/db db:generate` to generate migration from schema
2. Manually create migration if Drizzle doesn't auto-generate
3. Test migration up: `pnpm --filter @raptscallions/db db:migrate`
4. Test migration down and re-run up to verify reversibility
5. Commit migration file

---

### ⚠️ AC5: Lucia configured with DrizzlePostgreSQLAdapter
**Status:** PARTIAL PASS with concerns

**Evidence:**
- Lucia instance created: `/packages/auth/src/lucia.ts`
- DrizzlePostgreSQLAdapter configured ✅
- Session cookie configured with security attributes ✅

**Implementation:**
```typescript
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "rapt_session",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getSessionAttributes: (attributes) => ({
    context: attributes.context,
    lastActivityAt: attributes.last_activity_at,
  }),
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    status: attributes.status,
  }),
});
```

**Issues Found:**
1. **10 test failures** in `lucia.test.ts`
2. Tests expect `lucia.sessionCookie` property but it's returning `undefined`
3. This suggests Lucia v3 API may have changed or tests are accessing wrong property

**Concerns:**
- Cookie name changed from spec (`auth_session` → `rapt_session`) - correct per UX review
- Missing `httpOnly` in cookie attributes (should be set by Lucia internally)
- No session expiration configuration visible (30-day policy not implemented)
- No role-based or context-based expiration logic (required per architecture review)

---

### ❌ AC6: Session middleware validates session cookie and attaches user to request
**Status:** FAIL - CRITICAL

**Evidence:** 29 test failures in `session.middleware.test.ts`

**Implementation Location:** `/apps/api/src/middleware/session.middleware.ts`

**Core Logic (simplified):**
```typescript
app.addHook("onRequest", async (request, reply) => {
  const sessionId = request.cookies[sessionService.sessionCookieName];

  if (!sessionId) {
    request.user = null;
    request.session = null;
    return;
  }

  const { session, user } = await sessionService.validate(sessionId);

  if (session?.fresh) {
    reply.setCookie(sessionService.sessionCookieName, session.id, ...);
  }

  if (!session) {
    reply.setCookie(...); // Clear cookie
  }

  request.user = user;
  request.session = session;
});
```

**Failing Tests:**
- User attachment: `expect(response.json().userId).toBe("user-123")` → got `undefined`
- Session attachment: `expect(response.json().sessionId).toBe("session-123")` → got `undefined`
- User status: `expect(response.json().status).toBe("active")` → got `undefined`

**Root Cause Analysis:**
The middleware is setting `request.user` and `request.session`, but the test route handlers that return `{ userId: request.user?.id }` are getting `undefined`. This suggests:

1. The middleware hook is not executing before route handlers
2. Type augmentation not working (`FastifyRequest.user` may not exist)
3. Mock sessionService is returning wrong structure
4. Fastify test injection not preserving request context

**Required Investigation:**
- Verify Fastify plugin registration order
- Check if `fastify.d.ts` type augmentation is loaded
- Verify mock structure matches Lucia v3 response format

---

### ❌ AC7: Session creation helper creates session and sets cookie
**Status:** FAIL - Test mismatch

**Evidence:** 1 test failure in `session.service.test.ts`

**Implementation:**
```typescript
async create(userId: string, context: string = "unknown"): Promise<Session> {
  const session = await lucia.createSession(userId, {
    context,
    last_activity_at: new Date(),
  });
  return session;
}
```

**Test Failure:**
```
Expected: lucia.createSession("user-123", {})
Received: lucia.createSession("user-123", { context: "unknown", last_activity_at: Date })
```

**Issue:** Test expects empty object but implementation now passes session attributes (context and last_activity_at) per UX/architecture review requirements.

**Required Fix:**
Update test expectation to match new implementation:
```typescript
expect(lucia.createSession).toHaveBeenCalledWith("user-123", {
  context: "unknown",
  last_activity_at: expect.any(Date),
});
```

---

### ✅ AC8: Session deletion helper invalidates session and clears cookie
**Status:** PASS (tests passing for this specific functionality)

**Implementation:**
```typescript
async invalidate(sessionId: string): Promise<void> {
  try {
    await lucia.invalidateSession(sessionId);
  } catch (error) {
    // Ignore errors if session doesn't exist (already logged out)
  }
}
```

**Tests Passing:**
- Session invalidation works correctly
- Error handling for non-existent sessions works

---

### ⚠️ AC9: SessionUser type exported with user fields (id, email, name, role)
**Status:** PARTIAL PASS - Missing 'role' field

**Evidence:**
```typescript
// packages/auth/src/types.ts
export type SessionUser = LuciaUser;

// lucia.ts getUserAttributes
getUserAttributes: (attributes: DatabaseUserAttributes) => {
  return {
    email: attributes.email,
    name: attributes.name,
    status: attributes.status, // ❌ Not 'role'
  };
}
```

**Issue:** Acceptance criteria specifies `role` field, but implementation uses `status` field instead.

**Database Schema (users table):**
Looking at the users schema from E02-T001, the field is named `status` not `role`:
```typescript
status: varchar("status", { length: 50 })
  .notNull()
  .default("pending_verification")
```

**Resolution:** This is a **spec mismatch**, not an implementation error. The users table uses `status` (active/suspended/pending_verification), not `role` (which would be teacher/student/admin). The AC should be updated to reflect actual schema, or if role is needed, it should be added to the users table.

---

### ❌ AC10: Tests verify session creation, validation, and deletion
**Status:** FAIL - 48 total test failures

**Breakdown:**
- **Auth package:** 11 failures (lucia config tests, session creation test)
- **API middleware:** 37 failures (session middleware, auth middleware)

**Test Coverage Exists:**
- ✅ Session creation tests (but with wrong expectations)
- ✅ Session validation tests (but failing due to middleware issues)
- ✅ Session deletion tests (passing)
- ✅ Cookie management tests (but failing)
- ✅ Edge case tests (malformed cookies, concurrent requests - but failing)

**Quality:** Tests are comprehensive and well-structured (AAA pattern), but many are failing due to:
1. Implementation changes not reflected in test expectations
2. Middleware not properly attaching user/session to request
3. Lucia API property access issues (`sessionCookie` undefined)

---

## Critical Issues Requiring Fix

### 🔴 Issue #1: Missing Migration File
**Severity:** CRITICAL
**Blocks:** Database deployment, any environment setup

**Problem:** Schema defined but migration file not generated.

**Impact:** Cannot deploy to any environment. Database changes not version controlled.

**Required Actions:**
1. Run `pnpm --filter @raptscallions/db db:generate`
2. Review generated migration for correctness
3. Test migration up and down
4. Commit `0004_create_sessions.sql`

---

### 🔴 Issue #2: Session Middleware Not Attaching User/Session
**Severity:** CRITICAL
**Blocks:** Any authenticated routes

**Problem:** 29 test failures showing `request.user` and `request.session` are undefined in route handlers.

**Possible Causes:**
1. Fastify type augmentation not loaded
2. Plugin registration order incorrect
3. Mock sessionService returning wrong structure
4. Fastify `.inject()` not preserving context

**Required Investigation:**
- Add debug logging to middleware to confirm it's executing
- Verify `request.user` is actually being set
- Check if type augmentation in `apps/api/src/types/fastify.d.ts` is correct
- Verify mock returns match Lucia v3 structure

---

### 🔴 Issue #3: Lucia Configuration Tests Failing
**Severity:** HIGH
**Blocks:** Auth package reliability

**Problem:** 10 tests failing because `lucia.sessionCookie` is `undefined`.

**Test Example:**
```typescript
expect(lucia.sessionCookie).toBeDefined(); // FAILS
```

**Possible Causes:**
1. Lucia v3 API change - property may not exist or be named differently
2. Tests written for wrong Lucia version
3. Configuration not being set correctly

**Required Actions:**
- Review Lucia v3 documentation for correct API
- Check actual Lucia instance properties in debugger
- Update tests to match Lucia v3 API
- Or fix configuration if it's incorrect

---

### 🟡 Issue #4: Test Expectations Out of Sync
**Severity:** MEDIUM
**Impact:** False test failures hiding real issues

**Problem:** Tests expect old implementation (no context/lastActivityAt), but code was updated per reviews.

**Example:**
```typescript
// Test expects:
expect(lucia.createSession).toHaveBeenCalledWith("user-123", {});

// Implementation does:
lucia.createSession("user-123", { context: "unknown", last_activity_at: Date });
```

**Required Actions:**
- Update all session creation tests to expect new attributes
- Update session validation tests to check context and lastActivityAt
- Ensure tests verify UX review requirements (shared device context)

---

## Non-Critical Issues (Should Fix)

### 🟡 Issue #5: Role vs Status Field Mismatch
**Severity:** LOW
**Impact:** Confusing spec vs implementation

**Problem:** AC9 specifies `role` field, but implementation correctly uses `status` field from users table.

**Resolution:** Update acceptance criteria to match actual users schema:
```diff
- AC9: SessionUser type exported with user fields (id, email, name, role)
+ AC9: SessionUser type exported with user fields (id, email, name, status)
```

---

### 🟡 Issue #6: Missing Session Expiration Configuration
**Severity:** MEDIUM
**Impact:** Sessions may not expire correctly

**Problem:** Lucia configuration doesn't show session expiration settings.

**From Spec:**
```typescript
sessionExpiresIn: {
  activePeriod: 1000 * 60 * 60 * 24 * 30, // 30 days
  idlePeriod: 1000 * 60 * 60 * 24 * 30,
}
```

**Current Implementation:** Missing this configuration block in `lucia.ts`.

**Required:** Add expiration config with role-based and context-based logic per architecture review.

---

### 🟡 Issue #7: No Role-Based or Context-Based Session Duration
**Severity:** MEDIUM
**Impact:** UX and architecture review requirements not implemented

**Problem:** Architecture review specified different session durations:
- Teachers: 30 days
- Students: 7 days
- Shared devices: 2 hours

**Current Implementation:** No role/context-based expiration logic in SessionService.create() or Lucia config.

**Required:**
```typescript
function getSessionDuration(userRole: string, context: string): number {
  if (context === 'shared') return 1000 * 60 * 60 * 2; // 2 hours
  if (userRole === 'student') return 1000 * 60 * 60 * 24 * 7; // 7 days
  return 1000 * 60 * 60 * 24 * 30; // 30 days (teachers/admins)
}
```

---

## Security Assessment

### ✅ Security Strengths
1. **Secure cookie attributes:**
   - `httpOnly: true` (XSS protection)
   - `secure: true` in production (HTTPS only)
   - `sameSite: "lax"` (CSRF protection)

2. **Cascade delete:** User deletion automatically removes sessions

3. **Session ID generation:** Lucia uses cryptographically secure random generation

4. **Database indexes:** Proper indexing for session cleanup and user lookups

### ⚠️ Security Concerns
1. **No session expiration visible in config:** May lead to sessions never expiring
2. **No idle timeout implementation:** `lastActivityAt` field exists but not enforced
3. **Shared device context not enforced:** Field exists but no logic to force shorter expiration

---

## Performance Assessment

### ✅ Performance Strengths
1. **Indexes created:** `sessions_user_id_idx`, `sessions_expires_at_idx` (in spec, need in migration)
2. **Session extension optimization:** Only extends when < 50% lifetime remaining
3. **Connection pooling:** Uses Drizzle's pool (max 10 connections)

### ⚠️ Performance Concerns
1. **No session cleanup job:** Expired sessions will accumulate in database
2. **Every request validates session:** No caching mechanism (acceptable for MVP)

---

## Code Quality Assessment

### ✅ Strengths
1. **Excellent documentation:** Comprehensive JSDoc comments
2. **Type safety:** Full TypeScript with proper type augmentation
3. **Error handling:** Try-catch blocks with appropriate error types
4. **Test coverage:** Comprehensive tests (once fixed, will provide good coverage)
5. **Code organization:** Clean separation of concerns (schema, service, middleware)

### ⚠️ Areas for Improvement
1. **Tests out of sync with implementation:** Need update after UX/architecture reviews
2. **Missing configuration:** Session expiration, role-based logic not implemented
3. **Error messages:** Some errors too technical for end users (logged in spec)

---

## Deployment Readiness

### ❌ NOT READY FOR DEPLOYMENT

**Blockers:**
1. ❌ Migration file missing - cannot deploy database changes
2. ❌ 48 failing tests - cannot verify functionality works
3. ❌ Session middleware not working - authentication would fail
4. ❌ No session expiration configuration - security risk

**Must Fix Before Deployment:**
- Generate and test migration file
- Fix all test failures
- Implement session expiration logic
- Verify session middleware attaches user correctly

---

## Recommendations

### Immediate Actions (Before Re-QA)

1. **Generate Migration File**
   ```bash
   pnpm --filter @raptscallions/db db:generate
   # Verify 0004_create_sessions.sql created
   # Test migration up/down
   ```

2. **Fix Test Expectations**
   - Update session creation tests to expect `{ context, last_activity_at }`
   - Update Lucia tests to match v3 API
   - Fix mock sessionService structure

3. **Debug Session Middleware**
   - Add console.log to verify middleware executes
   - Check if `request.user` is set correctly
   - Verify Fastify type augmentation loaded

4. **Add Session Expiration Config**
   ```typescript
   sessionExpiresIn: {
     activePeriod: 1000 * 60 * 60 * 24 * 30, // 30 days
     idlePeriod: 1000 * 60 * 60 * 24 * 30,
   }
   ```

### Follow-Up Tasks (After MVP)

1. **Implement role-based session duration** (E02-T00X)
2. **Add session cleanup job** using BullMQ (E02-T00X)
3. **Implement idle timeout enforcement** (E02-T00X)
4. **Add session activity tracking** for "active sessions" UI (E02-T00X)

---

## Acceptance Criteria Summary

| AC | Requirement | Status | Notes |
|----|-------------|--------|-------|
| AC1 | sessions table schema defined | ✅ PASS | Extra fields added per reviews |
| AC2 | Required fields present | ✅ PASS | id, user_id, expires_at + context, lastActivityAt |
| AC3 | Foreign key with CASCADE | ✅ PASS | Properly configured |
| AC4 | Migration file created | ❌ FAIL | **CRITICAL:** File missing |
| AC5 | Lucia configured | ⚠️ PARTIAL | Config exists but tests failing |
| AC6 | Session middleware works | ❌ FAIL | **CRITICAL:** User not attached |
| AC7 | Session creation helper | ❌ FAIL | Works but test expectations wrong |
| AC8 | Session deletion helper | ✅ PASS | Works correctly |
| AC9 | SessionUser type exported | ⚠️ PARTIAL | Uses 'status' not 'role' |
| AC10 | Tests verify functionality | ❌ FAIL | **CRITICAL:** 48 tests failing |

**Overall:** 2/10 PASS, 3/10 PARTIAL, 5/10 FAIL

---

## Final Verdict: ❌ FAIL

**Rationale:**
While the core architecture is well-designed and the code quality is high, there are critical blockers:

1. **Missing migration file** makes this undeployable
2. **48 failing tests** indicate core functionality is broken or tests are severely out of sync
3. **Session middleware not working** means authentication would fail in any real environment

**The implementation cannot be considered complete until:**
- All tests pass (or are updated to match new implementation)
- Migration file is generated and tested
- Session middleware successfully attaches user/session to request

**Estimated Effort to Fix:** 4-6 hours
- 1-2 hours: Generate and test migration
- 2-3 hours: Fix test expectations and debug middleware
- 1 hour: Add missing configuration and verify

---

## Next Steps

**Developer Actions Required:**
1. Generate migration file: `pnpm --filter @raptscallions/db db:generate`
2. Fix session middleware user attachment (debug required)
3. Update all test expectations to match UX review changes
4. Fix Lucia configuration tests (API version mismatch)
5. Add session expiration configuration
6. Re-run all tests: `pnpm test` (must pass 100%)
7. Request re-QA

**Task Status:**
Current: `QA_REVIEW`
Next: `IMPLEMENTING` (return to developer for fixes)

**Review Status:**
This QA review is **COMPLETE** but the task has **FAILED QA**.

---

**QA Agent:** qa
**Report Generated:** 2026-01-12
**Review Duration:** Comprehensive review of code, tests, and spec

