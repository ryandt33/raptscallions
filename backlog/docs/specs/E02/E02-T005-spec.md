# Implementation Spec: E02-T005

## Overview

Implement CASL-based authorization system with ability definitions for all four role types (system_admin, group_admin, teacher, student). Create Fastify middleware to build user abilities from group memberships and enforce permissions on routes. The system must support group hierarchy permissions using ltree queries and provide both route-level and resource-level permission checks.

This task builds on the session middleware from E02-T002 to add fine-grained authorization to the RaptScallions platform.

## Approach

### CASL Architecture

We'll use CASL's PureAbility with a builder pattern to define role-based permissions:

1. **Ability Builder**: Central function that creates ability instances based on user + memberships
2. **Actions**: Define CRUD operations plus `manage` (all actions)
3. **Subjects**: Define resource types (User, Group, Class, Tool, Assignment, etc.)
4. **Conditions**: Use CASL's condition matching for attribute-based checks (ownership, group membership)
5. **Hierarchy Support**: Special handling for group admins to manage descendant groups via ltree

### Middleware Architecture

1. **Request Decorator**: Add `ability` property to FastifyRequest (populated by middleware)
2. **onRequest Hook**: Runs after session middleware to build abilities from user + memberships
3. **requirePermission Factory**: PreHandler factory for route-level permission checks
4. **Helper Functions**: Utility functions for checking permissions on specific resources

### Group Hierarchy Strategy

For group admins, we'll fetch their managed group paths and use ltree queries to determine if they can manage descendant groups:

- Query user's group_admin groups → extract ltree paths
- For target group, check if its path starts with any managed path
- Example: Admin of `district.school1` can manage `district.school1.dept_math`

## Files to Create

| File                                       | Purpose                                       |
| ------------------------------------------ | --------------------------------------------- |
| `packages/auth/src/abilities.ts`           | CASL ability definitions and builder function |
| `packages/auth/src/permissions.ts`         | Permission middleware and helpers             |
| `packages/core/src/errors/common.error.ts` | Add ForbiddenError class (modify existing)    |

## Files to Modify

| File                                     | Changes                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `packages/auth/src/types.ts`             | Add ability-related types and Fastify augmentation |
| `packages/auth/src/index.ts`             | Export ability builder and permission helpers      |
| `packages/auth/package.json`             | Add @casl/ability dependency                       |
| `packages/core/src/errors/base.error.ts` | Add FORBIDDEN error code constant                  |
| `packages/core/src/errors/index.ts`      | Export ForbiddenError                              |

## Dependencies

### Package Dependencies

Add to `packages/auth/package.json`:

```json
{
  "dependencies": {
    "@casl/ability": "^6.5.0"
  }
}
```

### Task Dependencies

- **Requires**: E02-T002 (Sessions and auth middleware) - Must be DONE
  - Uses `request.user` populated by session middleware
  - Uses `request.session` for authentication context
  - Builds on existing Fastify decorators pattern

### Database Schema

No new tables required. Uses existing:

- `users` - User identity
- `groups` - Hierarchical organization with ltree paths
- `group_members` - User roles in groups (system_admin, group_admin, teacher, student)

## Implementation Details

### 1. Type Definitions

**File**: `packages/auth/src/types.ts`

Add the following types:

```typescript
import type { PureAbility } from "@casl/ability";

/**
 * Actions that can be performed on resources.
 * - create: Create new resource
 * - read: View resource
 * - update: Modify existing resource
 * - delete: Remove resource
 * - manage: All actions (wildcard)
 */
export type Actions = "create" | "read" | "update" | "delete" | "manage";

/**
 * Subjects (resource types) in the system.
 * - User: User accounts
 * - Group: Organizational units (districts, schools, departments)
 * - Class: Teaching classes within groups
 * - Tool: AI-powered tools (chat/product)
 * - Assignment: Assigned tools with due dates
 * - Session: Chat sessions
 * - Run: Product run executions
 * - all: Wildcard for all subjects
 */
export type Subjects =
  | "User"
  | "Group"
  | "Class"
  | "Tool"
  | "Assignment"
  | "Session"
  | "Run"
  | "all";

/**
 * Application ability type.
 * Represents what actions a user can perform on which subjects.
 */
export type AppAbility = PureAbility<[Actions, Subjects]>;

/**
 * Context passed to buildAbility function.
 */
export interface BuildAbilityContext {
  user: SessionUser;
  memberships: GroupMember[];
}

/**
 * Group path information for hierarchy checks.
 */
export interface GroupPath {
  groupId: string;
  path: string;
}

// Augment Fastify types
declare module "fastify" {
  interface FastifyRequest {
    ability: AppAbility;
  }
}
```

### 2. Error Classes

**File**: `packages/core/src/errors/base.error.ts`

Add FORBIDDEN to ErrorCode enum:

```typescript
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
} as const;
```

**File**: `packages/core/src/errors/common.error.ts`

Add ForbiddenError class:

```typescript
/**
 * Error thrown when user lacks permission for an action.
 * Defaults to HTTP 403 Forbidden.
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = "You do not have permission to perform this action"
  ) {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}
```

**File**: `packages/core/src/errors/index.ts`

Add to exports:

```typescript
export {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError, // ADD THIS
  ConflictError,
} from "./common.error.js";
```

### 3. Ability Builder

**File**: `packages/auth/src/abilities.ts`

````typescript
import { AbilityBuilder, PureAbility } from "@casl/ability";
import type {
  Actions,
  Subjects,
  AppAbility,
  BuildAbilityContext,
  GroupPath,
} from "./types.js";
import type { GroupMember } from "@raptscallions/db/schema";

/**
 * Build CASL ability instance for a user based on their group memberships.
 *
 * @param context - User and their group memberships
 * @returns AppAbility instance with user's permissions
 *
 * @example
 * ```typescript
 * const memberships = await db.query.groupMembers.findMany({
 *   where: eq(groupMembers.userId, user.id)
 * });
 *
 * const ability = buildAbility({ user, memberships });
 *
 * if (ability.can('create', 'Tool')) {
 *   // User can create tools
 * }
 * ```
 */
export function buildAbility({
  user,
  memberships,
}: BuildAbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  // System admin bypass - can do everything
  const isSystemAdmin = memberships.some((m) => m.role === "system_admin");
  if (isSystemAdmin) {
    can("manage", "all");
    return build();
  }

  // Group admin permissions
  const groupAdminGroups = memberships
    .filter((m) => m.role === "group_admin")
    .map((m) => m.groupId);

  if (groupAdminGroups.length > 0) {
    // Can manage groups they administer (hierarchy handled in helper)
    can("manage", "Group", { id: { $in: groupAdminGroups } });

    // Can manage users in their groups
    can("manage", "User", { groupId: { $in: groupAdminGroups } });

    // Can manage classes in their groups
    can("manage", "Class", { groupId: { $in: groupAdminGroups } });

    // Can read all tools in their groups
    can("read", "Tool", { groupId: { $in: groupAdminGroups } });

    // Can manage assignments in their groups
    can("manage", "Assignment", { groupId: { $in: groupAdminGroups } });
  }

  // Teacher permissions
  const teacherGroups = memberships
    .filter((m) => m.role === "teacher")
    .map((m) => m.groupId);

  if (teacherGroups.length > 0) {
    // Can create tools in their groups
    can("create", "Tool", { groupId: { $in: teacherGroups } });

    // Can manage their own tools
    can(["read", "update", "delete"], "Tool", { createdBy: user.id });

    // Can create assignments in their groups
    can("create", "Assignment", { groupId: { $in: teacherGroups } });

    // Can manage their own assignments
    can(["read", "update", "delete"], "Assignment", { createdBy: user.id });

    // Can read classes in their groups
    can("read", "Class", { groupId: { $in: teacherGroups } });

    // Can read users in their groups
    can("read", "User", { groupId: { $in: teacherGroups } });

    // Can read sessions for their tools
    can("read", "Session", { toolCreatedBy: user.id });
  }

  // Student permissions (everyone gets these)
  // Students can read tools assigned to them
  can("read", "Tool", { assignedTo: user.id });

  // Students can read assignments assigned to them
  can("read", "Assignment", { assignedTo: user.id });

  // Students can manage their own sessions
  can("create", "Session", { userId: user.id });
  can(["read", "update", "delete"], "Session", { userId: user.id });

  // Students can manage their own product runs
  can("create", "Run", { userId: user.id });
  can("read", "Run", { userId: user.id });

  // All users can read their own profile
  can("read", "User", { id: user.id });
  can("update", "User", { id: user.id });

  return build();
}

/**
 * Check if user can manage a group based on ltree hierarchy.
 *
 * Group admins can manage their assigned groups AND all descendant groups.
 * This uses PostgreSQL ltree path matching.
 *
 * @param ability - User's ability instance
 * @param targetGroupId - Group to check permissions for
 * @param userGroupPaths - Paths of groups the user administers
 * @param targetGroupPath - Path of the target group
 * @returns true if user can manage the group
 *
 * @example
 * ```typescript
 * const userPaths = [{ groupId: 'g1', path: 'district.school1' }];
 * const targetPath = 'district.school1.dept_math';
 *
 * const canManage = canManageGroupHierarchy(
 *   ability,
 *   'g2',
 *   userPaths,
 *   targetPath
 * );
 * // Returns true (dept_math is descendant of school1)
 * ```
 */
export function canManageGroupHierarchy(
  ability: AppAbility,
  targetGroupId: string,
  userGroupPaths: GroupPath[],
  targetGroupPath: string
): boolean {
  // First check if user can manage the exact group
  if (ability.can("manage", "Group", { id: targetGroupId })) {
    return true;
  }

  // Check if target group is descendant of any managed group
  // ltree path matching: 'district.school1.dept' starts with 'district.school1'
  return userGroupPaths.some(
    ({ path }) =>
      targetGroupPath.startsWith(path + ".") || targetGroupPath === path
  );
}
````

### 4. Permission Middleware and Helpers

**File**: `packages/auth/src/permissions.ts`

````typescript
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { PureAbility } from "@casl/ability";
import { db } from "@raptscallions/db";
import { groupMembers, groups } from "@raptscallions/db/schema";
import { eq, inArray } from "drizzle-orm";
import { buildAbility, canManageGroupHierarchy } from "./abilities.js";
import { ForbiddenError } from "@raptscallions/core";
import type { Actions, Subjects, AppAbility, GroupPath } from "./types.js";

/**
 * Permission middleware plugin for Fastify.
 *
 * Adds:
 * 1. request.ability - Populated for all requests (even unauthenticated)
 * 2. app.requirePermission() - PreHandler factory for route-level checks
 * 3. app.checkPermission() - Helper for resource-level checks
 */
export const permissionMiddleware: FastifyPluginAsync = async (app) => {
  // Decorate request with ability (initialized to empty)
  app.decorateRequest("ability", null);

  /**
   * onRequest hook to build ability from user's group memberships.
   * Runs after session middleware (which populates request.user).
   */
  app.addHook("onRequest", async (request, reply) => {
    // No user? Create empty ability
    if (!request.user) {
      request.ability = new PureAbility([]);
      return;
    }

    // Fetch user's group memberships
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    // Build and attach ability
    request.ability = buildAbility({
      user: request.user,
      memberships,
    });
  });

  /**
   * Factory function to create permission check preHandler.
   *
   * @param action - Action to check (create, read, update, delete, manage)
   * @param subject - Subject to check (User, Group, Tool, etc.)
   * @returns Fastify preHandler that throws ForbiddenError if permission denied
   *
   * @example
   * ```typescript
   * app.post('/groups', {
   *   preHandler: [app.requireAuth, app.requirePermission('create', 'Group')]
   * }, async (request, reply) => {
   *   // Only users with create Group permission reach here
   * });
   * ```
   */
  app.decorate("requirePermission", (action: Actions, subject: Subjects) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.ability.can(action, subject)) {
        throw new ForbiddenError(`You cannot ${action} ${subject}`);
      }
    };
  });

  /**
   * Helper to check permission on a specific resource instance.
   *
   * @param ability - User's ability instance
   * @param action - Action to check
   * @param subject - Subject name
   * @param resource - Actual resource object with fields
   * @returns true if user can perform action on resource
   *
   * @example
   * ```typescript
   * const tool = await db.query.tools.findFirst({ where: eq(tools.id, toolId) });
   *
   * if (!checkResourcePermission(request.ability, 'delete', 'Tool', tool)) {
   *   throw new ForbiddenError('You cannot delete this tool');
   * }
   * ```
   */
  app.decorate(
    "checkResourcePermission",
    (
      ability: AppAbility,
      action: Actions,
      subject: Subjects,
      resource: Record<string, unknown>
    ): boolean => {
      return ability.can(action, subject, resource);
    }
  );

  /**
   * Helper to fetch group paths for hierarchy permission checks.
   *
   * @param groupIds - Array of group IDs to fetch paths for
   * @returns Array of { groupId, path } objects
   *
   * @example
   * ```typescript
   * const paths = await app.getGroupPaths(['g1', 'g2']);
   * const canManage = canManageGroupHierarchy(ability, targetId, paths, targetPath);
   * ```
   */
  app.decorate(
    "getGroupPaths",
    async (groupIds: string[]): Promise<GroupPath[]> => {
      if (groupIds.length === 0) {
        return [];
      }

      const groupsData = await db.query.groups.findMany({
        where: inArray(groups.id, groupIds),
        columns: {
          id: true,
          path: true,
        },
      });

      return groupsData.map((g) => ({
        groupId: g.id,
        path: g.path,
      }));
    }
  );
};

/**
 * Augment Fastify instance with permission decorators.
 */
declare module "fastify" {
  interface FastifyInstance {
    requirePermission: (
      action: Actions,
      subject: Subjects
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    checkResourcePermission: (
      ability: AppAbility,
      action: Actions,
      subject: Subjects,
      resource: Record<string, unknown>
    ) => boolean;

    getGroupPaths: (groupIds: string[]) => Promise<GroupPath[]>;
  }
}
````

### 5. Package Exports

**File**: `packages/auth/src/index.ts`

Add to existing exports:

```typescript
// Export ability builder and helpers
export { buildAbility, canManageGroupHierarchy } from "./abilities.js";

// Export permission middleware
export { permissionMiddleware } from "./permissions.js";

// Export permission types (add to existing type exports)
export type {
  Actions,
  Subjects,
  AppAbility,
  BuildAbilityContext,
  GroupPath,
} from "./types.js";
```

## Test Strategy

### Unit Tests

**File**: `packages/auth/__tests__/abilities.test.ts`

Test ability builder for all role types:

```typescript
describe("buildAbility", () => {
  describe("system_admin", () => {
    it("should allow manage all", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "system_admin", groupId: "g1" }],
      });

      expect(ability.can("manage", "all")).toBe(true);
      expect(ability.can("delete", "User")).toBe(true);
      expect(ability.can("create", "Group")).toBe(true);
    });
  });

  describe("group_admin", () => {
    it("should allow managing groups they administer", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "group_admin", groupId: "g1" }],
      });

      expect(ability.can("manage", "Group", { id: "g1" })).toBe(true);
      expect(ability.can("manage", "Group", { id: "g2" })).toBe(false);
    });

    it("should allow managing users in their groups", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "group_admin", groupId: "g1" }],
      });

      expect(ability.can("create", "User", { groupId: "g1" })).toBe(true);
      expect(ability.can("create", "User", { groupId: "g2" })).toBe(false);
    });
  });

  describe("teacher", () => {
    it("should allow creating tools in their groups", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "teacher", groupId: "g1" }],
      });

      expect(ability.can("create", "Tool", { groupId: "g1" })).toBe(true);
      expect(ability.can("create", "Tool", { groupId: "g2" })).toBe(false);
    });

    it("should allow managing their own tools", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "teacher", groupId: "g1" }],
      });

      expect(ability.can("delete", "Tool", { createdBy: mockUser.id })).toBe(
        true
      );
      expect(ability.can("delete", "Tool", { createdBy: "other-user" })).toBe(
        false
      );
    });
  });

  describe("student", () => {
    it("should allow reading assigned tools", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "student", groupId: "g1" }],
      });

      expect(ability.can("read", "Tool", { assignedTo: mockUser.id })).toBe(
        true
      );
      expect(ability.can("read", "Tool", { assignedTo: "other-user" })).toBe(
        false
      );
    });

    it("should allow managing own sessions", () => {
      const ability = buildAbility({
        user: mockUser,
        memberships: [{ role: "student", groupId: "g1" }],
      });

      expect(ability.can("create", "Session", { userId: mockUser.id })).toBe(
        true
      );
      expect(ability.can("delete", "Session", { userId: mockUser.id })).toBe(
        true
      );
    });
  });
});

describe("canManageGroupHierarchy", () => {
  it("should allow managing exact group", () => {
    const ability = buildAbility({
      user: mockUser,
      memberships: [{ role: "group_admin", groupId: "g1" }],
    });

    const result = canManageGroupHierarchy(
      ability,
      "g1",
      [{ groupId: "g1", path: "district.school1" }],
      "district.school1"
    );

    expect(result).toBe(true);
  });

  it("should allow managing descendant groups", () => {
    const ability = buildAbility({
      user: mockUser,
      memberships: [{ role: "group_admin", groupId: "g1" }],
    });

    const result = canManageGroupHierarchy(
      ability,
      "g2",
      [{ groupId: "g1", path: "district.school1" }],
      "district.school1.dept_math"
    );

    expect(result).toBe(true);
  });

  it("should deny managing sibling groups", () => {
    const ability = buildAbility({
      user: mockUser,
      memberships: [{ role: "group_admin", groupId: "g1" }],
    });

    const result = canManageGroupHierarchy(
      ability,
      "g2",
      [{ groupId: "g1", path: "district.school1" }],
      "district.school2"
    );

    expect(result).toBe(false);
  });
});
```

**File**: `packages/auth/__tests__/permissions.test.ts`

Test permission middleware integration:

```typescript
describe("permissionMiddleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(permissionMiddleware);
  });

  it("should create empty ability for unauthenticated requests", async () => {
    app.get("/test", async (request) => {
      return { canCreate: request.ability.can("create", "Tool") };
    });

    const response = await app.inject({ method: "GET", url: "/test" });
    expect(JSON.parse(response.body).canCreate).toBe(false);
  });

  it("should build ability from user memberships", async () => {
    // Mock authenticated request
    app.decorateRequest("user", mockUser);
    // ... test ability is built correctly
  });

  it("should expose requirePermission decorator", () => {
    expect(app.requirePermission).toBeDefined();
    expect(typeof app.requirePermission).toBe("function");
  });

  it("should throw ForbiddenError when permission denied", async () => {
    app.get(
      "/protected",
      {
        preHandler: [app.requirePermission("manage", "all")],
      },
      async () => ({ ok: true })
    );

    const response = await app.inject({ method: "GET", url: "/protected" });
    expect(response.statusCode).toBe(403);
  });
});
```

### Integration Tests

**File**: `apps/api/__tests__/integration/permissions.test.ts`

Test full request lifecycle with permission checks:

```typescript
describe("Permission Integration", () => {
  it("should allow group admin to create users in their group", async () => {
    // Create user with group_admin role
    // Make authenticated request to POST /users
    // Verify success
  });

  it("should deny group admin from creating users in other groups", async () => {
    // Create user with group_admin role in group A
    // Try to create user in group B
    // Verify 403 Forbidden
  });

  it("should allow teacher to create tools in their group", async () => {
    // Create user with teacher role
    // Make authenticated request to POST /tools
    // Verify success
  });

  it("should deny student from creating tools", async () => {
    // Create user with student role
    // Try to create tool
    // Verify 403 Forbidden
  });

  it("should allow group admin to manage descendant groups", async () => {
    // Create group hierarchy: district > school > dept
    // Create user as admin of school
    // Try to update dept (descendant)
    // Verify success
  });
});
```

## Acceptance Criteria Breakdown

### AC1: CASL ability definitions for all four roles

**Implementation**: `packages/auth/src/abilities.ts` - `buildAbility()` function

Checks each role's memberships and builds appropriate rules:

- System admin: `can('manage', 'all')`
- Group admin: `can('manage', 'Group', { id: { $in: groupAdminGroups } })`
- Teacher: `can('create', 'Tool', { groupId: { $in: teacherGroups } })`
- Student: `can('read', 'Tool', { assignedTo: user.id })`

**Tests**: Verify each role gets correct permissions

### AC2: Abilities account for group-scoped permissions using ltree hierarchy

**Implementation**:

- `packages/auth/src/abilities.ts` - `canManageGroupHierarchy()` function
- Uses ltree path string matching: `targetPath.startsWith(adminPath)`

**Tests**: Verify descendant group permissions work correctly

### AC3: buildAbility helper creates ability instance from user + memberships

**Implementation**: `packages/auth/src/abilities.ts` - `buildAbility()` function

Takes `{ user, memberships }` and returns `AppAbility` instance.

**Tests**: Verify ability instance is correctly built for all role combinations

### AC4: Permission check helper validates user can perform action on resource

**Implementation**: `packages/auth/src/permissions.ts` - `checkResourcePermission()` decorator

Wraps CASL's `ability.can(action, subject, resource)` for type safety.

**Tests**: Verify resource-level permission checks work

### AC5: Fastify decorator adds `can()` method to request object

**Implementation**: `packages/auth/src/permissions.ts` - `app.decorateRequest('ability', null)`

Actually adds `ability` property (which has `.can()` method), not `can()` directly.

**Tests**: Verify `request.ability` is available and has correct type

### AC6: requirePermission middleware blocks requests without permission

**Implementation**: `packages/auth/src/permissions.ts` - `app.requirePermission()` decorator

Factory that returns preHandler which throws `ForbiddenError` if permission denied.

**Tests**: Verify 403 response when permission denied

### AC7: System admins bypass all permission checks

**Implementation**: `packages/auth/src/abilities.ts` - First check in `buildAbility()`

If any membership has `role === 'system_admin'`, return `can('manage', 'all')` immediately.

**Tests**: Verify system admin can perform any action

### AC8: Group admins can manage descendant groups (ltree queries)

**Implementation**:

- `packages/auth/src/abilities.ts` - `canManageGroupHierarchy()` function
- `packages/auth/src/permissions.ts` - `app.getGroupPaths()` helper

Uses ltree path matching to check if target group is descendant.

**Tests**: Verify hierarchy permissions with real ltree paths

### AC9: Teachers can access resources in their groups

**Implementation**: `packages/auth/src/abilities.ts` - Teacher section in `buildAbility()`

Grants:

- `can('create', 'Tool', { groupId: { $in: teacherGroups } })`
- `can('read', 'Class', { groupId: { $in: teacherGroups } })`
- Plus ownership-based permissions for their own tools/assignments

**Tests**: Verify teachers can create/read resources in their groups

### AC10: Students can only access assigned resources

**Implementation**: `packages/auth/src/abilities.ts` - Student section in `buildAbility()`

Grants:

- `can('read', 'Tool', { assignedTo: user.id })`
- `can('read', 'Assignment', { assignedTo: user.id })`
- `can('manage', 'Session', { userId: user.id })`

**Tests**: Verify students cannot access non-assigned resources

## Edge Cases

### 1. User with No Group Memberships

**Scenario**: User exists but has no group_members records.

**Handling**: `buildAbility()` receives empty memberships array. Only gets base permissions (read own profile, create own sessions).

**Test**: Verify user with empty memberships array gets minimal permissions.

### 2. User with Multiple Roles in Different Groups

**Scenario**: User is teacher in group A and student in group B.

**Handling**: `buildAbility()` processes all memberships, aggregating permissions. User gets teacher permissions in group A and student permissions in group B.

**Test**: Create user with teacher + student roles, verify they can create tools in teacher group but not student group.

### 3. System Admin Override Behavior

**Scenario**: User is system_admin in one group, student in another.

**Handling**: System admin check happens first - user gets `manage all` regardless of other roles.

**Test**: Verify system admin with mixed roles gets full permissions.

### 4. Deleted Groups/Users

**Scenario**: User tries to access resource in soft-deleted group, or resource owned by soft-deleted user.

**Handling**:

- Group memberships for deleted groups should be filtered out when fetching
- Resource queries should include `isNull(deletedAt)` filter
- Permission checks happen after resource is found, so deleted resources return 404 before 403

**Test**: Verify deleted groups don't grant permissions, deleted resources return 404.

### 5. Permission Checks on Non-Existent Resources

**Scenario**: User tries to delete tool with ID that doesn't exist.

**Handling**: Resource fetch returns null → throw NotFoundError (404) before permission check (403).

**Pattern**:

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });
if (!tool) throw new NotFoundError("Tool", id);
if (!request.ability.can("delete", "Tool", tool)) throw new ForbiddenError();
```

**Test**: Verify 404 returned for non-existent resources before permission error.

### 6. Concurrent Group Membership Changes

**Scenario**: User's group memberships change between ability build and permission check.

**Handling**: Ability is built once per request in onRequest hook. Changes won't take effect until next request.

**Mitigation**: Document that permission changes require new session/request.

**Test**: Not practical to test, but document behavior.

### 7. Malformed ltree Paths

**Scenario**: Group has invalid ltree path format.

**Handling**: ltree validation should happen at group creation. If somehow invalid path exists, string comparison will fail safely (no match).

**Test**: Integration test with malformed path (should not crash).

### 8. Empty Group Paths Array

**Scenario**: `canManageGroupHierarchy()` called with empty userGroupPaths array.

**Handling**: `userGroupPaths.some()` returns false for empty array - correctly denies permission.

**Test**: Verify empty paths array denies permission.

## Security Considerations

### 1. Prevent Privilege Escalation

**Threat**: User tries to assign themselves system_admin role.

**Mitigation**:

- Role assignment routes must check `request.ability.can('manage', 'User', { groupId })`
- System admin role can only be granted by existing system admin
- Database constraints prevent invalid group_id references

**Implementation**: Validate in user/group membership creation routes.

### 2. Validate ltree Paths to Prevent Injection

**Threat**: Attacker crafts malicious ltree path to gain access.

**Mitigation**:

- ltree paths come from database, not user input
- Group creation validates path format with Zod schema
- String comparison is safe (no SQL injection risk)

**Implementation**: Path validation in group creation service.

### 3. Rate Limiting for Permission Checks

**Threat**: Attacker floods permission checks to discover resource structure.

**Mitigation**:

- Apply rate limiting at route level (general rate limiter)
- Permission checks use in-memory CASL (very fast, no DB hit)
- Membership fetching is cached per request

**Implementation**: Use existing rate limiting middleware (out of scope for this task).

### 4. Audit Logging for Denied Permissions

**Threat**: Need to detect unauthorized access attempts.

**Mitigation**:

- Log all ForbiddenError throws with user ID, action, subject
- Include in request logger output
- Monitor for patterns of denied access

**Implementation**: Add logging to `requirePermission()` and error handler.

Example:

```typescript
if (!request.ability.can(action, subject)) {
  logger.warn(
    {
      userId: request.user?.id,
      action,
      subject,
      path: request.url,
    },
    "Permission denied"
  );
  throw new ForbiddenError(`You cannot ${action} ${subject}`);
}
```

### 5. Sensitive Data in Ability Rules

**Threat**: Ability rules might expose sensitive data in error messages.

**Mitigation**:

- Don't include sensitive data in error messages
- Generic "You cannot X Y" messages
- Detailed reasons logged server-side only

**Implementation**: Use generic ForbiddenError messages.

## Implementation Order

Suggested sequence for implementing this task:

1. **Install dependency** (1 min)

   - Add `@casl/ability` to `packages/auth/package.json`
   - Run `pnpm install`

2. **Add error classes** (5 min)

   - Add `FORBIDDEN` to ErrorCode enum
   - Create `ForbiddenError` class
   - Export from index

3. **Define types** (10 min)

   - Add Actions, Subjects, AppAbility types to `packages/auth/src/types.ts`
   - Add BuildAbilityContext, GroupPath interfaces
   - Add Fastify augmentation

4. **Implement ability builder** (30 min)

   - Create `packages/auth/src/abilities.ts`
   - Implement `buildAbility()` function
   - Implement `canManageGroupHierarchy()` helper
   - Add comprehensive JSDoc comments

5. **Implement middleware** (30 min)

   - Create `packages/auth/src/permissions.ts`
   - Add request decorator
   - Add onRequest hook to build abilities
   - Implement `requirePermission()` factory
   - Implement `checkResourcePermission()` helper
   - Implement `getGroupPaths()` helper

6. **Export from package** (5 min)

   - Update `packages/auth/src/index.ts` with new exports
   - Verify no circular dependencies

7. **Write unit tests** (60 min)

   - Test `buildAbility()` for all roles
   - Test `canManageGroupHierarchy()` for hierarchy cases
   - Test permission middleware decorators
   - Aim for 100% coverage

8. **Write integration tests** (45 min)

   - Test full request lifecycle with permissions
   - Test route-level and resource-level checks
   - Test edge cases (deleted groups, non-existent resources)
   - Test hierarchy permissions with real DB

9. **Manual testing** (30 min)

   - Start API server
   - Test each role's permissions manually
   - Verify error messages are clear
   - Test with real group hierarchy

10. **Documentation** (15 min)
    - Add usage examples to JSDoc
    - Update package README if needed
    - Document any gotchas

**Total Estimated Time**: 3-4 hours

## Usage Examples

### Route-Level Permission Check

```typescript
// apps/api/src/routes/tools.routes.ts
import { FastifyPluginAsync } from "fastify";

export const toolsRoutes: FastifyPluginAsync = async (app) => {
  // Only users who can create Tools can access this route
  app.post(
    "/tools",
    {
      preHandler: [app.requireAuth, app.requirePermission("create", "Tool")],
    },
    async (request, reply) => {
      // User has permission to create tools
      const tool = await toolService.create(request.body);
      return reply.status(201).send(tool);
    }
  );
};
```

### Resource-Level Permission Check

```typescript
// Check permission on specific tool instance
app.delete(
  "/tools/:id",
  {
    preHandler: [app.requireAuth],
  },
  async (request, reply) => {
    const tool = await db.query.tools.findFirst({
      where: eq(tools.id, request.params.id),
    });

    if (!tool) {
      throw new NotFoundError("Tool", request.params.id);
    }

    // Check if user can delete THIS specific tool
    if (!app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
      throw new ForbiddenError("You cannot delete this tool");
    }

    await toolService.delete(tool.id);
    return reply.status(204).send();
  }
);
```

### Group Hierarchy Permission Check

```typescript
// Check if user can manage a group (including descendants)
app.put(
  "/groups/:id",
  {
    preHandler: [app.requireAuth],
  },
  async (request, reply) => {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, request.params.id),
    });

    if (!group) {
      throw new NotFoundError("Group", request.params.id);
    }

    // Get user's group admin paths
    const memberships = await db.query.groupMembers.findMany({
      where: and(
        eq(groupMembers.userId, request.user!.id),
        eq(groupMembers.role, "group_admin")
      ),
    });

    const groupAdminIds = memberships.map((m) => m.groupId);
    const adminPaths = await app.getGroupPaths(groupAdminIds);

    // Check hierarchy permission
    if (
      !canManageGroupHierarchy(
        request.ability,
        group.id,
        adminPaths,
        group.path
      )
    ) {
      throw new ForbiddenError("You cannot manage this group");
    }

    // User can manage this group
    await groupService.update(group.id, request.body);
    return reply.send({ data: group });
  }
);
```

### Manual Permission Check in Service

```typescript
// Check permission in service layer
export class ToolService {
  async update(
    toolId: string,
    data: UpdateToolInput,
    ability: AppAbility
  ): Promise<Tool> {
    const tool = await db.query.tools.findFirst({
      where: eq(tools.id, toolId),
    });

    if (!tool) {
      throw new NotFoundError("Tool", toolId);
    }

    if (!ability.can("update", "Tool", tool)) {
      throw new ForbiddenError("You cannot update this tool");
    }

    // Perform update...
  }
}
```

## Open Questions

None - the specification is complete based on the task requirements and existing codebase patterns. All ambiguities have been resolved through examination of:

- Existing session middleware implementation
- Database schema for users, groups, group_members
- Error handling patterns
- Fastify middleware patterns

The implementation follows established conventions and integrates cleanly with the existing authentication system.

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Status:** APPROVED with recommendations

### Executive Summary

This specification implements a sound permission model with clear role hierarchies and appropriate access controls. The developer experience (DX) is well-considered with type-safe APIs and helpful error messages. However, there are several UX concerns around error messaging clarity, permission discovery, and debugging that should be addressed.

**Overall Assessment:** ✅ APPROVED with SHOULD FIX recommendations

### Strengths

1. **Clear Role Hierarchy**: The four-role model (system_admin → group_admin → teacher → student) aligns well with educational institution structures
2. **Type Safety**: Excellent use of TypeScript to prevent permission bugs at compile time
3. **Hierarchical Permissions**: ltree-based group hierarchy matches real-world organizational structures
4. **Consistent API**: The `request.ability.can()` pattern is intuitive for developers
5. **Ownership Model**: Clear distinction between group-scoped and ownership-based permissions (teachers own their tools)

### Critical Issues (MUST FIX)

None identified. The spec is technically sound and ready for implementation.

### Major Concerns (SHOULD FIX)

#### 1. Error Message UX - Insufficient Context

**Issue:** Generic "You cannot create Tool" messages don't help users understand WHY they lack permission.

**Current Implementation (lines 428-431):**

```typescript
if (!request.ability.can(action, subject)) {
  throw new ForbiddenError(`You cannot ${action} ${subject}`);
}
```

**Problem:** A teacher denied access to create a Tool could be denied for multiple reasons:

- Not a member of the target group
- Not a teacher role in that group
- The group doesn't allow tool creation
- The tool type is restricted

**Recommendation:**

```typescript
if (!request.ability.can(action, subject)) {
  // Include contextual reason in error
  const reason = determinePermissionDenialReason(
    request.ability,
    action,
    subject
  );
  throw new ForbiddenError({
    message: `You cannot ${action} ${subject}`,
    reason,
    requiredRole: getMinimumRoleForAction(action, subject),
  });
}
```

**Example improved error:**

```json
{
  "error": "You cannot create Tool",
  "code": "FORBIDDEN",
  "details": {
    "reason": "You must be a teacher or administrator in this group",
    "requiredRole": "teacher",
    "yourRoles": ["student"]
  }
}
```

**Impact:** Medium - Teachers and admins will frequently encounter permission errors when learning the system or making mistakes.

---

#### 2. Permission Discovery - No Introspection API

**Issue:** No way for UI to discover what actions a user CAN perform without trial-and-error.

**Missing Capability:** Frontend needs to know:

- Which groups can the user create tools in?
- Can this user assign this tool to students?
- Should we show the "Delete" button on this resource?

**Current Workaround:** Frontend must replicate permission logic or show all buttons and handle 403 errors.

**Recommendation:** Add permission introspection helper:

```typescript
/**
 * Get list of groups where user can perform action.
 * Useful for populating dropdowns and filtering UI.
 */
app.decorate(
  "getAuthorizedGroups",
  async (
    userId: string,
    action: Actions,
    subject: Subjects
  ): Promise<Group[]> => {
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId),
    });

    // Filter groups based on role permissions
    const authorizedGroupIds = memberships
      .filter((m) => canPerformActionInRole(m.role, action, subject))
      .map((m) => m.groupId);

    return db.query.groups.findMany({
      where: inArray(groups.id, authorizedGroupIds),
    });
  }
);
```

**Example Usage:**

```typescript
// GET /api/me/authorized-groups?action=create&subject=Tool
// Returns: [{ id: 'g1', name: 'Math Department' }]
```

**Impact:** Medium - UI will be clunky without this, showing options that result in errors.

---

#### 3. Debugging Experience - No Audit Trail

**Issue:** When permission denied, no way to understand the decision-making process.

**Scenario:** Group admin thinks they should be able to delete a tool but gets 403.

**Current State:** Error says "You cannot delete Tool" with no explanation of:

- Which permission rule blocked them?
- What conditions were checked?
- What would they need to gain this permission?

**Recommendation:** Add debug mode (development only) that explains permission decisions:

```typescript
// In development, add verbose permission logging
if (process.env.NODE_ENV === "development") {
  const reasons = ability.relevantRuleFor(action, subject);
  logger.debug(
    {
      userId: request.user.id,
      action,
      subject,
      allowed: false,
      rulesChecked: reasons,
      userRoles: memberships.map((m) => m.role),
    },
    "Permission denied - debug info"
  );
}
```

**Example Debug Output:**

```
Permission denied: delete Tool
User roles: [teacher]
Rules checked:
  ✗ can('delete', 'Tool', { createdBy: user.id }) - FAILED: createdBy is 'other-user'
  ✗ can('manage', 'Tool', { groupId: { $in: ['g1'] } }) - FAILED: user not group_admin
Suggestion: Only tool creator or group admins can delete tools
```

**Impact:** Low - Only affects developer debugging, but significantly improves DX.

---

#### 4. Role Confusion - Teacher vs Group Admin Overlap

**Issue:** Teachers can create tools in their groups, but group admins can only READ tools in their groups. This is counterintuitive.

**From spec (lines 249-263):**

```typescript
// Group admins can only READ tools
can("read", "Tool", { groupId: { $in: groupAdminGroups } });

// But teachers can CREATE and MANAGE their own tools
can("create", "Tool", { groupId: { $in: teacherGroups } });
can(["read", "update", "delete"], "Tool", { createdBy: user.id });
```

**Confusing Scenario:**

- Alice is group_admin of "Math Department"
- Bob is teacher in "Math Department"
- Bob can create tools in Math Department, but Alice (the admin!) cannot
- Alice can only read tools others created

**Question:** Is this intentional? It seems like group admins should be able to do everything teachers can do, plus more.

**Recommendation:** Clarify the role model. Likely:

```typescript
// Group admins should be able to create tools too
if (groupAdminGroups.length > 0) {
  can("create", "Tool", { groupId: { $in: groupAdminGroups } });
  can("manage", "Tool", { groupId: { $in: groupAdminGroups } }); // Can manage ALL tools in group
}
```

**Impact:** Medium - This could confuse admins and require workarounds (making admins also teachers).

---

### Minor Issues (NICE TO HAVE)

#### 5. Performance - N+1 Query for Memberships

**Issue:** Every request fetches user's group memberships (line 399-401).

**Current:**

```typescript
app.addHook('onRequest', async (request, reply) => {
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, request.user.id),
  });
```

**Optimization:** Cache memberships in session or Redis (invalidate on membership change).

**Impact:** Low - Only matters at scale, but easy to optimize later.

---

#### 6. Student Permission Granularity

**Issue:** Students get blanket permission to read "assigned" tools, but no concept of class-specific access.

**From spec (line 296):**

```typescript
// Students can read tools assigned to them
can("read", "Tool", { assignedTo: user.id });
```

**Missing:** What if tool is assigned to student's Class (not individually)? The permission model doesn't account for class roster membership.

**Recommendation:** Add class-based permissions:

```typescript
// Get user's class memberships
const studentClasses = await db.query.classRosters.findMany({
  where: eq(classRosters.userId, user.id),
});

// Students can read tools assigned to their classes
can("read", "Tool", { classId: { $in: studentClasses.map((c) => c.classId) } });
can("read", "Assignment", {
  classId: { $in: studentClasses.map((c) => c.classId) },
});
```

**Impact:** Medium - May block implementation of class-wide assignments (common use case).

---

#### 7. Error Message Consistency - Different Error Types

**Issue:** Spec mixes NotFoundError (404) and ForbiddenError (403) in resource checks (lines 897-906).

**Pattern:**

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });
if (!tool) throw new NotFoundError("Tool", id);
if (!request.ability.can("delete", "Tool", tool)) throw new ForbiddenError();
```

**UX Concern:** This leaks information. A malicious user can probe for resource existence:

- 404 = "Resource doesn't exist"
- 403 = "Resource exists, but you can't access it"

**Security Best Practice:** Always return 404 for both cases unless user has read permission:

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });
if (!tool || !request.ability.can("read", "Tool", tool)) {
  throw new NotFoundError("Tool", id); // Hide existence from unauthorized users
}
if (!request.ability.can("delete", "Tool", tool)) {
  throw new ForbiddenError();
}
```

**Impact:** Low - Minor security concern, mostly theoretical.

---

### Positive UX Patterns

1. **Ownership Model**: Teachers owning their tools (line 276) matches teacher mental models
2. **Hierarchical Groups**: ltree descendant management (line 354-358) matches org chart intuitions
3. **Type Safety**: TypeScript prevents typos in permission checks at compile time
4. **Fail-Safe Defaults**: Unauthenticated users get empty ability (line 394) - secure by default
5. **Clear Examples**: Usage examples (lines 1067-1178) show both route-level and resource-level patterns

---

### Recommendations Summary

| Issue                                  | Priority     | Action                                            |
| -------------------------------------- | ------------ | ------------------------------------------------- |
| #1 - Contextual error messages         | SHOULD FIX   | Add reason/requiredRole to ForbiddenError details |
| #2 - Permission introspection API      | SHOULD FIX   | Add `getAuthorizedGroups()` helper for UI         |
| #3 - Debug logging                     | NICE TO HAVE | Add verbose permission logging in dev mode        |
| #4 - Group admin tool permissions      | SHOULD FIX   | Clarify if admins should create tools             |
| #5 - Membership caching                | NICE TO HAVE | Cache in session/Redis for performance            |
| #6 - Class-based student access        | SHOULD FIX   | Add class roster to student permissions           |
| #7 - Information disclosure in 404/403 | NICE TO HAVE | Return 404 for unauthorized reads                 |

---

### Acceptance Criteria Coverage

All 10 acceptance criteria are met by the spec:

- ✅ AC1: Four role definitions (system_admin, group_admin, teacher, student) - lines 234-313
- ✅ AC2: ltree hierarchy support - lines 342-358
- ✅ AC3: buildAbility helper - lines 234-314
- ✅ AC4: Permission check helper - lines 452-459
- ✅ AC5: Request decorator (ability property, not can() directly) - lines 391-408
- ✅ AC6: requirePermission middleware - lines 426-432
- ✅ AC7: System admin bypass - lines 238-242
- ✅ AC8: Group hierarchy ltree - lines 342-358
- ✅ AC9: Teacher group access - lines 266-292
- ✅ AC10: Student assigned-only access - lines 295-308

**Note on AC5:** The spec adds `request.ability` (which has `.can()` method), not a direct `can()` method. This is better design - matches the acceptance criteria's intent while providing a better API.

---

### Final Recommendation

**APPROVED FOR ARCHITECTURE REVIEW** with recommendation to address SHOULD FIX issues:

1. Add contextual error messages (#1)
2. Add permission introspection API (#2)
3. Clarify group admin tool permissions (#4)
4. Add class-based student permissions (#6)

These can be addressed in follow-up tasks if time-constrained, but will significantly improve the user experience.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Status:** NEEDS CHANGES

### Executive Summary

The CASL authorization implementation spec is architecturally sound and demonstrates strong understanding of the project's patterns. It correctly integrates with Fastify middleware, uses typed errors, follows naming conventions, and provides comprehensive test coverage. The ltree hierarchy integration is particularly well-designed.

However, there are **3 BLOCKING issues** that must be addressed before implementation:

1. CASL's `PureAbility` doesn't support `$in` operator used throughout the spec
2. Resource permission checks don't use CASL's `subject()` helper (will fail at runtime)
3. Student permissions reference non-existent fields and don't integrate with class roster

**Overall Assessment:** ❌ NEEDS CHANGES (blocking issues must be fixed)

---

### Critical Issues (MUST FIX)

#### 1. CASL `$in` Operator Not Supported in PureAbility

**Issue:** The spec uses MongoDB-style `$in` operator throughout ability definitions, but `PureAbility` doesn't support this by default.

**From spec (lines 249-263):**

```typescript
can("manage", "Group", { id: { $in: groupAdminGroups } });
can("manage", "User", { groupId: { $in: groupAdminGroups } });
can("create", "Tool", { groupId: { $in: teacherGroups } });
```

**Problem:** `PureAbility` only supports basic field matching. The `$in` operator requires `createMongoAbility` instead.

**Evidence from CASL docs:**

- `PureAbility` → Basic field equality only
- `createMongoAbility` → Supports MongoDB operators (`$in`, `$ne`, `$gt`, etc.)

**Fix Required:**

```typescript
// ❌ Current (WRONG)
import { PureAbility } from "@casl/ability";
export type AppAbility = PureAbility<[Actions, Subjects]>;
const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

// ✅ Correct (REQUIRED)
import { createMongoAbility, MongoAbility } from "@casl/ability";
export type AppAbility = MongoAbility<[Actions, Subjects]>;
const { can, cannot, build } = new AbilityBuilder<AppAbility>(
  createMongoAbility
);
```

**Files to update:**

- `packages/auth/src/types.ts` - Change `AppAbility` type
- `packages/auth/src/abilities.ts` - Import `createMongoAbility`
- `packages/auth/src/permissions.ts` - Update empty ability creation

**Impact:** BLOCKING - Current code will throw errors at runtime when checking permissions.

---

#### 2. Resource Permission Checks Missing CASL `subject()` Helper

**Issue:** The `checkResourcePermission` helper passes raw objects to `ability.can()`, but CASL requires wrapping with `subject()` for attribute-based checks.

**From spec (lines 452-459):**

```typescript
app.decorate(
  "checkResourcePermission",
  (
    ability: AppAbility,
    action: Actions,
    subject: Subjects,
    resource: Record<string, unknown>
  ): boolean => {
    return ability.can(action, subject, resource); // ❌ WRONG
  }
);
```

**Problem:** Without `subject()` wrapper, CASL can't match fields like `createdBy`, `groupId`, etc.

**Evidence:** CASL docs state: "When checking permissions on instances, wrap them with `subject()`"

**Fix Required:**

```typescript
import { subject } from "@casl/ability";

app.decorate(
  "checkResourcePermission",
  (
    ability: AppAbility,
    action: Actions,
    subjectType: Subjects,
    resource: Record<string, unknown>
  ): boolean => {
    return ability.can(action, subject(subjectType, resource)); // ✅ CORRECT
  }
);
```

**Usage example:**

```typescript
// Before fix - FAILS silently
if (!app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
  throw new ForbiddenError();
}

// After fix - Works correctly
if (!app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
  throw new ForbiddenError(); // Now correctly checks tool.createdBy === user.id
}
```

**Files to update:**

- `packages/auth/src/permissions.ts` - Import and use `subject()` helper
- Usage examples in spec (lines 1090-1178) - Update to use new signature

**Impact:** BLOCKING - Permission checks will fail or always return false without this fix.

---

#### 3. Student Permissions Don't Integrate with Class Roster

**Issue:** Student permissions check `assignedTo: user.id` field that doesn't exist in the database schema.

**From spec (lines 295-308):**

```typescript
// Students can read tools assigned to them
can("read", "Tool", { assignedTo: user.id }); // ❌ Field doesn't exist

// Students can read assignments assigned to them
can("read", "Assignment", { assignedTo: user.id }); // ❌ Field doesn't exist
```

**Database Reality (from ARCHITECTURE.md):**

- Tools don't have `assignedTo` field - they're assigned to Classes, not individual students
- Students access tools via class_members join table
- Assignments also assigned to classes, not individuals

**Fix Required:**

```typescript
// Update BuildAbilityContext to include class memberships
export interface BuildAbilityContext {
  user: SessionUser;
  memberships: GroupMember[];
  classMemberships: ClassMember[]; // ADD THIS
}

// Update buildAbility to handle class-based permissions
export function buildAbility({
  user,
  memberships,
  classMemberships,
}: BuildAbilityContext): AppAbility {
  // ... existing code ...

  // Student permissions via class enrollment
  const studentClassIds = classMemberships
    .filter((m) => m.role === "student")
    .map((m) => m.classId);

  if (studentClassIds.length > 0) {
    // Students can read tools assigned to their classes
    can("read", "Tool", { assignedClasses: { $in: studentClassIds } });

    // Students can read assignments for their classes
    can("read", "Assignment", { classId: { $in: studentClassIds } });
  }

  // All users can manage their own sessions/runs
  can("create", "Session", { userId: user.id });
  can(["read", "update", "delete"], "Session", { userId: user.id });
  can("create", "Run", { userId: user.id });
  can("read", "Run", { userId: user.id });

  return build();
}
```

**Middleware Update Required (lines 399-408):**

```typescript
app.addHook("onRequest", async (request, reply) => {
  if (!request.user) {
    request.ability = createMongoAbility([]);
    return;
  }

  // Fetch user's group memberships
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, request.user.id),
  });

  // Fetch user's class memberships (ADD THIS)
  const classMemberships = await db.query.classMembers.findMany({
    where: eq(classMembers.userId, request.user.id),
  });

  // Build and attach ability
  request.ability = buildAbility({
    user: request.user,
    memberships,
    classMemberships, // ADD THIS
  });
});
```

**Files to update:**

- `packages/auth/src/types.ts` - Add `classMemberships` to BuildAbilityContext
- `packages/auth/src/abilities.ts` - Import ClassMember type, update student permissions
- `packages/auth/src/permissions.ts` - Fetch class memberships in onRequest hook
- Test files - Update mocks to include class memberships

**Impact:** BLOCKING - Students won't be able to access any tools/assignments without this.

---

### Major Concerns (SHOULD FIX)

#### 4. Group Admin Permissions Inconsistency with Role Hierarchy

**Issue:** Teachers can create tools in their groups, but group admins (who are higher in the hierarchy) can only READ tools.

**From spec (lines 259-263, 272-276):**

```typescript
// Group admins - can only READ tools
can("read", "Tool", { groupId: { $in: groupAdminGroups } });

// Teachers - can CREATE and MANAGE tools
can("create", "Tool", { groupId: { $in: teacherGroups } });
can(["read", "update", "delete"], "Tool", { createdBy: user.id });
```

**Confusing Scenario:**

- Alice is group_admin of "Math Department"
- Bob is teacher in "Math Department"
- Bob can create tools, but Alice (the admin!) cannot
- Alice must also be a teacher to create tools (role duplication)

**Recommendation:**

Group admins should have ALL permissions that teachers have, plus administrative capabilities:

```typescript
if (groupAdminGroups.length > 0) {
  // Group admins inherit all teacher permissions
  can("create", "Tool", { groupId: { $in: groupAdminGroups } });
  can("create", "Assignment", { groupId: { $in: groupAdminGroups } });

  // Plus can manage ALL tools/assignments in group (not just owned)
  can("manage", "Tool", { groupId: { $in: groupAdminGroups } });
  can("manage", "Assignment", { groupId: { $in: groupAdminGroups } });

  // Plus group/user/class management
  can("manage", "Group", { id: { $in: groupAdminGroups } });
  can("manage", "User", { groupId: { $in: groupAdminGroups } });
  can("manage", "Class", { groupId: { $in: groupAdminGroups } });
}
```

**Impact:** Medium - Confuses users, requires workaround of giving admins both roles.

**Note:** This aligns with UX Review issue #4 (lines 1357-1388).

---

#### 5. No Membership Caching (Performance Concern)

**Issue:** Every request fetches group memberships from database (lines 399-401).

**Current Performance:**

- Database query on every request: ~5-20ms latency
- High-traffic scenario: 100 req/sec = 100 DB queries/sec just for memberships
- No change detection - same user gets same memberships fetched repeatedly

**Recommendation:**

Cache memberships in Redis with smart invalidation:

```typescript
// Cache key: `user:${userId}:memberships`
// TTL: 5 minutes (balance between freshness and DB load)
// Invalidate on: group membership changes

app.addHook("onRequest", async (request, reply) => {
  if (!request.user) {
    request.ability = createMongoAbility([]);
    return;
  }

  const cacheKey = `user:${request.user.id}:memberships`;

  // Try cache first
  let memberships = await redis.get(cacheKey);
  let classMemberships = await redis.get(`${cacheKey}:classes`);

  if (!memberships) {
    // Cache miss - fetch from DB
    memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });
    classMemberships = await db.query.classMembers.findMany({
      where: eq(classMembers.userId, request.user.id),
    });

    // Store in cache (5 min TTL)
    await redis.setex(cacheKey, 300, JSON.stringify(memberships));
    await redis.setex(
      `${cacheKey}:classes`,
      300,
      JSON.stringify(classMemberships)
    );
  } else {
    // Cache hit - parse from JSON
    memberships = JSON.parse(memberships);
    classMemberships = JSON.parse(classMemberships);
  }

  request.ability = buildAbility({
    user: request.user,
    memberships,
    classMemberships,
  });
});

// Invalidation on membership change:
async function updateUserMembership(
  userId: string,
  groupId: string,
  role: MemberRole
) {
  await db.insert(groupMembers).values({ userId, groupId, role });

  // Invalidate cache
  await redis.del(`user:${userId}:memberships`);
  await redis.del(`user:${userId}:memberships:classes`);
}
```

**Impact:** Low priority for MVP, but important for scale.

**Recommendation:** Defer to follow-up task, not blocking for E02-T005.

---

### Minor Issues (NICE TO HAVE)

#### 6. Information Disclosure in 404 vs 403 Responses

**Issue:** Spec pattern leaks resource existence (lines 897-906).

**Current Pattern:**

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });
if (!tool) throw new NotFoundError("Tool", id); // 404
if (!request.ability.can("delete", "Tool", tool)) throw new ForbiddenError(); // 403
```

**Vulnerability:** Attacker can probe for resource existence:

- DELETE /tools/secret-id → 404 = "Doesn't exist"
- DELETE /tools/secret-id → 403 = "Exists but you can't access it"

**Security Best Practice:**

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });

// Return 404 for both non-existent AND unauthorized reads
if (!tool || !request.ability.can("read", "Tool", subject("Tool", tool))) {
  throw new NotFoundError("Tool", id);
}

// Now check the actual action (delete)
if (!request.ability.can("delete", "Tool", subject("Tool", tool))) {
  throw new ForbiddenError("You cannot delete this tool");
}
```

**Impact:** Low - Theoretical security concern, minimal real-world risk.

---

#### 7. Missing Debug Logging for Permission Denials

**Issue:** When permission denied, no logging to help debugging or detect attacks.

**Current (lines 428-431):**

```typescript
if (!request.ability.can(action, subject)) {
  throw new ForbiddenError(`You cannot ${action} ${subject}`);
}
```

**Recommendation:**

```typescript
if (!request.ability.can(action, subject)) {
  // Log denial for security monitoring
  logger.warn(
    {
      userId: request.user?.id,
      action,
      subject,
      path: request.url,
      userRoles: request.user ? await getUserRoles(request.user.id) : [],
    },
    "Permission denied"
  );

  throw new ForbiddenError(`You cannot ${action} ${subject}`);
}
```

**Benefits:**

- Security monitoring (detect brute-force permission probing)
- Debugging in development
- Analytics for UX improvements (which denials are most common?)

**Impact:** Low - Nice to have for security ops.

---

### Technology Stack Alignment

✅ **COMPLIANT** - Spec correctly uses canonical tech stack:

| Requirement       | Spec | Notes                                                  |
| ----------------- | ---- | ------------------------------------------------------ |
| Fastify           | ✅   | Uses Fastify plugin pattern, decorators, preHandler    |
| TypeScript Strict | ✅   | No `any` types, explicit types throughout              |
| Drizzle ORM       | ✅   | Uses `db.query` API correctly                          |
| Zod Validation    | ✅   | Not needed for this package (no user input)            |
| CASL 6.x          | ⚠️   | Specified, but using wrong ability type (see issue #1) |
| Error System      | ✅   | Uses AppError, adds ForbiddenError correctly           |
| Package Structure | ✅   | Follows monorepo structure (`packages/auth`)           |

---

### Convention Compliance

✅ **COMPLIANT** - Spec follows CONVENTIONS.md patterns:

| Convention              | Status | Notes                                                |
| ----------------------- | ------ | ---------------------------------------------------- |
| Naming                  | ✅     | camelCase functions, PascalCase types, snake_case DB |
| File naming             | ✅     | `abilities.ts`, `permissions.ts`, `types.ts`         |
| Functional over OOP     | ✅     | Uses pure functions, not classes                     |
| Explicit error handling | ✅     | Throws typed errors                                  |
| JSDoc comments          | ✅     | Comprehensive documentation                          |
| Test structure (AAA)    | ✅     | Test examples follow Arrange/Act/Assert              |
| TypeScript imports      | ✅     | Uses `import type` for type-only imports             |
| Zero `any`              | ✅     | No `any` types in spec                               |

---

### Integration Point Validation

✅ **GOOD** - Integrates cleanly with existing systems:

**Session Middleware (E02-T002):**

- ✅ Correctly assumes `request.user` and `request.session` populated
- ✅ Runs after session middleware via `onRequest` hook
- ✅ Handles unauthenticated requests (empty ability)

**Database Schema:**

- ✅ Uses existing `users`, `groups`, `group_members` tables
- ⚠️ Missing `class_members` table integration (issue #3)

**Error Handling:**

- ✅ Extends existing error system (`AppError` → `ForbiddenError`)
- ✅ Adds `FORBIDDEN` to ErrorCode enum correctly

**Type System:**

- ✅ Augments Fastify types correctly
- ✅ Exports types for use in other packages

---

### Security Review

✅ **SOLID** - Security considerations well-addressed:

**Positive Security Patterns:**

1. Fail-safe defaults (unauthenticated = empty ability)
2. System admin bypass is explicit and auditable
3. ltree hierarchy checks prevent lateral movement
4. Generic error messages prevent information leakage
5. No SQL injection risk (uses Drizzle ORM)
6. Type safety prevents common bugs

**Addressed Threats:**

- ✅ Privilege escalation (lines 938-947)
- ✅ ltree path injection (lines 949-958)
- ✅ Audit logging (lines 973-993)

**Minor Concerns:**

- ⚠️ 404 vs 403 information disclosure (issue #6) - Low priority
- ⚠️ No rate limiting (delegated to general rate limiter) - Acceptable

---

### Test Strategy Review

✅ **EXCELLENT** - Comprehensive test coverage plan:

**Unit Tests (lines 540-677):**

- ✅ Tests all four roles (system_admin, group_admin, teacher, student)
- ✅ Tests hierarchy permissions with ltree
- ✅ Tests edge cases (empty memberships, multiple roles)
- ✅ Follows AAA pattern
- ✅ Uses mocks correctly

**Integration Tests (lines 729-762):**

- ✅ Tests full request lifecycle
- ✅ Tests route-level and resource-level checks
- ✅ Tests real database with ltree paths
- ✅ Tests denied permissions (403 responses)

**Coverage Target:** 100% (achievable with outlined tests)

---

### Positive Architectural Patterns

**Excellent Design Choices:**

1. **Fastify Plugin Pattern** (lines 383-491)

   - Proper use of `FastifyPluginAsync`
   - Decorators for reusable permission checks
   - Clean integration with existing middleware

2. **Separation of Concerns**

   - `abilities.ts` - Pure ability logic
   - `permissions.ts` - Fastify integration
   - `types.ts` - Type definitions
   - No mixing of concerns

3. **Type Safety**

   - Zero `any` types
   - Proper TypeScript inference
   - Augmented Fastify types for IDE autocomplete

4. **ltree Hierarchy Integration** (lines 342-358)

   - Elegant use of PostgreSQL native capabilities
   - String prefix matching for descendant checks
   - No N+1 query problems

5. **Composability**

   - `buildAbility()` is pure function (testable)
   - `canManageGroupHierarchy()` is reusable helper
   - Permission checks are declarative

6. **Documentation Quality**
   - Comprehensive JSDoc with @example tags
   - Clear usage examples (lines 1067-1178)
   - Edge cases documented (lines 859-936)

---

### Recommendations Summary

| Issue                         | Priority     | Effort  | Recommendation                                      |
| ----------------------------- | ------------ | ------- | --------------------------------------------------- |
| #1 - Use createMongoAbility   | MUST FIX     | 15 min  | Change PureAbility to MongoAbility                  |
| #2 - Add subject() helper     | MUST FIX     | 10 min  | Import and wrap resource checks                     |
| #3 - Class roster integration | MUST FIX     | 45 min  | Fetch class memberships, update student permissions |
| #4 - Group admin tool perms   | SHOULD FIX   | 20 min  | Grant admins all teacher permissions                |
| #5 - Membership caching       | DEFER        | 2 hours | Create follow-up task for Redis caching             |
| #6 - 404 vs 403 disclosure    | NICE TO HAVE | 15 min  | Return 404 for unauthorized reads                   |
| #7 - Debug logging            | NICE TO HAVE | 10 min  | Add logger.warn() for denials                       |

**Total effort for MUST FIX:** ~70 minutes
**Total effort for SHOULD FIX:** ~20 minutes

---

### Final Recommendation

**STATUS: NEEDS CHANGES**

The specification demonstrates excellent architectural understanding and follows RaptScallions conventions closely. The Fastify integration, type safety, and ltree hierarchy approach are all well-designed.

However, **3 BLOCKING issues** prevent approval:

1. CASL ability type incompatible with `$in` operator usage
2. Resource permission checks won't work without `subject()` helper
3. Student permissions don't integrate with class roster system

**Required Actions Before Approval:**

1. ✅ Update to `createMongoAbility` instead of `PureAbility`
2. ✅ Add `subject()` helper to resource permission checks
3. ✅ Integrate class roster into student permissions

**Optional Improvements (can defer to follow-up tasks):** 4. ⚠️ Clarify group admin vs teacher permission hierarchy (UX concern) 5. ⚠️ Add Redis caching for memberships (performance at scale) 6. ⚠️ Add security logging for denied permissions (ops visibility)

**Effort Estimate:** ~90 minutes to address blocking issues and group admin permissions.

**Next Steps:**

1. Analyst updates spec to fix 3 blocking issues
2. Architect re-reviews updated spec
3. If approved → task moves to APPROVED state
4. Create follow-up tasks for performance optimization

---

**Review completed by architect agent on 2026-01-12**
