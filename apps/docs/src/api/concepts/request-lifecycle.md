---
title: Request Lifecycle
description: Hook execution order from request arrival to response completion
related_code:
  - apps/api/src/middleware/session.middleware.ts
  - apps/api/src/middleware/request-logger.ts
  - apps/api/src/middleware/auth.middleware.ts
last_verified: 2026-01-14
---

# Request Lifecycle

Understanding Fastify's request lifecycle is essential for building correct middleware and route handlers. Hooks execute in a specific order, and knowing when each runs helps you place logic in the right place.

## Hook Execution Order

Fastify hooks execute in this order for each request:

```
Request arrives
    │
    ▼
┌─────────────────┐
│   onRequest     │  ◄── Session validation, request logging
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   preParsing    │  ◄── Modify raw body stream (rare)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   preValidation │  ◄── Before schema validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   preHandler    │  ◄── Auth guards, permission checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Handler      │  ◄── Your route handler
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ preSerialization│  ◄── Modify response before JSON
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    onSend       │  ◄── Modify final payload
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   onResponse    │  ◄── Request completed logging
└────────┬────────┘
         │
         ▼
Response sent
```

## Hooks in RaptScallions

### onRequest

First hook to run. Used for:

- **Session validation** — Read session cookie, validate with Lucia, populate `request.user`
- **Request logging** — Log request started with method, URL, request ID
- **Permission building** — Build CASL ability from user's group memberships

```typescript
// apps/api/src/middleware/session.middleware.ts
app.addHook("onRequest", async (request, reply) => {
  const sessionId = request.cookies[sessionService.sessionCookieName];

  if (!sessionId) {
    request.user = null;
    request.session = null;
    return;
  }

  const { session, user } = await sessionService.validate(sessionId);

  // Extend fresh sessions automatically
  if (session?.fresh) {
    reply.setCookie(sessionService.sessionCookieName, session.id, /* attrs */);
  }

  // Clear expired sessions
  if (!session) {
    const blankCookie = sessionService.createBlankSessionCookie();
    reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);
  }

  request.user = user;
  request.session = session;
});
```

```typescript
// apps/api/src/middleware/request-logger.ts
app.addHook("onRequest", async (request, _reply) => {
  logger.info("Request started", {
    requestId: request.id,
    method: request.method,
    url: request.url,
  });
});
```

### preHandler

Last hook before the route handler executes. Used for:

- **Authentication guards** — Verify user is authenticated
- **Role checks** — Verify user has required role
- **Permission checks** — Verify CASL permission

```typescript
// Route configuration with preHandler
app.post("/admin/users", {
  preHandler: [
    app.requireAuth,
    app.requireRole("system_admin", "group_admin"),
  ],
}, handler);
```

```typescript
// apps/api/src/middleware/auth.middleware.ts
app.decorate("requireAuth", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
});

app.decorate("requireRole", (...roles: MemberRole[]) => {
  return async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    // Check if user has any of the required roles
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    const userRoles = memberships.map((m) => m.role);
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenError(`This action requires role: ${roles.join(", ")}`);
    }
  };
});
```

### onResponse

Runs after the response is fully sent. Used for:

- **Request logging** — Log completion with status code and duration
- **Metrics** — Record response time

```typescript
// apps/api/src/middleware/request-logger.ts
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
```

## Hook Order with Errors

When an error is thrown, the normal flow is interrupted:

```
onRequest → preParsing → preValidation → preHandler → Handler
    │            │             │              │           │
    └────────────┴─────────────┴──────────────┴───────────┘
                               │
                               ▼
                         ┌──────────┐
                         │ onError  │
                         └────┬─────┘
                              │
                              ▼
                        Error Handler
                              │
                              ▼
                         ┌──────────┐
                         │ onSend   │
                         └────┬─────┘
                              │
                              ▼
                        ┌───────────┐
                        │onResponse │
                        └───────────┘
```

The error handler runs, formats the error response, then `onSend` and `onResponse` still execute.

## Multiple PreHandlers

You can use multiple preHandler functions. They execute in order:

```typescript
app.get("/groups/:groupId/assignments", {
  preHandler: [
    app.requireAuth,           // 1. Check authenticated
    app.requireGroupFromParams(), // 2. Check group membership
    app.requireGroupRole("teacher", "group_admin"), // 3. Check role in group
  ],
}, handler);
```

If any preHandler throws, subsequent preHandlers and the handler don't run.

## Hook vs PreHandler

| Feature | Hook | PreHandler |
|---------|------|------------|
| Scope | All routes in plugin | Single route |
| Registration | `app.addHook()` | Route `preHandler` option |
| Use case | Cross-cutting concerns | Route-specific checks |
| Examples | Session, logging, CORS | Auth guards, validation |

### When to use each

**Use hooks for:**

- Things that should run on every request (logging, session)
- Infrastructure concerns (CORS, rate limiting)
- Request decoration (`request.user`, `request.ability`)

**Use preHandler for:**

- Route-specific authentication requirements
- Permission checks
- Pre-fetching data needed by the handler

## Request Decoration Timeline

Understanding when decorations are available:

| Decoration | Available After | Set By |
|------------|-----------------|--------|
| `request.user` | onRequest | sessionMiddleware |
| `request.session` | onRequest | sessionMiddleware |
| `request.ability` | onRequest | permissionMiddleware |
| `request.groupMembership` | preHandler | requireGroupMembership |

::: warning Decorator Order
If your preHandler depends on `request.user`, ensure `sessionMiddleware` is registered before the plugin containing your route.
:::

## Async Hook Execution

All hooks are async and execute sequentially:

```typescript
app.addHook("onRequest", async (request) => {
  // First hook runs
  await someAsyncOperation();
});

app.addHook("onRequest", async (request) => {
  // Second hook runs after first completes
  await anotherAsyncOperation();
});
```

Fastify waits for each hook to complete before proceeding to the next.

## Stopping the Lifecycle

To stop the lifecycle early (e.g., for redirects), use `reply.send()`:

```typescript
app.addHook("onRequest", async (request, reply) => {
  if (shouldRedirect(request)) {
    // This stops further processing
    return reply.redirect("/login");
  }
  // Otherwise, continues to next hook/handler
});
```

Once `reply.send()` is called, subsequent hooks and the handler are skipped (except `onSend` and `onResponse`).

## Related Pages

- [Fastify Setup](/api/concepts/fastify-setup) — Server initialization and hook registration
- [Plugin Architecture](/api/concepts/plugin-architecture) — How plugins add hooks
- [Middleware](/api/patterns/middleware) — Session, auth, and rate limiting implementations
- [Error Handling](/api/patterns/error-handling) — How errors interrupt the lifecycle
