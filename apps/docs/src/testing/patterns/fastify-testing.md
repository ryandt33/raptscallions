---
title: Fastify Testing
description: Integration tests with app.inject(), plugin registration, and test server setup
related_code:
  - apps/api/src/__tests__/integration/auth.routes.test.ts
  - apps/api/src/__tests__/integration/auth.guards.test.ts
  - apps/api/src/__tests__/integration/health.test.ts
last_verified: 2026-01-14
---

# Fastify Testing

Fastify provides `app.inject()` for testing HTTP requests without network overhead. This guide covers test server setup, plugin registration, and the `inject()` API.

## Test Server Setup

Create the Fastify app in `beforeAll`, clean up in `afterAll`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";

describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Reset module cache to ensure mocks are applied
    vi.resetModules();

    // Set up environment
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";

    // Create server
    const { createServer } = await import("../../server.js");
    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests...
});
```

::: warning Essential Steps
1. **`vi.resetModules()`** — Clear module cache so mocks are applied
2. **Set environment variables** — Before importing app code
3. **`await app.ready()`** — Implicit when using `createServer()`, explicit otherwise
4. **`await app.close()`** — Always clean up in `afterAll`
:::

## The inject() API

`app.inject()` simulates HTTP requests without network:

```typescript
const response = await app.inject({
  method: "POST",
  url: "/auth/register",
  payload: {
    email: "test@example.com",
    name: "Test User",
    password: "password123",
  },
});
```

### Request Options

| Option | Type | Description |
|--------|------|-------------|
| `method` | `string` | HTTP method (GET, POST, PUT, DELETE, etc.) |
| `url` | `string` | Request path |
| `payload` | `object` | Request body (auto-serialized to JSON) |
| `query` | `object` | Query string parameters |
| `headers` | `object` | Request headers |
| `cookies` | `object` | Request cookies |

### Response Object

```typescript
const response = await app.inject({ method: "GET", url: "/health" });

response.statusCode;    // 200
response.headers;       // { "content-type": "application/json; charset=utf-8", ... }
response.body;          // Raw string body
response.json();        // Parsed JSON body
response.cookies;       // Array of set cookies
```

## Common Patterns

### Testing with Cookies (Authentication)

```typescript
it("should return 200 for authenticated request", async () => {
  // Arrange - set up mock to return valid session
  mockSessionService.validate.mockResolvedValue({
    session: { id: "session-123", userId: "user-123" },
    user: { id: "user-123", email: "test@example.com", status: "active" },
  });

  // Act
  const response = await app.inject({
    method: "GET",
    url: "/api/protected",
    cookies: { rapt_session: "session-123" },
  });

  // Assert
  expect(response.statusCode).toBe(200);
});
```

### Testing Set Cookies

```typescript
it("should set session cookie on login", async () => {
  // Arrange
  mockDb.query.users.findFirst.mockResolvedValue(existingUser);
  mockLucia.createSession.mockResolvedValue({ id: "session-456" });
  mockLucia.createSessionCookie.mockReturnValue({
    name: "rapt_session",
    value: "session-456",
    attributes: { maxAge: 60 * 60 * 24 * 30 },
  });

  // Act
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "test@example.com", password: "password123" },
  });

  // Assert
  expect(response.cookies).toHaveLength(1);
  expect(response.cookies[0]).toMatchObject({
    name: "rapt_session",
    value: "session-456",
  });
});
```

### Testing Error Responses

```typescript
it("should return 401 for invalid credentials", async () => {
  // Arrange
  mockDb.query.users.findFirst.mockResolvedValue(undefined);

  // Act
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "nonexistent@example.com", password: "password" },
  });

  // Assert
  expect(response.statusCode).toBe(401);
  const body = response.json();
  expect(body.code).toBe("UNAUTHORIZED");
  expect(body.error).toBeDefined();
});
```

### Testing Validation Errors

```typescript
it("should return 400 for invalid email format", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "not-an-email", password: "password123" },
  });

  expect(response.statusCode).toBe(400);
  expect(response.json().code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
});
```

## Custom Test Server

For tests that need specific plugin configuration:

```typescript
describe("Authentication Guards", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create a custom test server
    const fastify = await import("fastify");
    const cookie = await import("@fastify/cookie");
    const { sessionMiddleware } = await import("../../middleware/session.middleware.js");
    const { authMiddleware } = await import("../../middleware/auth.middleware.js");

    app = fastify.default({
      logger: false,
      requestIdHeader: "x-request-id",
      trustProxy: true,
    });

    // Register plugins in order
    await app.register(cookie.default, {
      secret: "test-secret",
    });

    // Inject mock services
    await app.register(sessionMiddleware, {
      sessionService: mockSessionService,
    });

    await app.register(authMiddleware);

    // Register test routes
    await app.register(async (testRoutes) => {
      testRoutes.get("/test/protected", {
        preHandler: [app.requireAuth],
      }, async () => ({ message: "protected" }));

      testRoutes.get("/test/teacher-only", {
        preHandler: [app.requireAuth, app.requireRole("teacher")],
      }, async () => ({ message: "teacher" }));
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Tests...
});
```

## Testing Guards

Test authentication and authorization guards:

```typescript
describe("requireAuth", () => {
  it("should return 401 without session", async () => {
    mockSessionService.validate.mockResolvedValue({
      session: null,
      user: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/test/protected",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("UNAUTHORIZED");
  });

  it("should pass with valid session", async () => {
    mockSessionService.validate.mockResolvedValue({
      session: { id: "session-123", userId: "user-123" },
      user: { id: "user-123", email: "test@example.com", status: "active" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/test/protected",
      cookies: { rapt_session: "session-123" },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("requireRole", () => {
  it("should return 403 if user lacks required role", async () => {
    mockSessionService.validate.mockResolvedValue({
      session: { id: "session-123", userId: "user-123" },
      user: { id: "user-123", status: "active" },
    });

    mockDb.query.groupMembers.findMany.mockResolvedValue([
      { role: "student", groupId: "group-1" },
    ]);

    const response = await app.inject({
      method: "GET",
      url: "/test/teacher-only",
      cookies: { rapt_session: "session-123" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("FORBIDDEN");
  });
});
```

## Testing Request/Response Shape

Use `toMatchObject` for partial matching:

```typescript
it("should return user data on successful login", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "test@example.com", password: "password123" },
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    data: {
      id: expect.any(String),
      email: "test@example.com",
      name: expect.any(String),
    },
  });
});
```

## Testing with Query Parameters

```typescript
it("should filter users by status", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/users",
    query: {
      status: "active",
      limit: "10",
    },
  });

  expect(response.statusCode).toBe(200);
});
```

## Testing with Headers

```typescript
it("should accept custom request ID", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/health",
    headers: {
      "x-request-id": "test-request-123",
    },
  });

  expect(response.statusCode).toBe(200);
});
```

## Related Pages

- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Why hooks don't apply globally
- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
- [Integration Tests](/testing/patterns/integration-tests) — Full API testing
- [Testing Overview](/testing/) — All testing patterns

## References

**Key Files:**
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts) — Complete integration test
- [auth.guards.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.guards.test.ts) — Guard testing
- [health.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/health.test.ts) — Simple integration test

**External Resources:**
- [Fastify Testing Guide](https://fastify.dev/docs/latest/Guides/Testing/)
- [Fastify inject() Documentation](https://fastify.dev/docs/latest/Reference/Server/#inject)

**Implements:** E02-T008 (Auth integration tests)
