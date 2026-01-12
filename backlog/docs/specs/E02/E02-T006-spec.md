# Implementation Spec: E02-T006

## Overview

Create reusable authentication guards and Fastify decorators for common auth patterns: `requireAuth` (must be logged in), `requireRole` (must have specific role), and `requireGroupMembership` (must belong to group). These guards build on the existing auth middleware (E02-T003) and CASL permissions (E02-T005) to provide convenience wrappers for common authorization checks in routes.

**Key distinction**: This task extends the existing `requireAuth` guard (already implemented in `apps/api/src/middleware/auth.middleware.ts`) with role-based and group membership guards that complement the CASL permission system.

## Approach

### Architecture

The guards follow a three-tier authorization model:

1. **Authentication** (already exists in `auth.middleware.ts`): `requireAuth` - Basic "are you logged in?" check
2. **Role-Based** (this task): `requireRole` - "Do you have this role in any group?"
3. **Group Membership** (this task): `requireGroupMembership` - "Are you a member of this specific group?"
4. **Permission-Based** (already exists in `permissions.ts`): `requirePermission` - "Can you perform this action on this resource?"

Guards are implemented as **preHandler factories** that return async functions. They compose correctly in arrays and short-circuit (throw error before route handler executes).

### Design Decisions

1. **Extend auth.middleware.ts** - Add new guards to existing file rather than creating new file (keeps all guards in one place)
2. **Factory Pattern** - `requireRole()` and `requireGroupMembership()` are factories that accept parameters and return preHandlers
3. **Database Queries** - Role checks query `group_members` table directly (not cached, as role changes should be immediate)
4. **Request Decoration** - Optionally attach `groupMembership` to request for downstream use
5. **Error Context** - Error messages include helpful context (which roles/groups failed)

### Relationship to CASL Permissions

These guards are **simpler, coarser checks** than CASL:

- **Guards**: "Do you have teacher role somewhere?" (any group)
- **CASL**: "Can you delete this specific tool?" (resource-level, ownership-based)

Use guards for:
- Simple role gates ("teachers only" endpoints)
- Group membership gates ("must be in this group to proceed")

Use CASL (`requirePermission`) for:
- Resource ownership checks
- Attribute-based permissions
- Complex conditional logic

## Files to Create

None. All changes are modifications to existing files.

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/middleware/auth.middleware.ts` | Add `requireRole` and `requireGroupMembership` guard factories |
| `packages/db/src/schema/group-members.ts` | Verify exports for `MemberRole` type (likely already exported) |
| `packages/core/src/schemas/group.schema.ts` | Verify `MemberRole` Zod enum exists (create if missing) |

## Dependencies

### Task Dependencies

- **Requires**: E02-T003 (Session middleware and basic auth guards) - DONE
  - Uses existing `requireAuth` decorator pattern
  - Uses `request.user` populated by session middleware

- **Requires**: E02-T005 (CASL permissions) - DONE
  - Uses `group_members` table and role enum
  - Uses `db` client from `@raptscallions/db`
  - Uses `ForbiddenError` from `@raptscallions/core`

### Database Schema

Uses existing tables:
- `group_members` - Join table with `role` field (system_admin, group_admin, teacher, student)
- `groups` - For validating group existence in membership checks

No migrations needed.

## Implementation Details

### 1. Role Guard Factory

**File**: `apps/api/src/middleware/auth.middleware.ts`

Add after the existing `requireActiveUser` decorator:

```typescript
import { db } from "@raptscallions/db";
import { groupMembers } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";
import { ForbiddenError } from "@raptscallions/core";
import type { MemberRole } from "@raptscallions/db/schema";

/**
 * Require specific role(s) preHandler factory.
 *
 * Checks if user has ANY of the specified roles in ANY group.
 * For more fine-grained permission checks, use CASL's requirePermission instead.
 *
 * @param roles - One or more roles to check (system_admin, group_admin, teacher, student)
 * @returns PreHandler that throws ForbiddenError if user lacks all roles
 *
 * @example
 * ```typescript
 * // Only system admins and group admins can access
 * app.post("/admin/users", {
 *   preHandler: [app.requireAuth, app.requireRole("system_admin", "group_admin")]
 * }, handler);
 *
 * // Only teachers can access
 * app.get("/teacher/dashboard", {
 *   preHandler: [app.requireAuth, app.requireRole("teacher")]
 * }, handler);
 * ```
 */
app.decorate("requireRole", (...roles: MemberRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First check auth (redundant if requireAuth is used, but safe)
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    // Query user's roles across all groups
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    // Check if user has any of the required roles
    const userRoles = memberships.map((m) => m.role);
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
      throw new ForbiddenError(
        `This action requires one of the following roles: ${roleList}`
      );
    }
  };
});
```

**Type safety**: Add to Fastify module augmentation at bottom of file:

```typescript
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: MemberRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

### 2. Group Membership Guard Factory

**File**: `apps/api/src/middleware/auth.middleware.ts`

Add after the `requireRole` decorator:

```typescript
/**
 * Require group membership preHandler factory.
 *
 * Checks if user is a member of the specified group (with any role).
 * Optionally attaches the membership object to request.groupMembership for downstream use.
 *
 * For dynamic group IDs (from route params), call this function inside the route handler
 * instead of in preHandler array.
 *
 * @param groupId - UUID of group to check membership for
 * @returns PreHandler that throws ForbiddenError if user is not a member
 *
 * @example
 * ```typescript
 * // Static group ID (in preHandler array)
 * app.get("/groups/abc-123/members", {
 *   preHandler: [app.requireAuth, app.requireGroupMembership("abc-123")]
 * }, handler);
 *
 * // Dynamic group ID (call in handler)
 * app.get("/groups/:groupId/members", {
 *   preHandler: [app.requireAuth]
 * }, async (request, reply) => {
 *   await app.requireGroupMembership(request.params.groupId)(request, reply);
 *   // User is confirmed member - proceed
 * });
 * ```
 */
app.decorate("requireGroupMembership", (groupId: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First check auth
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    // Query for membership in specific group
    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.userId, request.user.id),
        eq(groupMembers.groupId, groupId)
      ),
    });

    if (!membership) {
      throw new ForbiddenError("You are not a member of this group");
    }

    // Optionally attach membership to request for downstream use
    // This allows route handlers to know the user's role in this group
    request.groupMembership = membership;
  };
});
```

**Request decoration**: Add `groupMembership` property to FastifyRequest. Update the Fastify module augmentation:

```typescript
import type { GroupMember } from "@raptscallions/db/schema";

declare module "fastify" {
  interface FastifyRequest {
    groupMembership?: GroupMember; // Optional - only populated after requireGroupMembership
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: MemberRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupMembership: (
      groupId: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

### 3. Import Updates

**File**: `apps/api/src/middleware/auth.middleware.ts`

Ensure all necessary imports are present at the top of the file:

```typescript
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { UnauthorizedError, ForbiddenError } from "@raptscallions/core";
import { db } from "@raptscallions/db";
import { groupMembers } from "@raptscallions/db/schema";
import { eq, and } from "drizzle-orm";
import type { MemberRole, GroupMember } from "@raptscallions/db/schema";
```

### 4. Schema Verification

**File**: `packages/core/src/schemas/group.schema.ts`

Verify that `memberRoleSchema` exists. If not, add:

```typescript
import { z } from "zod";

/**
 * Member role enum schema.
 * Matches the member_role enum in PostgreSQL.
 */
export const memberRoleSchema = z.enum([
  "system_admin",
  "group_admin",
  "teacher",
  "student",
]);

export type MemberRole = z.infer<typeof memberRoleSchema>;
```

**Note**: The type `MemberRole` is likely already exported from `packages/db/src/schema/group-members.ts` as an inferred Drizzle type. Verify this and use the database type if available (preferred for type consistency).

## Test Strategy

### Unit Tests

**File**: `apps/api/src/__tests__/middleware/auth.middleware.test.ts`

Test each guard independently:

#### requireRole Tests

1. **Should throw UnauthorizedError if not authenticated**
   - Arrange: Request with no user
   - Act: Call `requireRole('teacher')`
   - Assert: Throws UnauthorizedError

2. **Should throw ForbiddenError if user has no roles**
   - Arrange: User with no group memberships
   - Act: Call `requireRole('teacher')`
   - Assert: Throws ForbiddenError with role message

3. **Should pass if user has exact role**
   - Arrange: User with 'teacher' role
   - Act: Call `requireRole('teacher')`
   - Assert: No error, handler continues

4. **Should pass if user has any of multiple roles**
   - Arrange: User with 'group_admin' role
   - Act: Call `requireRole('system_admin', 'group_admin')`
   - Assert: No error

5. **Should throw if user has wrong role**
   - Arrange: User with 'student' role
   - Act: Call `requireRole('teacher')`
   - Assert: Throws ForbiddenError

6. **Should detect system_admin role**
   - Arrange: User with 'system_admin' role
   - Act: Call `requireRole('system_admin')`
   - Assert: No error

7. **Error message should list all required roles**
   - Arrange: User with no roles
   - Act: Call `requireRole('teacher', 'group_admin')`
   - Assert: Error message contains "teacher, group_admin"

#### requireGroupMembership Tests

1. **Should throw UnauthorizedError if not authenticated**
   - Arrange: Request with no user
   - Act: Call `requireGroupMembership('group-123')`
   - Assert: Throws UnauthorizedError

2. **Should throw ForbiddenError if user not in group**
   - Arrange: User not a member of 'group-123'
   - Act: Call `requireGroupMembership('group-123')`
   - Assert: Throws ForbiddenError with "not a member" message

3. **Should pass if user is member of group**
   - Arrange: User is member of 'group-123'
   - Act: Call `requireGroupMembership('group-123')`
   - Assert: No error

4. **Should attach membership to request**
   - Arrange: User is member of 'group-123' as 'teacher'
   - Act: Call `requireGroupMembership('group-123')`
   - Assert: `request.groupMembership` is populated with membership object

5. **Should work with any role in group**
   - Arrange: User is 'student' in 'group-123'
   - Act: Call `requireGroupMembership('group-123')`
   - Assert: No error

#### Guard Composition Tests

1. **Should compose correctly (requireAuth + requireRole)**
   - Arrange: User with 'teacher' role
   - Act: Call both guards in sequence
   - Assert: Both pass, no error

2. **Should compose correctly (requireAuth + requireRole + requireGroupMembership)**
   - Arrange: User with 'teacher' role in 'group-123'
   - Act: Call all three guards
   - Assert: All pass, no error

3. **Should short-circuit on first failure**
   - Arrange: User not authenticated
   - Act: Call `requireAuth`, `requireRole`, `requireGroupMembership`
   - Assert: Only `requireAuth` throws, others don't execute

### Integration Tests

**File**: `apps/api/src/__tests__/integration/auth-guards.test.ts`

Test guards in real route context:

1. **POST /admin/users with requireRole**
   - Test: Unauthenticated → 401
   - Test: Student user → 403
   - Test: Teacher user → 403
   - Test: Group admin user → 200 (passes)
   - Test: System admin user → 200 (passes)

2. **GET /groups/:groupId/members with requireGroupMembership**
   - Test: Unauthenticated → 401
   - Test: User not in group → 403
   - Test: User in different group → 403
   - Test: User in group → 200 (passes)
   - Test: User can access multiple groups they belong to

3. **Guard composition with multiple preHandlers**
   - Test: Route with `[requireAuth, requireRole('teacher'), requireGroupMembership('g1')]`
   - Verify correct error at each stage

### Mock Strategy

For unit tests, mock:
- `db.query.groupMembers.findMany` - Return mock memberships
- `db.query.groupMembers.findFirst` - Return mock membership or null
- `request.user` - Inject mock user
- `request.groupMembership` - Verify it's set correctly

For integration tests:
- Use test database with seed data
- Create real users and group memberships
- Test actual database queries

## Acceptance Criteria Breakdown

### AC1: requireAuth preHandler blocks unauthenticated requests with 401

**Implementation**: Already exists in current `auth.middleware.ts` (line 19-23).

**Verification**:
- Unit test: Mock `request.user = null`, call guard, expect `UnauthorizedError`
- Integration test: Call protected route without session cookie, expect 401

**Done When**: Test passes with proper error message "Authentication required"

### AC2: requireRole guard accepts role parameter and blocks non-matching users

**Implementation**: Factory function at line ~40-60 in modified `auth.middleware.ts`

**Verification**:
- Unit test: User with 'student' role, call `requireRole('teacher')`, expect `ForbiddenError`
- Unit test: User with 'teacher' role, call `requireRole('teacher')`, expect no error
- Unit test: User with no roles, call `requireRole('teacher')`, expect `ForbiddenError`

**Done When**:
- Factory accepts variable arguments: `requireRole('teacher')`, `requireRole('teacher', 'group_admin')`
- Queries `group_members` table for user's roles
- Throws `ForbiddenError` if user lacks all specified roles
- Allows request if user has ANY of the specified roles

### AC3: requireGroupMembership guard validates user is member of specified group

**Implementation**: Factory function at line ~70-95 in modified `auth.middleware.ts`

**Verification**:
- Unit test: User not in 'group-123', call guard, expect `ForbiddenError`
- Unit test: User in 'group-123', call guard, expect no error
- Integration test: Real database query with actual group membership

**Done When**:
- Factory accepts group ID parameter: `requireGroupMembership(groupId)`
- Queries `group_members` for specific user + group combo
- Throws `ForbiddenError` if no membership found
- Allows request if membership exists (regardless of role)

### AC4: Guards short-circuit and return error before route handler executes

**Implementation**: Inherent to Fastify preHandler design - guards throw errors

**Verification**:
- Integration test: Route with failing guard + handler that sets flag
- Verify: Handler flag never set (handler didn't execute)
- Verify: Error response returned immediately

**Done When**:
- Guards throw errors (don't return/resolve)
- Fastify's preHandler chain stops on error
- Route handler never executes when guard fails

### AC5: Fastify decorator adds `requireAuth` to app instance

**Implementation**: Already exists (line 19 in current `auth.middleware.ts`)

**Verification**:
- Type check: `app.requireAuth` is callable
- Unit test: `app.requireAuth` is a function
- Integration test: Use in route, verify behavior

**Done When**: Decorator is accessible on `app` instance in routes

### AC6: Fastify decorator adds `requireRole` to app instance

**Implementation**: New decorator at line ~40 in modified `auth.middleware.ts`

**Verification**:
- Type check: `app.requireRole('teacher')` type-checks correctly
- Unit test: `typeof app.requireRole === 'function'`
- Unit test: `app.requireRole('teacher')` returns a function
- Integration test: Use in route preHandler array

**Done When**:
- `app.requireRole` is a function
- Returns preHandler function
- TypeScript augmentation includes it in `FastifyInstance`

### AC7: Fastify decorator adds `requireGroupMembership` to app instance

**Implementation**: New decorator at line ~70 in modified `auth.middleware.ts`

**Verification**:
- Type check: `app.requireGroupMembership('group-id')` type-checks
- Unit test: `typeof app.requireGroupMembership === 'function'`
- Unit test: Returns preHandler function
- Integration test: Use in route with dynamic group ID from params

**Done When**:
- `app.requireGroupMembership` is a function
- Returns preHandler function
- TypeScript augmentation includes it in `FastifyInstance`

### AC8: Error messages include helpful context (which permission failed)

**Implementation**:
- `requireRole`: Error message lists all required roles (line ~55)
- `requireGroupMembership`: Generic "not a member" message (line ~88)

**Verification**:
- Unit test: `requireRole('teacher', 'group_admin')` error includes "teacher, group_admin"
- Unit test: `requireRole('teacher')` error includes "teacher" (singular)
- Unit test: `requireGroupMembership('group-123')` error is "You are not a member of this group"

**Done When**:
- `ForbiddenError` messages are descriptive
- Role list formatting is correct (singular vs comma-separated)
- Messages are user-friendly (not technical jargon)

### AC9: Guards compose correctly (can use multiple in preHandler array)

**Implementation**: Inherent to Fastify preHandler design - arrays execute in order

**Verification**:
- Integration test: Route with `[app.requireAuth, app.requireRole('teacher'), app.requireGroupMembership('g1')]`
- Test: Each guard in sequence (auth → role → membership)
- Test: Failure at each stage stops execution

**Done When**:
- Multiple guards can be used: `preHandler: [guard1, guard2, guard3]`
- Guards execute in order (left to right)
- First failure stops the chain
- All guards can access `request` properties set by previous guards

### AC10: Tests verify all guards with various user states

**Implementation**: Test suite in `apps/api/src/__tests__/middleware/auth.middleware.test.ts`

**Coverage**:
- Unauthenticated users (no session)
- Authenticated users with no roles
- Users with single role (each role type)
- Users with multiple roles
- Users in one group vs multiple groups
- Users not in target group

**Done When**:
- Unit tests: 15+ tests covering all edge cases
- Integration tests: 8+ tests with real routes
- Test coverage: 100% line coverage on auth.middleware.ts
- All tests pass consistently

## Edge Cases

### 1. User with no group memberships

**Scenario**: New user account with no group assignments yet

**Handling**:
- `requireRole`: Throws `ForbiddenError` immediately (no roles to check)
- `requireGroupMembership`: Throws `ForbiddenError` (not in group)
- **Test**: Create user, attempt to access teacher route, expect 403

### 2. Deleted/suspended group

**Scenario**: User is member of group that has `deleted_at` set

**Handling**:
- Guards check membership table only (don't validate group status)
- Group deletion should CASCADE delete memberships (per schema design)
- If soft-deleted groups keep memberships, this is **out of scope** for guards
- **Recommendation**: Document that group cleanup should remove memberships

### 3. Role changes while user is logged in

**Scenario**: Admin removes user's teacher role, user still has active session

**Handling**:
- Guards query database on EVERY request (not cached)
- Role change takes effect immediately on next request
- User's existing session remains valid (role != session validity)
- **Trade-off**: Slight performance cost for immediate consistency

### 4. Multiple roles in different groups

**Scenario**: User is 'teacher' in GroupA, 'student' in GroupB

**Handling**:
- `requireRole('teacher')`: Passes (user has teacher role somewhere)
- `requireGroupMembership('GroupB')`: Passes (user is member)
- Guards are **existential checks** (ANY group with role, not ALL groups)
- **For specific group+role checks**: Use CASL permissions instead

### 5. System admin role

**Scenario**: User with 'system_admin' role in any group

**Handling**:
- `requireRole('system_admin')`: Passes
- `requireRole('teacher')`: Fails unless user also has 'teacher' role
- **Guards are explicit** (system_admin doesn't auto-match other roles)
- **CASL** handles admin bypass (`can('manage', 'all')`)
- **Design**: Guards enforce role matching, CASL enforces permission logic

### 6. Dynamic group ID from route params

**Scenario**: Route `/groups/:groupId/members` needs to check membership of param group

**Handling**:
- **Cannot use in preHandler array** (params not available in decorator definition)
- **Solution**: Call guard inside handler:
  ```typescript
  app.get("/groups/:groupId/members", {
    preHandler: [app.requireAuth]
  }, async (request, reply) => {
    await app.requireGroupMembership(request.params.groupId)(request, reply);
    // User verified - proceed
  });
  ```
- **Alternative**: Use CASL with resource-level check (more flexible)

### 7. Empty roles array to requireRole

**Scenario**: Developer calls `app.requireRole()` with no arguments

**Handling**:
- TypeScript prevents this: `requireRole(...roles: MemberRole[])` requires at least one
- Runtime: If somehow passed empty array, `roles.some()` returns false → throws error
- **Behavior**: Acts as "block everyone" (correct - no roles specified means unreachable)

### 8. Non-existent group ID to requireGroupMembership

**Scenario**: `requireGroupMembership('invalid-uuid')`

**Handling**:
- Query returns no membership → throws `ForbiddenError`
- Same behavior as "user not in group" (guards don't distinguish)
- **Validation**: Group existence should be validated elsewhere (not guard's job)

## Security Considerations

### 1. SQL Injection Protection

**Risk**: User input in group ID parameter

**Mitigation**:
- Drizzle ORM with parameterized queries (built-in protection)
- UUID validation at route schema level (Zod)
- No raw SQL in guards

**Verification**: Code review + SQL query logging in tests

### 2. Session Fixation

**Risk**: User's roles change but old session grants old permissions

**Mitigation**:
- Guards query database on every request (no caching)
- Role changes take immediate effect
- **Trade-off**: Performance vs security (security wins)

**Verification**: Integration test with role change mid-session

### 3. Privilege Escalation

**Risk**: User manipulates request to bypass guards

**Mitigation**:
- Guards throw errors (don't return boolean flags)
- Fastify preHandler stops execution on error
- No way to "skip" a guard in preHandler array
- Guards don't trust client input (only server-side data)

**Verification**: Integration tests with malicious payloads

### 4. Information Disclosure

**Risk**: Error messages reveal system structure

**Mitigation**:
- Generic error messages: "You are not a member of this group" (don't mention group name)
- Don't leak whether group exists vs user not in group
- Role error messages are descriptive but not exploitable

**Verification**: Review error messages in tests

### 5. Timing Attacks

**Risk**: Response time reveals group membership

**Mitigation**:
- Database query time is similar for exists/not-exists (indexed lookups)
- Error responses don't include timing info
- **Low risk**: Guards are coarse checks, not cryptographic

**Verification**: Not critical for this use case (document as known limitation)

### 6. IDOR (Insecure Direct Object Reference)

**Risk**: User accesses group by guessing ID

**Mitigation**:
- `requireGroupMembership` enforces membership (not just authentication)
- UUID format makes guessing impractical
- Guards + CASL provide defense in depth

**Verification**: Integration tests with cross-group access attempts

## TypeScript Requirements

All code must follow strict TypeScript standards:

### Type Definitions

**Required Types** (all must be explicitly defined):

```typescript
// Import from schema package
import type { MemberRole, GroupMember } from "@raptscallions/db/schema";

// Fastify augmentation
declare module "fastify" {
  interface FastifyRequest {
    groupMembership?: GroupMember; // Optional, only after requireGroupMembership
  }

  interface FastifyInstance {
    requireRole: (
      ...roles: MemberRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    requireGroupMembership: (
      groupId: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

### Banned Patterns

**NEVER use**:
- `any` type (use `unknown` with guards)
- `as any` assertions
- `@ts-ignore` or `@ts-expect-error`

**Instead use**:
- Explicit type imports: `import type { ... }`
- Type narrowing: `if (request.user)` narrows to non-null
- Generic constraints: `<T extends Record<string, unknown>>`

### Return Types

All functions must have explicit return types:

```typescript
// ✅ Good - explicit Promise<void>
app.decorate("requireRole", (...roles: MemberRole[]):
  (request: FastifyRequest, reply: FastifyReply) => Promise<void> => {
  return async (request, reply) => { /* ... */ };
});

// ❌ Bad - inferred return type
app.decorate("requireRole", (...roles) => {
  return async (request, reply) => { /* ... */ };
});
```

### Null Safety

With `noUncheckedIndexedAccess` enabled:

```typescript
// ✅ Good - handle undefined case
const membership = await db.query.groupMembers.findFirst(...);
if (!membership) {
  throw new ForbiddenError(...);
}
// membership is now non-null

// ❌ Bad - assumes membership exists
const role = membership.role; // Type error if membership could be undefined
```

### Type-Only Imports

```typescript
// ✅ Good - separate type imports
import type { MemberRole, GroupMember } from "@raptscallions/db/schema";
import { groupMembers } from "@raptscallions/db/schema";

// ❌ Bad - mixed imports
import { MemberRole, GroupMember, groupMembers } from "@raptscallions/db/schema";
```

## Open Questions

### 1. Should requireGroupMembership validate group exists?

**Question**: Should the guard throw different errors for "group doesn't exist" vs "user not in group"?

**Recommendation**: No. This would require an extra database query and could leak information. Treat both as "access denied" (same error).

**Decision**: Not in scope for guards. Validation happens at route schema level (Zod validates UUID format).

### 2. Should guards cache membership lookups per-request?

**Question**: If a route uses both `requireRole` and `requireGroupMembership`, we query `group_members` twice. Should we cache?

**Recommendation**: Not initially. Premature optimization. If profiling shows this is a bottleneck, add caching to `sessionMiddleware` (attach `memberships` to request once).

**Decision**: Start without caching. Document as potential optimization if needed.

### 3. Should requireRole support role hierarchy?

**Question**: Should `requireRole('teacher')` automatically pass for 'group_admin' and 'system_admin'?

**Recommendation**: No. Guards are explicit checks. Role hierarchy belongs in CASL permissions (`can('manage', 'all')` for admins). Mixing concerns makes guards less predictable.

**Decision**: No hierarchy in guards. Use CASL for hierarchical permissions.

### 4. Should groupMembership always be attached to request?

**Question**: Should `sessionMiddleware` or `permissionMiddleware` proactively fetch and attach all memberships?

**Recommendation**: Not in this task. `requireGroupMembership` attaches it when needed. If future tasks need it universally, refactor then.

**Decision**: Optional decoration only when `requireGroupMembership` is used.

### 5. What about class membership guards?

**Question**: Should we add `requireClassMembership` for classes?

**Recommendation**: Not in this task (scope creep). Classes have their own `class_members` table. Add in future task if needed (E02-T007 perhaps).

**Decision**: Out of scope. Document as potential future enhancement.

## Performance Considerations

### Database Query Optimization

1. **Indexes** (already exist from schema design):
   - `group_members_user_id_idx` - Fast lookup for user's roles
   - `group_members_group_id_idx` - Fast lookup for group membership
   - Composite index on `(user_id, group_id)` via unique constraint

2. **Query Count**:
   - `requireRole`: 1 query (`findMany` for user's memberships)
   - `requireGroupMembership`: 1 query (`findFirst` for specific membership)
   - **Per-request overhead**: 0-2 queries depending on guards used

3. **Future Optimization**:
   - If profiling shows bottleneck, cache memberships in `sessionMiddleware`
   - Attach to `request.memberships` once, reuse in guards
   - Invalidate cache on role changes (requires pub/sub or TTL)

### Memory Usage

- Guards don't hold state (stateless functions)
- Database connections handled by Drizzle connection pool
- No in-memory caches (rely on PostgreSQL query performance)

### Execution Time

- **Target**: <10ms per guard (database query + conditional logic)
- **Acceptable**: <50ms (includes network latency to database)
- **Monitoring**: Log slow queries >100ms for investigation

## Documentation Requirements

### Code Comments

Each guard must have:
- JSDoc comment with description
- `@param` for all parameters
- `@returns` description
- `@example` showing usage in route

### README Updates

None required. Guards are internal middleware, not public API.

### Architecture Doc Updates

Update `docs/ARCHITECTURE.md` section "Authentication & Authorization":

Add subsection under "Authentication (Lucia)" → "Session middleware":

```markdown
### Authentication Guards

The API provides three levels of authentication/authorization guards:

| Guard | Purpose | Example |
|-------|---------|---------|
| `requireAuth` | Basic authentication check | `[app.requireAuth]` |
| `requireRole` | Role-based authorization | `[app.requireAuth, app.requireRole('teacher')]` |
| `requireGroupMembership` | Group membership check | `[app.requireAuth, app.requireGroupMembership(groupId)]` |

Guards are preHandler functions that throw errors if checks fail:
- `UnauthorizedError` (401) - Not authenticated
- `ForbiddenError` (403) - Authenticated but insufficient permissions

For fine-grained permissions (resource ownership, conditions), use CASL's `requirePermission` instead.
```

## Success Criteria

Task is complete when:

1. ✅ All 10 acceptance criteria are met
2. ✅ TypeScript compiles with zero errors (`pnpm typecheck`)
3. ✅ All tests pass (`pnpm test`)
4. ✅ Test coverage >80% for modified files
5. ✅ Code review approved by reviewer agent
6. ✅ Integration tests verify guards work in real routes
7. ✅ Documentation updated (inline comments + ARCHITECTURE.md)
8. ✅ No security vulnerabilities introduced (verified by code review)
9. ✅ Guards compose correctly with existing auth middleware
10. ✅ Error messages are user-friendly and don't leak sensitive info

---

## File Summary

**Files to Modify**:
1. `apps/api/src/middleware/auth.middleware.ts` - Add `requireRole` and `requireGroupMembership` guards
2. `docs/ARCHITECTURE.md` - Document authentication guards table

**Files to Create**:
- None (all changes are modifications)

**Tests to Create**:
1. `apps/api/src/__tests__/middleware/auth.middleware.test.ts` - Unit tests for guards (extend existing)
2. `apps/api/src/__tests__/integration/auth-guards.test.ts` - Integration tests with routes

**Estimated Lines of Code**:
- Implementation: ~120 lines (guards + types + imports)
- Unit tests: ~200 lines (15+ test cases)
- Integration tests: ~150 lines (8+ test cases)
- Documentation: ~20 lines (ARCHITECTURE.md updates)

**Total**: ~490 lines

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** APPROVED_WITH_RECOMMENDATIONS

### Executive Summary

This specification defines authentication guards for Fastify API routes. Since these are **developer-facing APIs** (not user-facing UI), this review focuses on **Developer Experience (DX)** - the ergonomics, clarity, and safety of the guard APIs.

**Overall Assessment**: The design is excellent with clear naming, strong type safety, and good composition. However, two critical DX issues should be addressed before implementation to prevent common mistakes and authorization bugs.

---

### Strengths

1. **Clear & Intuitive Naming**
   - `requireAuth`, `requireRole`, `requireGroupMembership` - names communicate intent perfectly
   - Follows Fastify ecosystem conventions (`require*` pattern)
   - Factory pattern is explicit (returns function, not boolean)

2. **Strong Type Safety**
   - Comprehensive TypeScript module augmentation
   - No `any` types used
   - Explicit return types on all functions
   - IDE autocomplete will work perfectly

3. **Excellent Composition**
   - Guards chain cleanly in `preHandler` arrays
   - Short-circuit behavior is predictable
   - Each guard validates independently

4. **Helpful Error Messages**
   - Role errors list all required roles: "requires: teacher, group_admin"
   - Proper 401 vs 403 distinction
   - Error context aids debugging

5. **Comprehensive Documentation**
   - JSDoc examples for each guard
   - Clear usage patterns
   - Edge cases documented
   - Security considerations addressed

6. **Defense in Depth**
   - Guards complement CASL (don't replace it)
   - Clear separation of concerns
   - No caching = immediate permission updates

---

### Critical Issues (Must Address Before Implementation)

#### Issue #1: Awkward Dynamic Group ID Pattern ⚠️ HIGH SEVERITY

**Problem**: The spec requires developers to manually call guards inside handlers for dynamic group IDs:

```typescript
// Current spec pattern (lines 190-198) - AWKWARD
app.get("/groups/:groupId/members", {
  preHandler: [app.requireAuth]
}, async (request, reply) => {
  // Guard called manually inside handler!
  await app.requireGroupMembership(request.params.groupId)(request, reply);
  // Business logic here...
});
```

**Why This Is Bad DX**:
- **Breaks preHandler pattern** - Forces auth logic into handler
- **Error-prone** - Easy to forget `await`, wrong parameters, or skip entirely
- **Inconsistent** - Static IDs use `preHandler`, dynamic IDs use manual calls
- **High frequency** - Most group routes need this pattern
- **Mixed concerns** - Handler does both authorization AND business logic

**Real-World Impact**:
```typescript
// Developer mistake #1: Forgot await
app.get("/groups/:groupId/members", ..., async (request) => {
  app.requireGroupMembership(request.params.groupId)(request, reply); // No await!
  // Bug: Code continues before guard completes
});

// Developer mistake #2: Wrong signature
await app.requireGroupMembership(request.params.groupId); // Missing (request, reply)

// Developer mistake #3: Forgot guard entirely
app.get("/groups/:groupId/members", ..., async (request) => {
  // Oops, no guard! Anyone authenticated can access
  const members = await getMembersForGroup(request.params.groupId);
});
```

**Recommended Solution**:

Add a helper decorator that extracts params before guards run:

```typescript
/**
 * Require group membership using route parameter.
 *
 * @param paramName - Name of route parameter containing group ID (default: "groupId")
 * @returns PreHandler that validates membership of parameterized group
 *
 * @example
 * ```typescript
 * app.get("/groups/:groupId/members", {
 *   preHandler: [app.requireAuth, app.requireGroupFromParams()]
 * }, handler);
 *
 * app.get("/teams/:teamId/roster", {
 *   preHandler: [app.requireAuth, app.requireGroupFromParams("teamId")]
 * }, handler);
 * ```
 */
app.decorate("requireGroupFromParams", (paramName: string = "groupId") => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const groupId = request.params[paramName];

    if (!groupId || typeof groupId !== 'string') {
      throw new ValidationError(`Missing or invalid route parameter: ${paramName}`);
    }

    // Reuse existing requireGroupMembership logic
    await app.requireGroupMembership(groupId)(request, reply);
  };
});

// Usage - clean and consistent
app.get("/groups/:groupId/members", {
  preHandler: [app.requireAuth, app.requireGroupFromParams()]
}, async (request, reply) => {
  // Guard already validated - just business logic here
  const members = await getMembersForGroup(request.params.groupId);
  return { members };
});
```

**Benefits**:
- Consistent `preHandler` pattern for all routes
- Impossible to forget authorization
- Type-safe parameter extraction
- Clear intent: "require group from :groupId param"

**Action Required**: Add `requireGroupFromParams` to implementation section

---

#### Issue #2: Confusing Role Scope ⚠️ MEDIUM SEVERITY

**Problem**: `requireRole('teacher')` checks if user has role in ANY group, not the current group context.

**Scenario**:
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
//      because they're a teacher in GroupA
```

**Why This Is Confusing**:
- Developers expect `requireRole` to respect group context
- Combining `requireGroupMembership` + `requireRole` doesn't work as expected
- Forces developers to manually check `request.groupMembership.role`
- Subtle authorization bug that's hard to catch in code review

**Current Workaround** (not documented):
```typescript
app.get("/groups/:groupId/assignments", ..., async (request) => {
  await app.requireGroupFromParams()(request, reply);

  // Manual check (error-prone, easy to forget)
  if (!['teacher', 'group_admin'].includes(request.groupMembership!.role)) {
    throw new ForbiddenError('Requires teacher role in this group');
  }

  // Business logic...
});
```

**Recommended Solution**:

Add `requireGroupRole` guard that checks role WITHIN the current group:

```typescript
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
 *     app.requireGroupRole('teacher', 'group_admin')
 *   ]
 * }, handler);
 * ```
 */
app.decorate("requireGroupRole", (...roles: MemberRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.groupMembership) {
      throw new Error(
        "requireGroupRole must be used after requireGroupMembership or requireGroupFromParams"
      );
    }

    if (!roles.includes(request.groupMembership.role)) {
      const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
      throw new ForbiddenError(
        `This action requires one of the following roles in this group: ${roleList}`
      );
    }
  };
});
```

**Benefits**:
- Clear distinction: `requireRole` = any group, `requireGroupRole` = this group
- Prevents subtle authorization bugs
- Composable with `requireGroupFromParams`
- Enforces correct guard order (throws if used without group context)

**Alternative**: Document that `requireRole` is global and developers must manually check `request.groupMembership.role` for group-scoped checks. (Not recommended - too error-prone)

**Action Required**: Add `requireGroupRole` to implementation section OR document manual pattern clearly

---

### Medium Priority Improvements

#### 3. Add Debug Logging

**Issue**: No visibility into why guards fail during development.

**Recommendation**:
```typescript
import { logger } from '@raptscallions/telemetry';

// In requireRole
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

**Benefits**: Troubleshooting auth issues becomes much easier.

---

#### 4. Add Performance Guidance

**Issue**: Spec mentions guards query database on every request but doesn't guide optimization.

**Recommendation**: Add to spec under "Performance Considerations":

```markdown
### When to Optimize Guards

Guards query the database on every request for immediate consistency. This is correct for security but may impact performance at scale.

**Monitor**: If guards consistently take >50ms, consider optimization:

1. **Request-level caching**: Fetch all memberships once in `sessionMiddleware`, attach to `request.memberships`
2. **Redis caching**: Cache role lookups with 1-5 minute TTL
3. **Denormalize**: Add `roles` array to JWT/session token, refresh on role change

**Don't optimize prematurely** - database queries with proper indexes are fast (<10ms).
```

---

#### 5. Semantic Role Aliases

**Issue**: Verbose repeated patterns for common role checks.

**Recommendation**:
```typescript
// Convenience aliases
app.decorate("requireAdmin", app.requireRole('system_admin', 'group_admin'));
app.decorate("requireTeacher", app.requireRole('teacher', 'group_admin', 'system_admin'));

// Usage
app.post("/admin/users", {
  preHandler: [app.requireAuth, app.requireAdmin]
}, handler);
```

**Benefits**: More readable code, fewer mistakes.

---

### Minor Suggestions

6. **Testing Utilities** - Add mock factories for easier guard testing
7. **TypeScript Examples** - Show type narrowing in documentation
8. **Error Context** - Include user ID and group ID in debug info (not user-facing errors)

---

### Security Assessment

✅ **Security posture is excellent**:
- Guards throw errors (don't return booleans)
- No caching = immediate permission updates
- SQL injection protected by Drizzle ORM
- Errors don't leak sensitive information
- No privilege escalation vectors
- Defense in depth (guards + CASL)

⚠️ **Minor concern**: Error "You are not a member of this group" confirms group exists.
- **Assessment**: Acceptable - group IDs are in URLs anyway, UUIDs prevent enumeration
- **Recommendation**: Keep as-is, document in security section

---

### Consistency Assessment

✅ **Excellent consistency**:
- Matches existing `requireAuth` and `requireActiveUser` patterns
- Uses Fastify decorator conventions
- Error types align with existing middleware
- TypeScript augmentation follows Fastify standards

---

### Recommendations by Priority

| Priority | Recommendation | Rationale |
|----------|---------------|-----------|
| **MUST** | Add `requireGroupFromParams` | Prevents common mistakes, makes dynamic group IDs ergonomic |
| **MUST** | Add `requireGroupRole` | Prevents subtle authorization bugs |
| **SHOULD** | Add debug logging | Improves troubleshooting experience |
| **SHOULD** | Add performance guidance | Helps developers know when to optimize |
| **NICE** | Add semantic aliases | Improves code readability |
| **NICE** | Add testing utilities | Makes guard testing easier |

---

### Conclusion

**Verdict: APPROVED_WITH_RECOMMENDATIONS**

This specification is **ready to proceed to architect review** with the understanding that the two MUST items will be addressed before implementation:

1. Add `requireGroupFromParams` helper (or equivalent solution)
2. Add `requireGroupRole` guard (or clearly document manual pattern)

The core design is excellent - these recommendations improve **developer ergonomics** and **prevent common mistakes**, but don't change the fundamental architecture.

**Risk Level**: LOW
- Guards are internal APIs used by our development team
- Mistakes won't create security holes (CASL provides defense-in-depth)
- But they will cause developer frustration and subtle bugs

**Next Steps**:
1. Analyst addresses two MUST items
2. Architect reviews overall design
3. Implementation proceeds with all guard variants

---

### Action Items for Analyst

Before finalizing spec:

- [ ] Add `requireGroupFromParams` decorator to implementation section
- [ ] Add `requireGroupRole` decorator to implementation section
- [ ] Add debug logging to guard implementations
- [ ] Add "When to Optimize" section to Performance Considerations
- [ ] Update test strategy to include new guard variants
- [ ] Update TypeScript augmentation for new decorators
