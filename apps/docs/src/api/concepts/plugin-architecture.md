---
title: Plugin Architecture
description: How Fastify plugins provide encapsulation, decorators, and modular organization
related_code:
  - apps/api/src/middleware/*.ts
  - apps/api/src/routes/*.ts
last_verified: 2026-01-14
---

# Plugin Architecture

Fastify's plugin system is central to RaptScallions' API architecture. Plugins provide encapsulation, decorators, and a clean way to organize middleware and routes. Understanding plugins is essential for extending the API.

## What is a Plugin?

A Fastify plugin is an async function that receives the Fastify instance and options:

```typescript
import type { FastifyPluginAsync } from "fastify";

const myPlugin: FastifyPluginAsync = async (app, opts) => {
  // Add hooks, decorators, or routes
  app.get("/hello", async () => ({ message: "Hello" }));
};
```

Plugins are registered with `app.register()`:

```typescript
await app.register(myPlugin, { prefix: "/api" });
```

## Encapsulation

By default, Fastify plugins are **encapsulated**. Decorators and hooks added inside a plugin are not visible outside of it:

```typescript
const pluginA: FastifyPluginAsync = async (app) => {
  app.decorate("helperA", () => "A");
  // app.helperA is available here
};

const pluginB: FastifyPluginAsync = async (app) => {
  // app.helperA is NOT available here - encapsulated to pluginA
};

await app.register(pluginA);
await app.register(pluginB);
// app.helperA is NOT available at root level either
```

This isolation prevents naming conflicts and keeps plugins modular.

## Breaking Encapsulation with fastify-plugin

When you want decorators or hooks to be available **everywhere**, wrap the plugin with `fastify-plugin`:

```typescript
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const sharedPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("sharedHelper", () => "shared");
};

// Export wrapped - decorators escape encapsulation
export const sharedMiddleware = fp(sharedPlugin, {
  name: "sharedMiddleware",
});
```

Now `app.sharedHelper` is available to all plugins registered after it.

### When to use fastify-plugin

| Use Case | Use `fp()`? |
|----------|-------------|
| Session middleware (populates `request.user`) | Yes |
| Auth guards (`app.requireAuth`) | Yes |
| Rate limiting (global) | Yes |
| Route handlers | No |
| Route-specific middleware | No |

In RaptScallions, all middleware uses `fp()` while routes do not:

```typescript
// apps/api/src/middleware/session.middleware.ts
export const sessionMiddleware = fp(sessionMiddlewarePlugin, {
  name: "sessionMiddleware",
});

// apps/api/src/routes/auth.routes.ts (no fp() - stays encapsulated)
export const authRoutes: FastifyPluginAsync = async (app) => {
  // Routes stay within this plugin scope
};
```

## Decorators

Decorators add properties or methods to the Fastify instance or request object.

### Instance decorators

Add helpers available on `app`:

```typescript
app.decorate("requireAuth", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
});

// Usage in routes
app.get("/protected", {
  preHandler: [app.requireAuth],
}, handler);
```

### Request decorators

Add properties to the request object:

```typescript
app.decorateRequest("user", null);
app.decorateRequest("session", null);

// Now request.user and request.session exist on all requests
```

::: warning Decorate before hooks
You must call `decorateRequest()` before adding hooks that use that property. Fastify validates that decorated properties exist.
:::

## Hooks

Hooks run at specific points in the request lifecycle:

```typescript
const sessionMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  // onRequest runs first, before routing
  app.addHook("onRequest", async (request, reply) => {
    const sessionId = request.cookies["session"];

    if (sessionId) {
      const { session, user } = await sessionService.validate(sessionId);
      request.user = user;
      request.session = session;
    }
  });
};
```

See [Request Lifecycle](/api/concepts/request-lifecycle) for the full hook order.

## Plugin Dependencies

Plugins can declare dependencies on other plugins:

```typescript
export const rateLimitMiddleware = fp(rateLimitPlugin, {
  name: "rateLimitMiddleware",
  dependencies: ["@fastify/cookie"], // Requires cookie plugin
});
```

Fastify throws an error if dependencies aren't registered first.

## Route Plugins

Routes are typically organized as plugins by domain:

```typescript
// apps/api/src/routes/auth.routes.ts
export const authRoutes: FastifyPluginAsync = async (app) => {
  // OAuth routes (nested plugin)
  await app.register(oauthRoutes, { prefix: "" });

  // Use Zod type provider for this scope
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post("/register", { schema: { body: registerSchema } },
    async (request, reply) => {
      // Handle registration
    }
  );

  typedApp.post("/login", { schema: { body: loginSchema } },
    async (request, reply) => {
      // Handle login
    }
  );
};
```

Routes are registered with prefixes:

```typescript
await app.register(healthRoutes);              // /health, /ready
await app.register(authRoutes, { prefix: "/auth" });  // /auth/register, /auth/login
```

## Plugin Options

Plugins can accept configuration options:

```typescript
interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike;
}

const sessionMiddlewarePlugin: FastifyPluginAsync<SessionMiddlewareOptions> =
  async (app, opts = {}) => {
    // Use injected service or default
    const service = opts.sessionService ?? defaultSessionService;
    // ...
  };
```

This enables dependency injection for testing:

```typescript
await app.register(sessionMiddleware, {
  sessionService: mockSessionService,
});
```

## Type Augmentation

When decorators are added, TypeScript needs to know about them. Use declaration merging:

```typescript
// At the end of the plugin file
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: MemberRole[]) =>
      (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: SessionUser | null;
    session: Session | null;
    groupMembership?: GroupMember;
  }
}
```

This provides full type safety when using decorators.

## Best Practices

### Plugin naming

Always provide a name for `fp()` wrapped plugins:

```typescript
export const authMiddleware = fp(authMiddlewarePlugin, {
  name: "authMiddleware", // Useful for debugging
});
```

### Single responsibility

Each plugin should do one thing:

- `sessionMiddleware` — validate sessions
- `authMiddleware` — provide auth guards
- `rateLimitMiddleware` — rate limiting
- `authRoutes` — authentication endpoints

### Registration order

Register plugins in dependency order:

```typescript
// 1. Core (CORS, cookies)
// 2. Session (needs cookies)
// 3. Rate limit (needs session for user-based limiting)
// 4. Auth guards (needs session for request.user)
// 5. Permission middleware (needs auth)
// 6. Routes (use all decorators)
// 7. Error handler (catches errors from routes)
```

### Avoid circular dependencies

Plugins should not depend on each other circularly. If A needs B and B needs A, refactor into a third plugin C that both can use.

## Related Pages

- [Fastify Setup](/api/concepts/fastify-setup) — Server initialization and plugin registration
- [Request Lifecycle](/api/concepts/request-lifecycle) — Hook execution order
- [Middleware](/api/patterns/middleware) — Session, auth, and rate limiting implementations
- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Testing patterns for plugins
