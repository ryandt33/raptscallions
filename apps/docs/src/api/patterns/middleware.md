---
title: Middleware Patterns
description: Session validation, auth guards, rate limiting, and request logging
related_code:
  - apps/api/src/middleware/session.middleware.ts
  - apps/api/src/middleware/auth.middleware.ts
  - apps/api/src/middleware/rate-limit.middleware.ts
  - apps/api/src/middleware/request-logger.ts
  - packages/auth/src/permissions.ts
last_verified: 2026-01-14
---

# Middleware Patterns

This guide covers the middleware patterns used in RaptScallions. Middleware in Fastify is implemented through plugins that add hooks and decorators.

## Middleware Overview

| Middleware | Purpose | Hook/Type |
|------------|---------|-----------|
| `sessionMiddleware` | Validate session, populate `request.user` | onRequest hook |
| `authMiddleware` | Provide auth guard decorators | Decorators |
| `permissionMiddleware` | Build CASL abilities, permission checks | onRequest hook + Decorators |
| `rateLimitMiddleware` | Rate limiting with Redis | Plugin wrapper |
| `requestLogger` | Log request start/end | onRequest + onResponse hooks |

## Session Middleware

Validates session cookies and populates `request.user` and `request.session`:

```typescript
// apps/api/src/middleware/session.middleware.ts
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { sessionService as defaultSessionService } from "@raptscallions/auth";

export interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike; // For DI in tests
}

const sessionMiddlewarePlugin: FastifyPluginAsync<SessionMiddlewareOptions> =
  async (app, opts = {}) => {
    const sessionService = opts.sessionService ?? defaultSessionService;

    app.addHook("onRequest", async (request, reply) => {
      // Get session ID from cookie
      const sessionId = request.cookies[sessionService.sessionCookieName];

      // No cookie? Set null and continue
      if (!sessionId) {
        request.user = null;
        request.session = null;
        return;
      }

      // Validate session with Lucia
      const { session, user } = await sessionService.validate(sessionId);

      // Session is fresh? Extend it automatically
      if (session?.fresh) {
        reply.setCookie(
          sessionService.sessionCookieName,
          session.id,
          sessionService.sessionCookieAttributes
        );
      }

      // Session expired? Clear cookie
      if (!session) {
        const blankCookie = sessionService.createBlankSessionCookie();
        reply.setCookie(
          blankCookie.name,
          blankCookie.value,
          blankCookie.attributes
        );
      }

      // Attach to request for route handlers
      request.user = user;
      request.session = session;
    });
  };

// Export with fastify-plugin to skip encapsulation
export const sessionMiddleware = fp(sessionMiddlewarePlugin, {
  name: "sessionMiddleware",
});
```

### Usage in Routes

```typescript
app.get("/me", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  return reply.send({
    data: {
      id: request.user.id,
      email: request.user.email,
      name: request.user.name,
    },
  });
});
```

## Auth Middleware

Provides decorators for protecting routes:

```typescript
// apps/api/src/middleware/auth.middleware.ts
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { UnauthorizedError, ForbiddenError } from "@raptscallions/core";

const authMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  // Basic auth check
  app.decorate("requireAuth", async (request: FastifyRequest) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
  });

  // Active user check
  app.decorate("requireActiveUser", async (request: FastifyRequest) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (request.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }
  });

  // Role check (any group)
  app.decorate("requireRole", (...roles: MemberRole[]) => {
    return async (request: FastifyRequest): Promise<void> => {
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
          `This action requires one of: ${roles.join(", ")}`
        );
      }
    };
  });

  // Group membership check
  app.decorate("requireGroupMembership", (groupId: string) => {
    return async (request: FastifyRequest): Promise<void> => {
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

      // Attach for downstream use
      request.groupMembership = membership;
    };
  });

  // Group membership from route params
  app.decorate("requireGroupFromParams", (paramName = "groupId") => {
    return async (request: FastifyRequest): Promise<void> => {
      const groupId = (request.params as Record<string, unknown>)[paramName];

      if (!groupId || typeof groupId !== "string") {
        throw new ForbiddenError(`Missing parameter: ${paramName}`);
      }

      await app.requireGroupMembership(groupId)(request);
    };
  });

  // Role check within current group context
  app.decorate("requireGroupRole", (...roles: MemberRole[]) => {
    return async (request: FastifyRequest): Promise<void> => {
      if (!request.groupMembership) {
        throw new Error(
          "requireGroupRole must be used after requireGroupMembership"
        );
      }

      if (!roles.includes(request.groupMembership.role)) {
        throw new ForbiddenError(
          `This action requires role: ${roles.join(", ")} in this group`
        );
      }
    };
  });
};

export const authMiddleware = fp(authMiddlewarePlugin, {
  name: "authMiddleware",
});
```

### Guard Usage Examples

```typescript
// Require any authenticated user
app.get("/dashboard", {
  preHandler: [app.requireAuth],
}, handler);

// Require specific roles
app.post("/admin/users", {
  preHandler: [
    app.requireAuth,
    app.requireRole("system_admin", "group_admin"),
  ],
}, handler);

// Require group membership
app.get("/groups/:groupId/members", {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),
  ],
}, handler);

// Require specific role in group
app.post("/groups/:groupId/assignments", {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),
    app.requireGroupRole("teacher", "group_admin"),
  ],
}, handler);
```

## Permission Middleware

Uses CASL for fine-grained permission checks:

```typescript
// packages/auth/src/permissions.ts
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createMongoAbility, subject } from "@casl/ability";
import { buildAbility } from "./abilities.js";
import { ForbiddenError } from "@raptscallions/core";

const permissionMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("ability", null);

  // Build ability on every request
  app.addHook("onRequest", async (request) => {
    if (!request.user) {
      request.ability = createMongoAbility([]);
      return;
    }

    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    request.ability = buildAbility({
      user: request.user,
      memberships,
    });
  });

  // PreHandler factory for subject-level checks
  app.decorate("requirePermission", (action: Actions, subjectType: Subjects) => {
    return async (request: FastifyRequest) => {
      if (!request.ability.can(action, subjectType)) {
        throw new ForbiddenError(`You cannot ${action} ${subjectType}`);
      }
    };
  });

  // Helper for resource-level checks
  app.decorate(
    "checkResourcePermission",
    (ability, action, subjectType, resource) => {
      return ability.can(action, subject(subjectType, resource));
    }
  );
};

export const permissionMiddleware = fp(permissionMiddlewarePlugin, {
  name: "permissionMiddleware",
});
```

### Permission Usage

```typescript
// Subject-level check (can user create any Group?)
app.post("/groups", {
  preHandler: [
    app.requireAuth,
    app.requirePermission("create", "Group"),
  ],
}, handler);

// Resource-level check (can user delete THIS tool?)
app.delete("/tools/:id", async (request, reply) => {
  const tool = await toolService.findById(request.params.id);

  if (!app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
    throw new ForbiddenError("You cannot delete this tool");
  }

  await toolService.delete(tool.id);
  return reply.status(204).send();
});
```

## Rate Limit Middleware

Redis-backed rate limiting with dynamic limits:

```typescript
// apps/api/src/middleware/rate-limit.middleware.ts
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import { config } from "../config.js";

const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  const redis = new Redis(config.REDIS_URL, {
    connectionName: "rate-limit",
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  // Key generator - user ID for authenticated, IP for anonymous
  const keyGenerator = (request: FastifyRequest): string => {
    if (request.user) {
      return `user:${request.user.id}`;
    }
    return `ip:${request.ip}`;
  };

  await app.register(rateLimit, {
    global: true,
    // Dynamic max based on route
    max: (request) => {
      if (request.url.startsWith("/auth")) {
        return config.RATE_LIMIT_AUTH_MAX; // 5/min for auth
      }
      return config.RATE_LIMIT_API_MAX; // 100/min for API
    },
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
    redis,
    keyGenerator: (request) => {
      if (request.url.startsWith("/auth")) {
        return `auth:${request.ip}`; // Auth always by IP
      }
      return keyGenerator(request);
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    nameSpace: "rapt:rl:",
  });
};

export const rateLimitMiddleware = fp(rateLimitPlugin, {
  name: "rateLimitMiddleware",
  dependencies: ["@fastify/cookie"],
});
```

### Route-Specific Limits

```typescript
// Override rate limit for specific route
app.post("/expensive-operation", {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 hour",
    },
  },
}, handler);

// Disable rate limit (e.g., health checks)
app.get("/health", {
  config: { rateLimit: false },
}, handler);
```

## Request Logger

Logs request lifecycle for observability:

```typescript
// apps/api/src/middleware/request-logger.ts
import type { FastifyPluginAsync } from "fastify";
import { getLogger } from "@raptscallions/telemetry";

const logger = getLogger("api:request");

export const requestLogger: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => {
    logger.info("Request started", {
      requestId: request.id,
      method: request.method,
      url: request.url,
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    const responseTime = reply.getResponseTime();

    logger.info("Request completed", {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: Math.round(responseTime),
      userAgent: request.headers["user-agent"],
    });
  });
};
```

## Creating Custom Middleware

### Hook-Based Middleware

For cross-cutting concerns that should run on every request:

```typescript
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const myMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    // Runs on every request
  });
};

export const myMiddleware = fp(myMiddlewarePlugin, {
  name: "myMiddleware",
});
```

### Decorator-Based Middleware

For optional functionality routes can opt into:

```typescript
const myMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.decorate("myGuard", async (request, reply) => {
    // Only runs when used as preHandler
  });
};

// Usage
app.get("/route", {
  preHandler: [app.myGuard],
}, handler);
```

## Middleware Order

Register middleware in dependency order:

```typescript
// apps/api/src/server.ts
// 1. Core plugins
await app.register(cors);
await app.register(cookie);

// 2. Logging (before everything for visibility)
await app.register(requestLogger);

// 3. Session (populates request.user)
await app.register(sessionMiddleware);

// 4. Rate limiting (uses request.user for keying)
await app.register(rateLimitMiddleware);

// 5. Auth guards (uses request.user)
await app.register(authMiddleware);

// 6. Permissions (uses request.user and memberships)
await app.register(permissionMiddleware);

// 7. Routes (uses all decorators)
await app.register(healthRoutes);
await app.register(authRoutes, { prefix: "/auth" });

// 8. Error handler (catches all)
app.setErrorHandler(errorHandler);
```

## Testing Middleware

Use dependency injection for testable middleware:

```typescript
// Production usage
await app.register(sessionMiddleware);

// Test usage with mock
await app.register(sessionMiddleware, {
  sessionService: {
    sessionCookieName: "session",
    sessionCookieAttributes: {},
    validate: vi.fn().mockResolvedValue({
      session: mockSession,
      user: mockUser,
    }),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      name: "session",
      value: "",
      attributes: {},
    }),
  },
});
```

## Related Pages

- [Request Lifecycle](/api/concepts/request-lifecycle) — When hooks execute
- [Plugin Architecture](/api/concepts/plugin-architecture) — How plugins provide decorators
- [Error Handling](/api/patterns/error-handling) — Errors thrown by guards
- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Testing plugins
