---
title: CASL Permissions
description: Role-based permission definitions and attribute-based access control
related_code:
  - packages/auth/src/abilities.ts
  - packages/auth/src/permissions.ts
  - packages/auth/src/types.ts
last_verified: 2026-01-14
---

# CASL Permissions

RaptScallions uses CASL for attribute-based access control (ABAC). Permissions are defined by role and can be checked at both the route level and the resource level.

## Why CASL

| Feature | CASL | Simple RBAC |
|---------|------|-------------|
| Attribute checks | `can('read', 'Tool', { createdBy: userId })` | No |
| Field-level control | Yes | No |
| Negative permissions | `cannot('delete', 'User')` | No |
| Serializable | JSON export | No |
| TypeScript | Full support | Varies |

CASL allows fine-grained permissions like "teachers can only edit tools they created" without complex code.

## Core Concepts

### Actions

What a user can do:

| Action | Description |
|--------|-------------|
| `create` | Create new resources |
| `read` | View resources |
| `update` | Modify existing resources |
| `delete` | Remove resources |
| `manage` | All actions (wildcard) |

### Subjects

What resources actions apply to:

| Subject | Description |
|---------|-------------|
| `User` | User accounts |
| `Group` | Organizational units (districts, schools) |
| `Class` | Teaching classes within groups |
| `Tool` | AI-powered tools (chat/product) |
| `Assignment` | Assigned tools with due dates |
| `Session` | Chat sessions |
| `Run` | Product run executions |
| `all` | All subjects (wildcard) |

### Types

```typescript
// packages/auth/src/types.ts
export type Actions = "create" | "read" | "update" | "delete" | "manage";

export type Subjects =
  | "User"
  | "Group"
  | "Class"
  | "Tool"
  | "Assignment"
  | "Session"
  | "Run"
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;
```

## Role Hierarchy

Permissions are additive based on group membership roles:

```
system_admin → manage all
    ↓
group_admin → manage group, users, classes, assignments; read tools
    ↓
teacher → create/manage own tools, assignments; read classes, users
    ↓
student → read assigned tools/assignments; manage own sessions/runs
```

## Building Abilities

Abilities are built from user group memberships:

```typescript
// packages/auth/src/abilities.ts
import { AbilityBuilder, createMongoAbility } from "@casl/ability";

export function buildAbility({ user, memberships }: BuildAbilityContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

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
    can("manage", "Group", { id: { $in: groupAdminGroups } });
    can("manage", "User", { groupId: { $in: groupAdminGroups } });
    can("manage", "Class", { groupId: { $in: groupAdminGroups } });
    can("read", "Tool", { groupId: { $in: groupAdminGroups } });
    can("manage", "Assignment", { groupId: { $in: groupAdminGroups } });
  }

  // Teacher permissions
  const teacherGroups = memberships
    .filter((m) => m.role === "teacher")
    .map((m) => m.groupId);

  if (teacherGroups.length > 0) {
    can("create", "Tool", { groupId: { $in: teacherGroups } });
    can(["read", "update", "delete"], "Tool", { createdBy: user.id });
    can("create", "Assignment", { groupId: { $in: teacherGroups } });
    can(["read", "update", "delete"], "Assignment", { createdBy: user.id });
    can("read", "Class", { groupId: { $in: teacherGroups } });
    can("read", "User", { groupId: { $in: teacherGroups } });
    can("read", "Session", { toolCreatedBy: user.id });
  }

  // Student permissions (everyone gets these)
  can("read", "Tool", { assignedTo: user.id });
  can("read", "Assignment", { assignedTo: user.id });
  can("create", "Session", { userId: user.id });
  can(["read", "update", "delete"], "Session", { userId: user.id });
  can("create", "Run", { userId: user.id });
  can("read", "Run", { userId: user.id });

  // All users can read/update their own profile
  can("read", "User", { id: user.id });
  can("update", "User", { id: user.id });

  return build();
}
```

## Permission Matrix

| Role | User | Group | Class | Tool | Assignment | Session | Run |
|------|------|-------|-------|------|------------|---------|-----|
| **system_admin** | manage | manage | manage | manage | manage | manage | manage |
| **group_admin** | manage (in group) | manage (own) | manage (in group) | read (in group) | manage (in group) | - | - |
| **teacher** | read (in group) | - | read (in group) | create, manage own | create, manage own | read (own tools) | - |
| **student** | read self, update self | - | - | read (assigned) | read (assigned) | manage own | create, read own |

## Permission Middleware

The permission middleware builds abilities on each request:

```typescript
// packages/auth/src/permissions.ts
const permissionMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("ability", null);

  app.addHook("onRequest", async (request) => {
    if (!request.user) {
      request.ability = createMongoAbility([]);
      return;
    }

    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    request.ability = buildAbility({ user: request.user, memberships });
  });
};
```

After middleware runs, `request.ability` contains the user's permissions.

## Checking Permissions

### Subject-Level Check

Check if user can perform action on a subject type:

```typescript
// In route handler
if (!request.ability.can("create", "Tool")) {
  throw new ForbiddenError("You cannot create tools");
}
```

### Resource-Level Check

Check if user can perform action on a specific resource:

```typescript
import { subject } from "@casl/ability";

const tool = await db.query.tools.findFirst({ where: eq(tools.id, toolId) });

if (!request.ability.can("delete", subject("Tool", tool))) {
  throw new ForbiddenError("You cannot delete this tool");
}
```

### Using the Helper

The Fastify decorator provides a type-safe helper:

```typescript
if (!app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
  throw new ForbiddenError("You cannot delete this tool");
}
```

## Route-Level Guards

Create preHandlers that check permissions:

```typescript
// packages/auth/src/permissions.ts
app.decorate("requirePermission", (action: Actions, subjectType: Subjects) => {
  return async (request: FastifyRequest) => {
    if (!request.ability.can(action, subjectType)) {
      throw new ForbiddenError(`You cannot ${action} ${subjectType}`);
    }
  };
});
```

**Usage:**

```typescript
app.post("/tools", {
  preHandler: [app.requireAuth, app.requirePermission("create", "Tool")]
}, async (request, reply) => {
  // Only users who can create tools reach here
});
```

## Group Hierarchy

Groups use PostgreSQL's ltree for hierarchical permissions:

```typescript
// packages/auth/src/abilities.ts
export function canManageGroupHierarchy(
  ability: AppAbility,
  targetGroupId: string,
  userGroupPaths: GroupPath[],
  targetGroupPath: string
): boolean {
  // First check if user can manage the exact group
  if (ability.can("manage", subject("Group", { id: targetGroupId }))) {
    return true;
  }

  // Check if target is descendant of any managed group
  return userGroupPaths.some(
    ({ path }) => targetGroupPath.startsWith(path + ".") || targetGroupPath === path
  );
}
```

**Example:**

```
User manages: district.school1 (path)
Target group: district.school1.dept_math (path)
Result: Can manage (dept_math is descendant of school1)
```

### Fetching Group Paths

```typescript
// Usage in route handler
const userGroupPaths = await app.getGroupPaths(groupAdminGroupIds);
const canManage = canManageGroupHierarchy(
  request.ability,
  targetGroupId,
  userGroupPaths,
  targetGroup.path
);
```

## Multiple Roles

Users can have different roles in different groups:

```typescript
// User is admin in School A, teacher in School B
const memberships = [
  { groupId: "school-a", role: "group_admin" },
  { groupId: "school-b", role: "teacher" },
];
```

The ability builder grants permissions for each role:
- Manage users in School A
- Create tools in School B
- Read classes in both schools

## Common Patterns

### Check Before Fetch

```typescript
// First check subject-level permission
if (!request.ability.can("read", "Tool")) {
  throw new ForbiddenError("You cannot read tools");
}

// Then filter by user's allowed tools
const tools = await db.query.tools.findMany({
  where: or(
    eq(tools.groupId, userGroupId),
    eq(tools.createdBy, request.user.id)
  ),
});
```

### Check After Fetch

```typescript
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });

if (!tool) {
  throw new NotFoundError("Tool", id);
}

if (!request.ability.can("update", subject("Tool", tool))) {
  throw new ForbiddenError("You cannot update this tool");
}
```

### Filter by Ability

```typescript
const tools = await db.query.tools.findMany();

const accessibleTools = tools.filter((tool) =>
  request.ability.can("read", subject("Tool", tool))
);
```

## Type Safety

CASL abilities are fully typed:

```typescript
// TypeScript catches invalid actions
request.ability.can("invalid", "Tool"); // Error

// TypeScript catches invalid subjects
request.ability.can("read", "InvalidSubject"); // Error

// TypeScript allows valid combinations
request.ability.can("read", "Tool"); // OK
```

## Related Pages

- [Authentication Guards](/auth/patterns/guards) — Combining CASL with route guards
- [Session Lifecycle](/auth/concepts/sessions) — How sessions enable permissions
- [Lucia Configuration](/auth/concepts/lucia) — User data for permission building
