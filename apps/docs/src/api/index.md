---
title: API Design & Patterns
description: Fastify server architecture, route handlers, middleware, and RESTful patterns
related_code:
  - apps/api/src/**/*.ts
  - packages/core/src/errors/**/*.ts
last_verified: 2026-01-14
---

# API Design & Patterns

This domain covers the Fastify API layer architecture, including server setup, plugin composition, route handlers, middleware patterns, validation, and error handling. RaptScallions uses Fastify (not Express) for its performance advantages and native TypeScript support.

## Key Features

| Feature | Implementation | Source |
|---------|----------------|--------|
| **Framework** | Fastify 4.x with TypeScript | [server.ts](../../apps/api/src/server.ts) |
| **Validation** | Zod schemas with type inference | [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod) |
| **Error Handling** | Typed AppError classes | [packages/core/src/errors/](https://github.com/ryandt33/raptscallions/tree/main/packages/core/src/errors) |
| **Rate Limiting** | Redis-backed @fastify/rate-limit | [rate-limit.middleware.ts](../../apps/api/src/middleware/rate-limit.middleware.ts) |
| **Session** | Cookie-based with Lucia | [session.middleware.ts](../../apps/api/src/middleware/session.middleware.ts) |
| **Auth Guards** | Decorators for route protection | [auth.middleware.ts](../../apps/api/src/middleware/auth.middleware.ts) |

## Why Fastify?

Fastify was chosen over Express for several reasons:

- **Performance**: 2-3x faster request handling
- **TypeScript-first**: Native type definitions and schema validation
- **Plugin architecture**: Clean encapsulation and dependency management
- **Schema validation**: Built-in support for JSON Schema (we use Zod provider)
- **Modern async/await**: No callback-based middleware

<!-- TODO: Add link to ADR when /api/decisions/001-fastify-over-express is created -->

## Quick Start

### Creating a Route

```typescript
// apps/api/src/routes/example.routes.ts
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const inputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const exampleRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/example",
    {
      schema: { body: inputSchema },
      preHandler: [app.requireAuth],
    },
    async (request, reply) => {
      // request.body is typed and validated
      const { name, email } = request.body;

      return reply.status(201).send({
        data: { name, email },
      });
    }
  );
};
```

### Adding Authentication

```typescript
// Protected route requiring any authenticated user
app.get("/protected", {
  preHandler: [app.requireAuth],
}, handler);

// Route requiring specific role
app.post("/admin/action", {
  preHandler: [app.requireAuth, app.requireRole("system_admin")],
}, handler);

// Route requiring permission (CASL)
app.delete("/groups/:id", {
  preHandler: [app.requireAuth, app.requirePermission("delete", "Group")],
}, handler);
```

### Throwing Errors

```typescript
import { NotFoundError, ValidationError, ConflictError } from "@raptscallions/core";

// In a route handler or service:
throw new NotFoundError("User", userId);
// Returns: { error: "User not found: abc-123", code: "NOT_FOUND" }

throw new ConflictError("Email already registered");
// Returns: { error: "Email already registered", code: "CONFLICT" }
```

## Concepts

Core mental models for understanding the API layer:

- **[Fastify Setup](/api/concepts/fastify-setup)** — Server initialization, configuration, and graceful shutdown
- **[Plugin Architecture](/api/concepts/plugin-architecture)** — How Fastify plugins encapsulate functionality
- **[Request Lifecycle](/api/concepts/request-lifecycle)** — Hook execution order from request to response

## Patterns

Reusable implementation patterns from actual code:

- **[Route Handlers](/api/patterns/route-handlers)** — Route definition with types and validation
- **[Error Handling](/api/patterns/error-handling)** — AppError classes and global error handler
- **[Validation](/api/patterns/validation)** — Zod schemas with Fastify integration
- **[Middleware](/api/patterns/middleware)** — Session, auth guards, rate limiting, logging

## Decisions

Architecture decision records explaining key choices:

- **Fastify Over Express** — Why we chose Fastify (coming soon)

## Troubleshooting

Common issues and solutions:

- **Plugin Issues** — Plugin encapsulation and registration problems (coming soon)
- **Common Errors** — Validation failures, auth errors, CORS issues (coming soon)

## Source Material

This documentation was created from these implemented tasks:

| Task | Description |
|------|-------------|
| E02-T001 | Fastify API server foundation |
| E02-T002 | Sessions table and Lucia setup |
| E02-T003 | Email/password authentication routes |
| E02-T004 | OAuth integration with Arctic |
| E02-T005 | CASL permission definitions and middleware |
| E02-T006 | Authentication guards and decorators |
| E02-T007 | Rate limiting middleware |

## Related Domains

- [Authentication & Authorization](/auth/) — Session management, permission system
- [Database & ORM](/database/) — Drizzle queries in services
- [Testing](/testing/) — Testing Fastify routes with Vitest
