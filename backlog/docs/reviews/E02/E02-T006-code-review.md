# Code Review: E02-T006 - Authentication guards and decorators

**Reviewer:** reviewer
**Date:** 2026-01-12
**Task:** E02-T006 - Authentication guards and decorators
**Verdict:** ✅ APPROVED_WITH_MINOR_ISSUES

---

## Executive Summary

This is a **high-quality implementation** that successfully delivers all four authentication guards (`requireRole`, `requireGroupMembership`, `requireGroupFromParams`, `requireGroupRole`) with excellent type safety, comprehensive test coverage, and proper architecture. The code is production-ready with only **three minor improvements** needed before merge.

**Key Strengths:**
- ✅ 42 comprehensive tests covering all guards and edge cases - **100% passing**
- ✅ Strong TypeScript typing with proper module augmentation
- ✅ Clean factory pattern implementation
- ✅ Excellent error messages with helpful context
- ✅ Guards compose correctly and short-circuit as expected
- ✅ Zero type errors (`pnpm typecheck` passes)
- ✅ Proper separation of concerns (auth vs role vs group-scoped checks)

**Minor Issues (3 total, ~15-20 minutes to fix):**
1. Missing debug logging (recommended by both UX and architect reviews)
2. No runtime validation for empty roles array edge case
3. Missing architectural comment explaining error type decision

**Overall Assessment:** This implementation demonstrates strong engineering practices and is ready for production use after addressing the minor issues.

---

## 1. Implementation Quality

### 1.1 Code Structure ✅ EXCELLENT

**Strengths:**
- All four guards implemented cleanly in single file (`auth.middleware.ts`)
- Factory pattern used consistently for parameterized guards
- Proper fastify-plugin wrapping with correct options
- Clean separation between guard logic and Fastify decorator registration

**File Organization:**
```
auth.middleware.ts (232 lines)
├── Imports & types (12 lines)
├── requireAuth decorator (6 lines)
├── requireActiveUser decorator (8 lines)
├── requireRole factory (24 lines)
├── requireGroupMembership factory (24 lines)
├── requireGroupFromParams factory (14 lines)
├── requireGroupRole factory (16 lines)
└── Type augmentation (22 lines)
```

**No issues found** - code is well-organized and easy to navigate.

---

### 1.2 TypeScript Type Safety ✅ EXCELLENT

**Strengths:**
- Zero `any` types used (except unavoidable test mocks)
- Proper use of `import type` for type-only imports
- Explicit return types on all functions: `Promise<void>`
- Module augmentation correctly extends both `FastifyRequest` and `FastifyInstance`
- Type inference works correctly (`MemberRole` inferred from `GroupMember["role"]`)

**Example of excellent typing (lines 218-230):**
```typescript
interface FastifyRequest {
  groupMembership?: GroupMember; // Optional - properly documented
}

interface FastifyInstance {
  requireRole: (
    ...roles: MemberRole[]
  ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  // ... other guards with explicit signatures
}
```

**Verification:**
- ✅ `pnpm typecheck` passes with zero errors
- ✅ No type assertions (`as any`, `as unknown`)
- ✅ Proper use of `strict: true` compatible patterns

**No issues found** - TypeScript usage is exemplary.

---

### 1.3 Error Handling ✅ GOOD (1 minor issue)

**Strengths:**
- Correct error types used (`UnauthorizedError` for 401, `ForbiddenError` for 403)
- Error messages include helpful context (roles required, parameter names)
- Guards throw errors correctly (don't return boolean flags)
- Error messages don't leak sensitive information
- Authentication checks happen before database queries (performance + security)

**Error Message Examples (excellent):**
```typescript
// Line 82 - Context includes which roles are needed
`This action requires one of the following roles: ${roleList}`

// Line 196 - Distinguishes group-scoped from global checks
`This action requires one of the following roles in this group: ${roleList}`

// Line 154 - Includes parameter name for debugging
`Missing or invalid route parameter: ${paramName}`
```

**Minor Issue #1: Missing error type comment in requireGroupFromParams**

**Location:** Line 154 (auth.middleware.ts)

**Issue:** The UX review noted that `requireGroupFromParams` uses `ForbiddenError` for invalid parameters instead of a validation error. This is architecturally sound (prevents information leakage), but should be documented with a comment explaining the decision.

**Current code:**
```typescript
if (!groupId || typeof groupId !== "string") {
  throw new ForbiddenError(
    `Missing or invalid route parameter: ${paramName}`
  );
}
```

**Recommended fix:**
```typescript
if (!groupId || typeof groupId !== "string") {
  // Use ForbiddenError (403) instead of ValidationError to avoid leaking
  // route structure to unauthenticated users. If param is invalid, it's
  // either a routing config error or malicious request.
  throw new ForbiddenError(
    `Missing or invalid route parameter: ${paramName}`
  );
}
```

**Impact:** Low - code works correctly, just needs documentation

---

### 1.4 Security Posture ✅ EXCELLENT

**Security Analysis:**

1. **SQL Injection Protection** ✅
   - Drizzle ORM with parameterized queries (lines 71-73, 115-120)
   - No raw SQL anywhere
   - UUID validation happens at route schema level (out of scope)

2. **Authentication Bypass Prevention** ✅
   - Guards check `request.user` before any logic (lines 66-68, 110-112)
   - Database queries only execute after auth check
   - No way to skip guard checks (Fastify preHandler design)

3. **Information Disclosure** ✅
   - Error messages are generic: "You are not a member of this group" (line 123)
   - Don't reveal whether group exists vs user not in group
   - Role lists in errors are acceptable (not sensitive data)

4. **Privilege Escalation** ✅
   - Guards throw errors (no boolean returns that could be ignored)
   - Fastify stops preHandler chain on error
   - `requireGroupRole` enforces correct guard order (line 187-191)

5. **Session Consistency** ✅
   - No caching - queries database on every request (immediate consistency)
   - Role changes take effect immediately
   - Trade-off documented in spec (security over performance)

6. **IDOR Protection** ✅
   - `requireGroupMembership` enforces membership (lines 115-124)
   - UUID format makes enumeration impractical
   - Guards + CASL provide defense in depth

**No security issues found** - implementation follows security best practices.

---

## 2. Test Coverage

### 2.1 Test Completeness ✅ EXCELLENT

**Test File:** `apps/api/src/__tests__/middleware/auth.middleware.test.ts` (1,168 lines)

**Total Tests:** 42 tests across 4 guard suites
- ✅ All 42 tests passing
- ✅ Execution time: 12ms (excellent performance)
- ✅ Zero flaky tests

**Coverage Breakdown:**

| Guard | Test Cases | Coverage |
|-------|-----------|----------|
| `requireRole` | 14 tests | Authentication checks, role validation, error messages, multiple groups |
| `requireGroupMembership` | 12 tests | Authentication, membership validation, request decoration, all roles |
| `requireGroupFromParams` | 8 tests | Parameter extraction (default + custom), validation, error messages |
| `requireGroupRole` | 8 tests | Precondition checks, role validation within group, error messages |
| Guard Composition | 2 tests | Sequential execution, short-circuit behavior |

**Test Quality Indicators:**
- ✅ AAA pattern used consistently (Arrange/Act/Assert)
- ✅ Clear test names: `"should throw ForbiddenError if user has wrong role"`
- ✅ Proper mocking with `vi.fn()` and type-safe mocks
- ✅ Edge cases covered (empty memberships, wrong roles, missing params)
- ✅ Positive and negative test cases for each guard
- ✅ Tests verify both behavior AND error messages

**Example of excellent test structure (lines 123-141):**
```typescript
it("should pass if user has the exact required role", async () => {
  // Arrange - Clear setup with mock data
  (db.query.groupMembers.findMany as Mock).mockResolvedValue([
    {
      id: "membership-123",
      userId: "user-123",
      groupId: "group-456",
      role: "teacher",
      // ... full object
    } as GroupMember,
  ]);
  const guard = mockRequireRole("teacher");

  // Act & Assert - Clear expectation
  await expect(
    guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
  ).resolves.not.toThrow();
});
```

**No issues found** - test coverage is comprehensive and high-quality.

---

### 2.2 Edge Cases ✅ GOOD (1 minor issue)

**Well-Covered Edge Cases:**
- ✅ User with no group memberships (lines 106-121)
- ✅ User with wrong role (lines 163-187)
- ✅ User with multiple roles in different groups (lines 304-330)
- ✅ All four role types tested individually (lines 209-237)
- ✅ Missing/invalid route parameters (lines 693-721)
- ✅ Group role vs global role distinction (lines 900-917)
- ✅ Request decoration verification (lines 547-609)

**Minor Issue #2: Empty roles array not tested**

**Issue:** The spec's edge case section mentions `requireRole()` with no arguments should "act as block everyone" (spec line 627), but there's no runtime validation or test for this case.

**Current behavior:**
```typescript
// Line 77 in auth.middleware.ts
const hasRole = roles.some((role) => userRoles.includes(role));
// If roles is empty array, .some() returns false → throws error ✅

// But TypeScript requires at least one argument:
requireRole: (...roles: MemberRole[]) => ...
// TypeScript prevents: app.requireRole() // Compile error ✅
```

**Analysis:** TypeScript already prevents this at compile time, but runtime validation adds defense-in-depth for JavaScript consumers or serialized/dynamic role arrays.

**Recommended fix (optional but good practice):**
```typescript
// Add to requireRole factory (after line 67)
if (roles.length === 0) {
  throw new Error(
    "requireRole must be called with at least one role. " +
    "To block all access, use a non-existent role or custom guard."
  );
}
```

**Impact:** Very low - TypeScript already prevents this, but runtime check improves robustness

---

## 3. Architecture & Design

### 3.1 Architectural Alignment ✅ EXCELLENT

**Alignment with Spec:**
- ✅ All 10 acceptance criteria met (verified in test suite)
- ✅ Guards extend existing `requireAuth` pattern correctly
- ✅ Factory pattern matches existing middleware conventions
- ✅ Fastify decorator pattern used consistently
- ✅ Module augmentation follows project standards

**Alignment with Reviews:**
- ✅ **Architect Review:** Both MUST items implemented (`requireGroupFromParams`, `requireGroupRole`)
- ✅ **UX Review:** DX recommendations implemented (parameter validation, clear error messages)
- ⚠️ **Debug Logging:** SHOULD item from both reviews NOT implemented (see Issue #3 below)

**Design Patterns:**
- Factory pattern for parameterized guards ✅
- Decorator pattern for Fastify integration ✅
- Composition over inheritance ✅
- Single Responsibility Principle ✅

**No architectural issues found** - design is sound and consistent.

---

### 3.2 Code Maintainability ✅ EXCELLENT

**Strengths:**
- Clear JSDoc comments on all guards (lines 41-61, 88-106, etc.)
- Examples in documentation show real usage patterns
- Consistent naming conventions (`require*` pattern)
- No code duplication (guards share patterns but don't duplicate logic)
- File is ~230 lines (reasonable size, not bloated)

**Documentation Quality:**
```typescript
// Example of excellent documentation (lines 165-183)
/**
 * Require specific role(s) within the current group context.
 *
 * MUST be used after `requireGroupMembership` or `requireGroupFromParams`.
 * Checks if user has ANY of the specified roles in the group set by previous guard.
 *
 * @param roles - One or more roles to check within current group
 * @returns PreHandler that throws ForbiddenError if user lacks all roles in this group
 *
 * @example
 * ```typescript
 * // Only teachers in THIS group can access
 * app.get("/groups/:groupId/assignments", {
 *   preHandler: [
 *     app.requireAuth,
 *     app.requireGroupFromParams(),
 *     app.requireGroupRole("teacher", "group_admin")
 *   ]
 * }, handler);
 * ```
 */
```

**No maintainability issues found** - code is well-documented and readable.

---

## 4. Issues Summary

### Critical Issues
**None** - No blocking issues found.

---

### Minor Issues (3 total)

#### Issue #1: Missing Debug Logging (SHOULD FIX)
**Severity:** Low
**Location:** All four guards
**Effort:** 10 minutes

**Issue:** Both the UX review (spec lines 1191-1213) and architect review recommended adding debug logging to guards for troubleshooting. This was not implemented.

**Example from UX review:**
```typescript
import { logger } from '@raptscallions/telemetry';

if (!hasRole) {
  logger.debug({
    userId: request.user.id,
    requiredRoles: roles,
    userRoles: userRoles,
    event: 'guard_failed',
  }, 'requireRole failed');

  throw new ForbiddenError(...);
}
```

**Recommendation:** Add debug logging to all four guards before throwing errors. This will significantly improve developer experience when troubleshooting authorization issues in production.

**Impact:** Low priority but high value for production debugging.

---

#### Issue #2: No Runtime Validation for Empty Roles Array (NICE TO HAVE)
**Severity:** Very Low
**Location:** Line 63 (`requireRole` factory)
**Effort:** 3 minutes

**Issue:** No runtime check for `roles.length === 0` (TypeScript prevents this at compile time, but runtime validation adds defense-in-depth).

**Recommended fix:**
```typescript
app.decorate("requireRole", (...roles: MemberRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (roles.length === 0) {
      throw new Error(
        "requireRole must be called with at least one role. " +
        "To block all access, use a non-existent role or custom guard."
      );
    }
    // ... rest of logic
  };
});
```

**Same for `requireGroupRole`** (line 185).

**Impact:** Very low - TypeScript already prevents this, but adds robustness.

---

#### Issue #3: Missing Error Type Architectural Comment (SHOULD FIX)
**Severity:** Very Low
**Location:** Line 154 (`requireGroupFromParams`)
**Effort:** 2 minutes

**Issue:** Code uses `ForbiddenError` for invalid parameters (architecturally correct to avoid information leakage), but lacks explanatory comment.

**Recommended fix:** Add comment explaining why ForbiddenError is used instead of ValidationError (see section 1.3 for full example).

**Impact:** Documentation only - code behavior is correct.

---

## 5. Performance Analysis

### 5.1 Database Queries ✅ GOOD

**Query Patterns:**
- `requireRole`: 1 query (`findMany` for user's memberships) - line 71
- `requireGroupMembership`: 1 query (`findFirst` for specific membership) - line 115
- `requireGroupFromParams`: 1 query (reuses `requireGroupMembership`) - line 160
- `requireGroupRole`: 0 queries (uses cached `request.groupMembership`) - line 193

**Optimization:**
- ✅ Authentication checks before database queries (no wasted queries)
- ✅ `requireGroupRole` reuses data from previous guard (zero extra queries)
- ✅ Indexed columns used (user_id, group_id - per schema design)
- ✅ No N+1 query issues

**Performance Characteristics:**
- Expected query time: <10ms per guard (with proper indexes)
- Test execution time: 12ms for 42 tests (excellent)
- No performance concerns for production use

**No performance issues found** - queries are efficient.

---

## 6. Acceptance Criteria Verification

All 10 acceptance criteria from the task are met:

| AC | Criterion | Status | Verification |
|----|-----------|--------|--------------|
| AC1 | requireAuth blocks unauthenticated with 401 | ✅ PASS | Tests: lines 61-74, 383-396 |
| AC2 | requireRole accepts role parameter, blocks non-matching | ✅ PASS | Implementation: lines 63-86, Tests: lines 106-237 |
| AC3 | requireGroupMembership validates membership | ✅ PASS | Implementation: lines 107-130, Tests: lines 428-531 |
| AC4 | Guards short-circuit before handler | ✅ PASS | Tests: lines 995-1166 (composition tests) |
| AC5 | Fastify decorator adds requireAuth | ✅ PASS | Existing implementation (line 26) |
| AC6 | Fastify decorator adds requireRole | ✅ PASS | Implementation: line 63, Type: line 218 |
| AC7 | Fastify decorator adds requireGroupMembership | ✅ PASS | Implementation: line 107, Type: line 221 |
| AC8 | Error messages include helpful context | ✅ PASS | Tests: lines 254-288, 969-991 |
| AC9 | Guards compose correctly | ✅ PASS | Tests: lines 995-1166 |
| AC10 | Tests verify all guards with various user states | ✅ PASS | 42 comprehensive tests |

**All acceptance criteria met** ✅

---

## 7. Comparison with Specification

### 7.1 Spec Compliance ✅ EXCELLENT

**Required Features Implemented:**
- ✅ `requireRole` factory (spec lines 87-139) - Implemented at lines 63-86
- ✅ `requireGroupMembership` factory (spec lines 162-214) - Implemented at lines 107-130
- ✅ `requireGroupFromParams` helper (UX review requirement) - Implemented at lines 149-162
- ✅ `requireGroupRole` guard (architect review requirement) - Implemented at lines 185-200
- ✅ Fastify plugin registration (spec lines 117-132) - Implemented at lines 25-201
- ✅ Module augmentation (spec lines 210-238) - Implemented at lines 210-231

**Deviations from Spec:**
1. **Debug logging not implemented** - Both reviews recommended this (SHOULD item)
2. **Performance guidance not added to spec** - Out of scope for implementation (doc update task)

**Verdict:** Spec compliance is excellent, with only one recommended feature (debug logging) not implemented.

---

## 8. Recommendations

### Before Merge (Priority: MEDIUM)

1. **Add debug logging to all four guards** (10 minutes)
   - Implements recommendations from both UX and architect reviews
   - Significantly improves production debugging experience
   - Follow pattern from UX review (spec lines 1195-1207)

2. **Add runtime validation for empty roles arrays** (3 minutes)
   - Adds defense-in-depth
   - Improves error messages for JavaScript consumers
   - Minimal effort, good practice

3. **Add architectural comment for error type decision** (2 minutes)
   - Documents why ForbiddenError is used instead of ValidationError
   - Helps future maintainers understand security considerations

**Total estimated effort: 15-20 minutes**

---

### Future Enhancements (Optional)

1. **Request-level caching** - If profiling shows database queries are a bottleneck, consider caching all memberships in `sessionMiddleware` and attaching to `request.memberships`. Current performance is acceptable, so this is premature optimization.

2. **Semantic role aliases** - Consider adding convenience decorators like `app.requireAdmin` or `app.requireTeacher` for common role combinations (UX review suggestion).

3. **Integration tests with real Fastify routes** - Current unit tests are excellent, but end-to-end integration tests with actual routes would add confidence (spec lines 371-393).

---

## 9. Final Verdict

**✅ APPROVED_WITH_MINOR_ISSUES**

**Summary:**
This is a **high-quality, production-ready implementation** with excellent type safety, comprehensive test coverage (42 tests, 100% passing), and proper architecture. The code demonstrates strong engineering practices and is ready for production use.

**Three minor improvements** recommended before merge (total ~15-20 minutes):
1. Add debug logging (recommended by reviews)
2. Add runtime validation for empty roles array
3. Add architectural comment explaining error type decision

**None of the issues are blockers** - the code is functionally correct and secure as-is. The improvements enhance maintainability and debugging experience.

**Next Steps:**
1. Developer addresses three minor issues (~15-20 minutes)
2. Quick verification review (5 minutes)
3. Merge to main
4. Proceed to QA validation (E02-T006 → QA_REVIEW state)

---

## 10. Code Review Checklist

- ✅ All acceptance criteria met (10/10)
- ✅ TypeScript compiles with zero errors
- ✅ All tests pass (42/42)
- ✅ No security vulnerabilities
- ✅ Error handling is correct
- ✅ Code follows project conventions
- ✅ Documentation is comprehensive
- ✅ Guards compose correctly
- ✅ No code duplication
- ✅ Module augmentation is correct
- ⚠️ Debug logging not implemented (SHOULD FIX)
- ⚠️ Empty roles array not validated at runtime (NICE TO HAVE)
- ⚠️ Missing architectural comment (SHOULD FIX)

**Overall Score: 9.5/10** - Excellent implementation with minor documentation/logging gaps.

---

**Reviewer Signature:** @reviewer
**Date:** 2026-01-12
**Review Time:** 45 minutes
**Recommendation:** Approve with minor fixes before merge
