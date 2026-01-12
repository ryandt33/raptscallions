# Architect Review: E02-T006

**Task:** E02-T006 - Create Authentication Guards
**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED

## Executive Summary

This specification proposes authentication and authorization guards for Fastify routes that build upon the existing session middleware (E02-T003) and CASL permissions (E02-T005). The design is architecturally sound, follows established patterns, and integrates cleanly with the existing authentication infrastructure.

The UX Designer has already identified two critical developer experience issues that should be addressed. This architectural review focuses on system-level concerns and validates the overall design approach.

## Architectural Assessment

### ✅ Alignment with Architecture Decisions

**1. Fastify Integration Pattern**
- **Correct**: Uses Fastify decorators and preHandler hooks (canonical pattern)
- **Correct**: Factory functions return async preHandlers (`(request, reply) => Promise<void>`)
- **Correct**: Errors thrown (not returned) for proper short-circuit behavior
- **Correct**: TypeScript module augmentation for type safety
- **Validation**: Matches existing `requireAuth` pattern in `auth.middleware.ts`

**2. Database Access Pattern**
- **Correct**: Uses Drizzle ORM with query builder (not raw SQL)
- **Correct**: Queries `group_members` table with indexed lookups
- **Correct**: Leverages existing indexes (`group_members_user_id_idx`, `group_members_group_id_idx`)
- **Correct**: No caching layer (consistent with "no caching = immediate permission updates")
- **Performance**: Acceptable query overhead (1-2 DB calls per request with indexed lookups)

**3. Error Handling Strategy**
- **Correct**: Uses typed errors from `@raptscallions/core/errors`
- **Correct**: `UnauthorizedError` (401) for authentication failures
- **Correct**: `ForbiddenError` (403) for authorization failures
- **Correct**: Error messages are user-friendly without leaking system details
- **Security**: Generic error messages prevent information disclosure

**4. Relationship to CASL Permissions**
- **Correct**: Guards provide coarse-grained checks (roles, group membership)
- **Correct**: CASL handles fine-grained permissions (resource ownership, attributes)
- **Clear Separation**: Guards are simpler, CASL is more sophisticated
- **Complementary**: Guards + CASL provide defense-in-depth
- **Documentation**: Well-explained in "Relationship to CASL Permissions" section

### ✅ Consistency with Existing Codebase

**1. Authentication Middleware (E02-T003)**
- Guards extend existing `auth.middleware.ts` (correct decision)
- Uses existing `request.user` from session middleware
- Follows same decorator pattern as `requireAuth`
- Maintains consistent error handling

**2. CASL Permissions (E02-T005)**
- Uses same `group_members` table and role enum
- Relies on existing database schema (no migrations needed)
- Doesn't conflict with permission middleware
- Correctly positioned as "simpler checks" before CASL

**3. Database Schema (E01-T006)**
- Uses existing `group_members` join table
- Leverages existing indexes for performance
- No schema changes required (good)
- Foreign key relationships already established

### ✅ Type Safety and TypeScript Compliance

**1. Zero Tolerance Compliance**
- All types explicitly defined
- No `any` types used
- Uses `import type` for type-only imports
- Proper null safety with explicit checks

**2. Fastify Module Augmentation**
- Correctly extends `FastifyInstance` interface
- Correctly extends `FastifyRequest` interface (for `groupMembership`)
- Type signatures match Fastify conventions
- Full TypeScript support for IDE autocomplete

**3. Type Imports**
- Uses types from `@raptscallions/db/schema` (correct source)
- `MemberRole` type imported from schema (not duplicated)
- `GroupMember` type for request decoration
- Proper type constraints on factory parameters

### ✅ Security Posture

**1. Authorization Bypass Prevention**
- Guards throw errors (can't be skipped)
- Fastify preHandler stops execution on error
- No boolean flags that could be misused
- Mandatory authentication check in each guard

**2. SQL Injection Protection**
- Drizzle ORM with parameterized queries
- No raw SQL in guards
- UUID validation at route schema level

**3. Information Disclosure Prevention**
- Generic error messages ("not a member of this group")
- No distinction between "group doesn't exist" vs "not a member"
- Role lists in errors don't leak sensitive data
- Error messages aid debugging without security risk

**4. Session Consistency**
- Guards query database on every request (no caching)
- Role changes take immediate effect
- Trade-off: Performance vs security (security wins - correct)
- Prevents stale permission attacks

### ✅ Performance Considerations

**1. Database Query Performance**
- **Per-request overhead**: 0-2 indexed queries
- **Indexes**: Existing indexes on `user_id` and `group_id`
- **Query complexity**: Simple equality lookups (fast)
- **Acceptable**: <10ms per guard with proper indexes

**2. Future Optimization Path**
- Spec correctly identifies caching as future optimization
- Documents trade-off (performance vs immediate consistency)
- Recommends profiling before optimization (correct approach)
- Suggests request-level caching if needed

**3. No N+1 Query Issues**
- Each guard makes single query (or two for composed guards)
- No loop-based queries
- No cascade queries in guards

## Critical Issues from UX Review

The UX Designer identified two MUST-fix issues. From an architectural perspective:

**Issue #1: Dynamic Group ID Pattern**
- **Architectural Impact**: MEDIUM
- **Concern**: Manual guard invocation inside handlers breaks separation of concerns
- **Recommendation**: SUPPORT the `requireGroupFromParams` helper
- **Rationale**: Maintains preHandler pattern, reduces error surface, aligns with Fastify conventions
- **Decision**: Adding this helper is architecturally sound and improves maintainability

**Issue #2: Confusing Role Scope**
- **Architectural Impact**: HIGH
- **Concern**: `requireRole` checks ANY group, not current group context
- **Recommendation**: STRONGLY SUPPORT the `requireGroupRole` guard
- **Rationale**: Prevents subtle authorization bugs, clarifies guard semantics, provides proper group-scoped checks
- **Decision**: This is architecturally necessary - the spec as-written has an authorization gap

## Architectural Recommendations

### Must Implement (Severity: HIGH)

**1. Add `requireGroupRole` Guard** ✅ REQUIRED

The UX Designer is correct - the spec has a subtle authorization flaw:

**Problem Scenario:**
```typescript
// User is 'teacher' in GroupA, 'student' in GroupB
app.get("/groups/:groupId/assignments", {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),      // Validates user is in GroupB
    app.requireRole('teacher')         // Passes if teacher in ANY group!
  ]
}, handler);

// BUG: Student in GroupB can access teacher-only endpoint
```

**Architectural Fix:**
```typescript
app.get("/groups/:groupId/assignments", {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),
    app.requireGroupRole('teacher')    // Checks role IN THIS GROUP
  ]
}, handler);
```

**Justification:**
- **Security**: Prevents cross-group privilege escalation
- **Clarity**: Explicit about role scope (global vs group-specific)
- **Defense-in-depth**: Guards should not have authorization gaps
- **Pattern**: Matches expected developer mental model

**Action Required**: Add `requireGroupRole` to implementation section

**2. Add `requireGroupFromParams` Helper** ✅ REQUIRED

**Architectural Justification:**
- **Consistency**: Maintains preHandler pattern across all routes
- **Safety**: Type-safe parameter extraction with validation
- **Maintainability**: Centralizes group ID extraction logic
- **Error Prevention**: Impossible to forget guard invocation

**Action Required**: Add to implementation section

### Should Implement (Severity: MEDIUM)

**3. Add Structured Debug Logging** ✅ RECOMMENDED

**Justification:**
- **Observability**: Guards are security-critical, need audit trail
- **Debugging**: Telemetry helps troubleshoot authorization failures
- **Compliance**: Security events should be logged

**Implementation:**
```typescript
import { logger } from '@raptscallions/telemetry';

// In requireRole
if (!hasRole) {
  logger.debug({
    userId: request.user.id,
    requiredRoles: roles,
    userRoles: userRoles,
    event: 'guard_failed',
    guardType: 'requireRole'
  }, 'Authorization guard failed');

  throw new ForbiddenError(...);
}
```

**4. Document Performance Optimization Threshold** ✅ RECOMMENDED

The spec mentions optimization but doesn't provide clear guidance.

**Add to Performance Considerations:**
```markdown
### When to Optimize Guards

**Current Performance** (with indexes):
- requireRole: ~5-10ms (one query)
- requireGroupMembership: ~5-10ms (one query)

**Optimization Triggers**:
1. Guards consistently exceed 50ms (indicates index issues)
2. Request throughput > 10,000 req/sec (caching may help)
3. Profiling shows guards in top 3 bottlenecks

**Optimization Strategies** (in order):
1. Verify indexes exist and are used (EXPLAIN ANALYZE)
2. Request-level caching (fetch memberships once per request)
3. Redis caching with 1-5 minute TTL
4. Denormalize roles into JWT/session token

**Don't optimize prematurely** - indexed queries are fast.
```

### Nice to Have (Severity: LOW)

**5. Semantic Role Aliases**

The UX Designer suggested convenience aliases. Architecturally:
- **Pro**: Reduces boilerplate, clearer intent
- **Con**: More decorators to maintain, potential confusion
- **Decision**: Optional, document if implemented

**6. Testing Utilities**

Mock factories for guard testing would improve test maintainability.

## Compliance Checklist

| Requirement | Status | Notes |
|------------|--------|-------|
| **TypeScript Strict Mode** | ✅ PASS | No `any`, explicit types, null safety |
| **Fastify Conventions** | ✅ PASS | Decorator pattern, preHandler factories |
| **Error Handling** | ✅ PASS | Typed errors from `@raptscallions/core` |
| **Database Patterns** | ✅ PASS | Drizzle ORM, indexed queries, no raw SQL |
| **Security Best Practices** | ✅ PASS | SQL injection prevention, generic errors |
| **Testing Requirements** | ✅ PASS | AAA pattern, 80%+ coverage target |
| **Logging Standards** | ⚠️ NEEDS | Add structured logging to guards |
| **Performance Standards** | ✅ PASS | Acceptable query overhead, optimization path |
| **Documentation** | ✅ PASS | Comprehensive JSDoc, examples, edge cases |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Authorization Bypass** | LOW | Guards throw errors, Fastify stops execution |
| **Role Confusion Bug** | HIGH | Fixed by adding `requireGroupRole` guard |
| **Performance Degradation** | LOW | Indexed queries, optimization path documented |
| **Type Safety Issues** | LOW | Full TypeScript coverage, strict mode |
| **Information Disclosure** | LOW | Generic error messages, no system leaks |

## Open Questions Resolution

The spec lists 5 open questions. Architectural input:

**1. Should requireGroupMembership validate group exists?**
- **Answer**: NO (spec is correct)
- **Rationale**: Extra query cost, validation belongs at route schema layer
- **Decision**: Keep as-is

**2. Should guards cache membership lookups per-request?**
- **Answer**: NOT INITIALLY (spec is correct)
- **Rationale**: Premature optimization, document optimization path
- **Decision**: Keep as-is, add optimization guidance

**3. Should requireRole support role hierarchy?**
- **Answer**: NO (spec is correct)
- **Rationale**: Hierarchy belongs in CASL, guards should be explicit
- **Decision**: Keep as-is

**4. Should groupMembership always be attached to request?**
- **Answer**: NO (spec is correct)
- **Rationale**: Optional decoration only when needed, refactor later if needed
- **Decision**: Keep as-is

**5. What about class membership guards?**
- **Answer**: OUT OF SCOPE (spec is correct)
- **Rationale**: Classes have their own table, add in future task if needed
- **Decision**: Keep as-is, document as future enhancement

## Final Verdict

**APPROVED** with the following mandatory changes:

1. **MUST ADD**: `requireGroupRole` guard to fix authorization gap
2. **MUST ADD**: `requireGroupFromParams` helper for ergonomics
3. **SHOULD ADD**: Structured debug logging for observability
4. **SHOULD ADD**: Performance optimization guidance

Once these changes are implemented, the spec will be:
- **Architecturally sound**: Clean integration, proper patterns
- **Secure**: No authorization bypasses, defense-in-depth
- **Performant**: Acceptable overhead, optimization path clear
- **Maintainable**: Type-safe, well-documented, testable

The core design is excellent. The UX Designer identified real issues that should be addressed before implementation begins.

## Next Steps

1. **Analyst**: Address the four action items above
2. **Analyst**: Update implementation section with new guards
3. **Analyst**: Update test strategy for new guards
4. **Analyst**: Update TypeScript augmentation section
5. **Developer**: Proceed with implementation once spec updated
6. **QA**: Verify all edge cases in test strategy

---

**Approval Signature:** Architect Agent
**Date:** 2026-01-12
**Status:** APPROVED (pending updates)
