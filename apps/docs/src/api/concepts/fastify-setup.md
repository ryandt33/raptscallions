---
title: Fastify Setup
description: Server initialization, configuration, and the createServer pattern
related_code:
  - apps/api/src/server.ts
  - apps/api/src/config.ts
  - apps/api/src/index.ts
last_verified: 2026-01-14
---

# Fastify Setup

This guide covers how the Fastify server is initialized, configured, and started in RaptScallions. The setup follows a factory pattern that separates server creation from startup, enabling testability and clean shutdown handling.

## Server Architecture

The API server is structured in three files:

| File | Purpose |
|------|---------|
| [config.ts](../../../apps/api/src/config.ts) | Environment validation with Zod |
| [server.ts](../../../apps/api/src/server.ts) | Server factory function |
| [index.ts](../../../apps/api/src/index.ts) | Entry point that starts the server |

## Environment Configuration

All environment variables are validated at startup using Zod. Invalid configuration prevents the server from starting.

```typescript
// apps/api/src/config.ts
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OAuth - Microsoft
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),
});
```

### Lazy configuration parsing

Configuration is parsed lazily on first access using a Proxy pattern. This allows tests to import the config module without requiring valid environment variables:

```typescript
// Proxy-based config that parses on first property access
export const config = new Proxy({} as Env, {
  get(_target, prop: string | symbol): unknown {
    if (typeof prop === "symbol") {
      return undefined;
    }
    const parsed = parseConfig();
    return parsed[prop as keyof Env];
  },
});
```

### Paired OAuth validation

OAuth credentials are validated as pairs - you can't set one without the other:

```typescript
.refine(
  (data) => {
    const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
    return hasGoogleId === hasGoogleSecret; // Both true or both false
  },
  {
    message:
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set or both be unset",
  }
)
```

## Server Factory

The `createServer()` function creates and configures a Fastify instance:

```typescript
// apps/api/src/server.ts
import fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using custom logger
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
    trustProxy: true, // Trust X-Forwarded-For for rate limiting
  });

  // Set up Zod type provider for schema validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register plugins (order matters!)
  await app.register(cors, { /* config */ });
  await app.register(cookie, { secret: config.SESSION_SECRET });
  await app.register(requestLogger);
  await app.register(sessionMiddleware);
  await app.register(rateLimitMiddleware);
  await app.register(authMiddleware);
  await app.register(permissionMiddleware);

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });

  // Error handler (must be last)
  app.setErrorHandler(errorHandler);

  return app;
}
```

### Why a factory function?

The factory pattern provides several benefits:

1. **Testability**: Each test can create an isolated server instance
2. **Configuration**: Different configs can be passed for different environments
3. **Clean shutdown**: The returned instance can be properly closed
4. **No global state**: Multiple instances can coexist (useful for testing)

## Fastify Configuration Options

| Option | Value | Purpose |
|--------|-------|---------|
| `logger` | `false` | Disabled - using custom OpenTelemetry logger |
| `requestIdHeader` | `"x-request-id"` | Header to read/generate request IDs |
| `requestIdLogLabel` | `"requestId"` | Label for request ID in logs |
| `trustProxy` | `true` | Trust X-Forwarded-For headers for rate limiting |

## Zod Type Provider

RaptScallions uses `fastify-type-provider-zod` for type-safe request validation:

```typescript
// Enable Zod validation globally
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// In routes, use withTypeProvider for typed requests
const typedApp = app.withTypeProvider<ZodTypeProvider>();

typedApp.post(
  "/example",
  {
    schema: { body: myZodSchema },
  },
  async (request, reply) => {
    // request.body is fully typed from the Zod schema
  }
);
```

## Plugin Registration Order

Plugins are registered in a specific order because each may depend on decorators or hooks from previous plugins:

```typescript
// 1. Core middleware
await app.register(cors, { /* config */ });
await app.register(cookie, { secret: config.SESSION_SECRET });
await app.register(requestLogger);

// 2. Session (populates request.user and request.session)
await app.register(sessionMiddleware);

// 3. Rate limiting (uses request.user for key generation)
await app.register(rateLimitMiddleware);

// 4. Auth guards (provides requireAuth, requireRole decorators)
await app.register(authMiddleware);

// 5. Permission middleware (provides requirePermission)
await app.register(permissionMiddleware);

// 6. Routes (can use all decorators from above)
await app.register(healthRoutes);
await app.register(authRoutes, { prefix: "/auth" });

// 7. Error handler (catches all errors from routes)
app.setErrorHandler(errorHandler);
```

::: warning Order Matters
Registration order is critical. For example, `rateLimitMiddleware` needs `sessionMiddleware` to run first so `request.user` is available for key generation.
:::

## Server Startup

The entry point starts the server with graceful shutdown handling:

```typescript
// apps/api/src/index.ts
import { createServer } from "./server.js";
import { config } from "./config.js";

async function main() {
  const app = await createServer();

  // Start listening
  await app.listen({
    port: config.PORT,
    host: "0.0.0.0", // Listen on all interfaces
  });

  console.log(`Server running on port ${config.PORT}`);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
```

### Graceful shutdown

When receiving `SIGTERM` or `SIGINT`, the server:

1. Stops accepting new connections
2. Waits for in-flight requests to complete
3. Closes database connections (via `app.close()`)
4. Exits cleanly

This is essential for Kubernetes deployments where pods receive `SIGTERM` during rolling updates.

## Testing Considerations

For testing, create a fresh server instance per test suite:

```typescript
import { describe, beforeAll, afterAll, it } from "vitest";
import { createServer } from "../server.js";

describe("Auth Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should register a new user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "test@example.com", password: "password123", name: "Test" },
    });

    expect(response.statusCode).toBe(201);
  });
});
```

::: tip Use app.inject()
Fastify's `inject()` method simulates HTTP requests without actually opening a socket. This is faster and avoids port conflicts.
:::

## Related Pages

- [Plugin Architecture](/api/concepts/plugin-architecture) — How plugins encapsulate functionality
- [Request Lifecycle](/api/concepts/request-lifecycle) — Hook execution order
- [Middleware](/api/patterns/middleware) — Session, auth, and rate limiting middleware
