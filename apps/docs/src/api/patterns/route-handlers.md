---
title: Route Handler Patterns
description: Typed route definitions with Zod validation and service layer integration
related_code:
  - apps/api/src/routes/auth.routes.ts
  - apps/api/src/routes/health.routes.ts
  - apps/api/src/routes/oauth.routes.ts
last_verified: 2026-01-14
---

# Route Handler Patterns

This guide covers how to define route handlers in RaptScallions. Routes use TypeScript generics with Zod validation for type-safe request handling.

## Basic Route Structure

Routes are defined as Fastify plugins:

```typescript
// apps/api/src/routes/example.routes.ts
import type { FastifyPluginAsync } from "fastify";

export const exampleRoutes: FastifyPluginAsync = async (app) => {
  app.get("/hello", async (request, reply) => {
    return reply.send({ message: "Hello, world!" });
  });
};
```

Register routes in the server:

```typescript
// apps/api/src/server.ts
await app.register(exampleRoutes, { prefix: "/api" });
// Route is now accessible at GET /api/hello
```

## Typed Request Bodies

Use the Zod type provider for typed and validated requests:

```typescript
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Enable Zod types for this plugin scope
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/users",
    {
      schema: { body: createUserSchema },
    },
    async (request, reply) => {
      // request.body is fully typed:
      // { email: string; name: string; password: string }
      const { email, name, password } = request.body;

      // If validation fails, Fastify returns 400 automatically
      return reply.status(201).send({
        data: { email, name },
      });
    }
  );
};
```

## Route Parameters

Type route parameters with generics:

```typescript
typedApp.get<{
  Params: { userId: string };
}>(
  "/users/:userId",
  async (request, reply) => {
    const { userId } = request.params;
    // userId is typed as string
  }
);
```

Combine with Zod for parameter validation:

```typescript
const paramsSchema = z.object({
  userId: z.string().uuid(),
});

typedApp.get(
  "/users/:userId",
  {
    schema: { params: paramsSchema },
  },
  async (request, reply) => {
    // request.params.userId is validated as UUID
  }
);
```

## Query Parameters

Type and validate query strings:

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

typedApp.get(
  "/users",
  {
    schema: { querystring: querySchema },
  },
  async (request, reply) => {
    const { page, limit, search } = request.query;
    // page and limit have defaults applied
    // search is string | undefined
  }
);
```

## Route Configuration

Routes can be configured with several options:

```typescript
app.post("/endpoint", {
  // Schema validation
  schema: {
    body: bodySchema,
    params: paramsSchema,
    querystring: querySchema,
    response: { 200: responseSchema }, // Validate responses too
  },

  // PreHandlers run before handler
  preHandler: [
    app.requireAuth,
    app.requireRole("teacher"),
  ],

  // Rate limiting (overrides global)
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 hour",
    },
  },
}, handler);
```

## Auth Routes Example

Here's the actual auth routes implementation:

```typescript
// apps/api/src/routes/auth.routes.ts
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { registerSchema, loginSchema } from "@raptscallions/core";
import { AuthService } from "../services/auth.service.js";
import { lucia } from "@raptscallions/auth";

const authService = new AuthService();

export const authRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/register
  typedApp.post(
    "/register",
    {
      schema: { body: registerSchema },
    },
    async (request, reply) => {
      const { user, sessionId } = await authService.register(request.body);

      // Set session cookie
      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.status(201).send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  // POST /auth/login
  typedApp.post(
    "/login",
    {
      schema: { body: loginSchema },
    },
    async (request, reply) => {
      const { user, sessionId } = await authService.login(request.body);

      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  // POST /auth/logout (no auth required)
  app.post("/logout", async (request, reply) => {
    if (request.session) {
      await authService.logout(request.session.id);
    }

    const blankCookie = lucia.createBlankSessionCookie();
    reply.setCookie(
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );

    return reply.status(204).send();
  });
};
```

## Health Routes Example

Routes that exempt themselves from rate limiting:

```typescript
// apps/api/src/routes/health.routes.ts
import type { FastifyPluginAsync } from "fastify";
import { queryClient } from "@raptscallions/db";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Basic health check - exempt from rate limiting
  app.get(
    "/health",
    {
      config: { rateLimit: false },
    },
    async (_request, reply) => {
      return reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }
  );

  // Readiness check with dependency validation
  app.get(
    "/ready",
    {
      config: { rateLimit: false },
    },
    async (_request, reply) => {
      const checks = { database: "error" as "ok" | "error" };

      try {
        await queryClient.unsafe("SELECT 1");
        checks.database = "ok";
      } catch (error) {
        // Log but don't throw
      }

      const ready = checks.database === "ok";
      return reply.status(ready ? 200 : 503).send({
        ready,
        checks,
      });
    }
  );
};
```

## Response Format

All successful responses follow a consistent envelope:

```typescript
// Success with data
return reply.send({
  data: { id: "123", email: "user@example.com" },
});

// Created
return reply.status(201).send({
  data: { id: "456", name: "New Resource" },
});

// No content
return reply.status(204).send();

// Paginated list
return reply.send({
  data: users,
  meta: {
    page: 1,
    limit: 20,
    total: 150,
    hasMore: true,
  },
});
```

::: tip Consistent Envelope
Always wrap response data in a `data` property. This makes it easy to add metadata later and keeps the API consistent.
:::

## Service Layer Integration

Routes should delegate business logic to services:

```typescript
// BAD - business logic in route
typedApp.post("/register", { schema: { body: registerSchema } },
  async (request, reply) => {
    const existing = await db.query.users.findFirst({ /* ... */ });
    if (existing) throw new ConflictError("Email exists");
    const hash = await bcrypt.hash(request.body.password);
    // ... more business logic ...
  }
);

// GOOD - delegate to service
typedApp.post("/register", { schema: { body: registerSchema } },
  async (request, reply) => {
    const { user, sessionId } = await authService.register(request.body);

    const cookie = lucia.createSessionCookie(sessionId);
    reply.setCookie(cookie.name, cookie.value, cookie.attributes);

    return reply.status(201).send({
      data: { id: user.id, email: user.email, name: user.name },
    });
  }
);
```

<!-- TODO: Add link to service layer patterns when page exists -->

## Nested Route Plugins

Routes can register sub-routes:

```typescript
export const authRoutes: FastifyPluginAsync = async (app) => {
  // Register OAuth routes as nested plugin
  await app.register(oauthRoutes, { prefix: "" });

  // Regular routes
  app.post("/register", /* ... */);
  app.post("/login", /* ... */);
};
```

The OAuth routes become available at `/auth/google`, `/auth/microsoft`, etc.

## Best Practices

### Use withTypeProvider

Always enable the Zod type provider when using schemas:

```typescript
const typedApp = app.withTypeProvider<ZodTypeProvider>();
```

### Keep handlers thin

Route handlers should:

1. Extract input from request
2. Call service method
3. Format and return response

Avoid putting business logic in handlers.

### Use meaningful status codes

| Code | When to use |
|------|-------------|
| 200 | Success with body |
| 201 | Resource created |
| 204 | Success, no body |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Server error |

### Organize by domain

Group related routes into domain-specific files:

```
apps/api/src/routes/
├── health.routes.ts
├── auth.routes.ts
├── oauth.routes.ts
├── users.routes.ts
├── groups.routes.ts
└── tools.routes.ts
```

## Related Pages

- [Validation](/api/patterns/validation) — Zod schemas and validation patterns
- [Error Handling](/api/patterns/error-handling) — Typed errors and error responses
- [Middleware](/api/patterns/middleware) — Auth guards and preHandlers
- [Request Lifecycle](/api/concepts/request-lifecycle) — When hooks and handlers run
