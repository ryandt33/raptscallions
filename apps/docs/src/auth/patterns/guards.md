---
title: Authentication Guards
description: Route-level access control with Fastify preHandlers
related_code:
  - apps/api/src/middleware/auth.middleware.ts
  - packages/auth/src/permissions.ts
last_verified: 2026-01-14
---

# Authentication Guards

Guards are Fastify preHandlers that enforce authentication and authorization requirements before route handlers execute. They provide declarative access control at the route level.

## Available Guards

| Guard | Purpose | Throws |
|-------|---------|--------|
| `requireAuth` | Require any authenticated user | `UnauthorizedError` |
| `requireActiveUser` | Require authenticated + active status | `UnauthorizedError` |
| `requireRole(...roles)` | Require any of the specified roles | `ForbiddenError` |
| `requireGroupMembership(groupId)` | Require membership in specific group | `ForbiddenError` |
| `requireGroupFromParams(param?)` | Require membership using route param | `ForbiddenError` |
| `requireGroupRole(...roles)` | Require role in current group context | `ForbiddenError` |
| `requirePermission(action, subject)` | Require CASL permission | `ForbiddenError` |

## Basic Authentication

### requireAuth

The most basic guard - require any authenticated user:

```typescript
// apps/api/src/middleware/auth.middleware.ts
app.decorate("requireAuth", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
});
```

**Usage:**

```typescript
app.get("/profile", {
  preHandler: [app.requireAuth]
}, async (request, reply) => {
  // request.user is guaranteed to exist here
  return { user: request.user };
});
```

### requireActiveUser

Require authentication AND active account status:

```typescript
app.decorate("requireActiveUser", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
  if (request.user.status !== "active") {
    throw new UnauthorizedError("Account is not active");
  }
});
```

**Usage:**

```typescript
app.post("/create-content", {
  preHandler: [app.requireActiveUser]
}, handler);
```

::: tip When to Use
Use `requireActiveUser` for actions that should be blocked for suspended or pending accounts. Use `requireAuth` when any authenticated user (including pending verification) should have access.
:::

## Role-Based Guards

### requireRole

Require user to have any of the specified roles (across all groups):

```typescript
app.decorate("requireRole", (...roles: MemberRole[]) => {
  return async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    const userRoles = memberships.map((m) => m.role);
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${roles.join(", ")}`
      );
    }
  };
});
```

**Usage:**

```typescript
// Only system admins
app.post("/admin/settings", {
  preHandler: [app.requireAuth, app.requireRole("system_admin")]
}, handler);

// System admins OR group admins
app.get("/admin/dashboard", {
  preHandler: [app.requireAuth, app.requireRole("system_admin", "group_admin")]
}, handler);

// Teachers only
app.post("/tools", {
  preHandler: [app.requireAuth, app.requireRole("teacher")]
}, handler);
```

::: warning Role Check Scope
`requireRole` checks if the user has the role in ANY group. For group-specific role checks, use `requireGroupRole`.
:::

## Group-Based Guards

### requireGroupMembership

Require membership in a specific group:

```typescript
app.decorate("requireGroupMembership", (groupId: string) => {
  return async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.userId, request.user.id),
        eq(groupMembers.groupId, groupId)
      ),
    });

    if (!membership) {
      throw new ForbiddenError("You are not a member of this group");
    }

    // Attach membership for downstream use
    request.groupMembership = membership;
  };
});
```

**Usage with static group ID:**

```typescript
app.get("/groups/abc-123/info", {
  preHandler: [app.requireAuth, app.requireGroupMembership("abc-123")]
}, handler);
```

### requireGroupFromParams

Require membership in a group specified by route parameter:

```typescript
app.decorate("requireGroupFromParams", (paramName = "groupId") => {
  return async (request, reply) => {
    const groupId = request.params[paramName];

    if (!groupId || typeof groupId !== "string") {
      throw new ForbiddenError(`Missing or invalid route parameter: ${paramName}`);
    }

    await app.requireGroupMembership(groupId)(request, reply);
  };
});
```

**Usage with dynamic group ID:**

```typescript
// Uses default "groupId" parameter
app.get("/groups/:groupId/members", {
  preHandler: [app.requireAuth, app.requireGroupFromParams()]
}, handler);

// Uses custom parameter name
app.get("/teams/:teamId/roster", {
  preHandler: [app.requireAuth, app.requireGroupFromParams("teamId")]
}, handler);
```

### requireGroupRole

Require specific role(s) within the current group context. Must be used after a group membership guard:

```typescript
app.decorate("requireGroupRole", (...roles: MemberRole[]) => {
  return async (request, reply) => {
    if (!request.groupMembership) {
      throw new Error(
        "requireGroupRole must be used after requireGroupMembership or requireGroupFromParams"
      );
    }

    if (!roles.includes(request.groupMembership.role)) {
      throw new ForbiddenError(
        `This action requires one of the following roles in this group: ${roles.join(", ")}`
      );
    }
  };
});
```

**Usage:**

```typescript
// Only teachers or admins in THIS group
app.post("/groups/:groupId/assignments", {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),
    app.requireGroupRole("teacher", "group_admin")
  ]
}, handler);
```

## Permission-Based Guards

### requirePermission

Require CASL permission (checks ability built from group memberships):

```typescript
// packages/auth/src/permissions.ts
app.decorate("requirePermission", (action: Actions, subject: Subjects) => {
  return async (request: FastifyRequest) => {
    if (!request.ability.can(action, subject)) {
      throw new ForbiddenError(`You cannot ${action} ${subject}`);
    }
  };
});
```

**Usage:**

```typescript
app.post("/tools", {
  preHandler: [app.requireAuth, app.requirePermission("create", "Tool")]
}, handler);

app.delete("/assignments/:id", {
  preHandler: [app.requireAuth, app.requirePermission("delete", "Assignment")]
}, handler);
```

## Guard Composition

Guards can be composed in the preHandler array. They execute in order:

```typescript
app.post("/groups/:groupId/classes", {
  preHandler: [
    app.requireAuth,              // 1. Must be logged in
    app.requireActiveUser,        // 2. Must have active status
    app.requireGroupFromParams(), // 3. Must be group member
    app.requireGroupRole("group_admin"), // 4. Must be admin in this group
    app.requirePermission("create", "Class") // 5. Must have permission
  ]
}, handler);
```

**Execution flow:**
1. If not authenticated → 401 Unauthorized
2. If not active → 401 Unauthorized
3. If not group member → 403 Forbidden
4. If not admin in group → 403 Forbidden
5. If no create Class permission → 403 Forbidden
6. Handler executes

## Request Augmentation

Guards augment the request object:

| Guard | Adds to Request |
|-------|-----------------|
| Session middleware | `request.user`, `request.session` |
| Permission middleware | `request.ability` |
| `requireGroupMembership` | `request.groupMembership` |
| `requireGroupFromParams` | `request.groupMembership` |

**Using augmented data:**

```typescript
app.get("/groups/:groupId/info", {
  preHandler: [app.requireAuth, app.requireGroupFromParams()]
}, async (request, reply) => {
  // TypeScript knows these exist
  const { user, groupMembership } = request;

  return {
    groupId: groupMembership.groupId,
    userRole: groupMembership.role,
    userName: user.name,
  };
});
```

## Type Declarations

Guard types are declared via module augmentation:

```typescript
// apps/api/src/middleware/auth.middleware.ts
declare module "fastify" {
  interface FastifyRequest {
    groupMembership?: GroupMember;
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: MemberRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupMembership: (groupId: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupFromParams: (paramName?: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupRole: (...roles: MemberRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

## Error Responses

### UnauthorizedError (401)

Thrown when authentication is required but missing or invalid:

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### ForbiddenError (403)

Thrown when user is authenticated but lacks permission:

```json
{
  "error": "This action requires one of the following roles: teacher, group_admin",
  "code": "FORBIDDEN"
}
```

## Best Practices

### Order Guards Correctly

Guards should go from general to specific:

```typescript
// Good
preHandler: [app.requireAuth, app.requireGroupFromParams(), app.requireGroupRole("admin")]

// Bad - group role check before membership
preHandler: [app.requireGroupRole("admin"), app.requireGroupFromParams()]
```

### Use Appropriate Error Types

- `UnauthorizedError` (401): "You need to log in"
- `ForbiddenError` (403): "You're logged in but can't do this"

### Check Permissions After Fetch

For resource-specific permissions, check after fetching:

```typescript
app.delete("/tools/:id", {
  preHandler: [app.requireAuth]
}, async (request, reply) => {
  const tool = await findTool(request.params.id);

  if (!request.ability.can("delete", subject("Tool", tool))) {
    throw new ForbiddenError("You cannot delete this tool");
  }

  await deleteTool(tool.id);
});
```

### Combine Role and Permission Guards

Use role guards for coarse access, permission guards for fine-grained:

```typescript
// Coarse: only teachers can access
// Fine: only teachers who can create tools
preHandler: [
  app.requireAuth,
  app.requireRole("teacher"),
  app.requirePermission("create", "Tool")
]
```

## Related Pages

- [CASL Permissions](/auth/concepts/casl) — How permissions are defined
- [Session Lifecycle](/auth/concepts/sessions) — How authentication works
- [Rate Limiting](/auth/patterns/rate-limiting) — Request throttling
