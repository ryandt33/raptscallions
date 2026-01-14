---
title: Integration Tests
description: End-to-end API testing patterns with mocked dependencies
related_code:
  - apps/api/src/__tests__/integration/auth.routes.test.ts
  - apps/api/src/__tests__/integration/auth.guards.test.ts
  - apps/api/src/__tests__/integration/oauth.routes.test.ts
last_verified: 2026-01-14
---

# Integration Tests

Integration tests verify that multiple components work together correctly. In RaptScallions, integration tests use the real Fastify server with mocked external dependencies (database, Redis, OAuth providers).

## What to Test

Integration tests verify:

- **Route handlers** — Request parsing, response format
- **Middleware chain** — Session, auth, rate limiting
- **Validation** — Zod schema enforcement
- **Error handling** — Error responses, status codes
- **Cookie handling** — Session cookies set/cleared

Integration tests do **not** test:

- Database queries (mocked)
- External APIs (mocked)
- Third-party services (mocked)

::: info Unit vs Integration
- **Unit tests**: Test a single function/class in isolation
- **Integration tests**: Test the HTTP layer with mocked dependencies
- **E2E tests**: Test against real database and services (not yet implemented)
:::

## Complete Integration Test Example

From `apps/api/src/__tests__/integration/auth.routes.test.ts`:

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";

// Hoisted mocks
const { mockDb, mockLucia, rateLimitStore } = vi.hoisted(() => {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  };

  const mockLucia = {
    createSession: vi.fn(),
    invalidateSession: vi.fn(),
    createSessionCookie: vi.fn(),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      name: "rapt_session",
      value: "",
      attributes: {},
    }),
    validateSession: vi.fn(),
    sessionCookieName: "rapt_session",
  };

  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  return { mockDb, mockLucia, rateLimitStore };
});

// Module mocks
vi.mock("@raptscallions/db", () => ({ db: mockDb }));

vi.mock("@raptscallions/auth", () => {
  const sessionService = {
    sessionCookieName: "rapt_session",
    validate: (sessionId: string) => mockLucia.validateSession(sessionId),
    create: (userId: string) => mockLucia.createSession(userId, {}),
    invalidate: (sessionId: string) => mockLucia.invalidateSession(sessionId),
    createBlankSessionCookie: () => mockLucia.createBlankSessionCookie(),
  };

  return { lucia: mockLucia, sessionService };
});

vi.mock("@node-rs/argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn(),
}));

// Mock Redis for rate limiting
vi.mock("ioredis", () => {
  const MockRedis = vi.fn(() => createMockRedisInstance());
  return { default: MockRedis, Redis: MockRedis };
});

describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.resetModules();

    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";

    const { createServer } = await import("../../server.js");
    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitStore.clear();
  });

  describe("POST /auth/register", () => {
    it("should register new user and return 201 with session cookie", async () => {
      // Arrange
      const newUser = {
        email: "newuser@example.com",
        name: "New User",
        password: "password123",
      };

      const createdUser = {
        id: "user-123",
        email: newUser.email,
        name: newUser.name,
        passwordHash: "hashed-password",
        status: "pending_verification",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });
      mockLucia.createSession.mockResolvedValue({
        id: "session-123",
        userId: createdUser.id,
        expiresAt: new Date(),
      });
      mockLucia.createSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "session-123",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: newUser,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      });
      expect(response.cookies).toHaveLength(1);
      expect(response.cookies[0]).toMatchObject({
        name: "rapt_session",
        value: "session-123",
      });
    });

    it("should return 409 for duplicate email", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "existing@example.com",
          name: "Test User",
          password: "password123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe("CONFLICT");
    });

    it("should return 400 for invalid email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "not-an-email",
          name: "Test User",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
```

## Test Organization

Group integration tests by feature or route:

```
apps/api/src/__tests__/integration/
├── auth.routes.test.ts      # Registration, login, logout
├── auth.guards.test.ts      # Authentication guards
├── oauth.routes.test.ts     # OAuth flows
├── rate-limit.test.ts       # Rate limiting
└── health.test.ts           # Health check
```

## Testing Multiple Scenarios

### Happy Path

Test the expected success case first:

```typescript
it("should login user and set session cookie", async () => {
  mockDb.query.users.findFirst.mockResolvedValue(existingUser);
  mockVerify.mockResolvedValue(true);
  mockLucia.createSession.mockResolvedValue({ id: "session-123" });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "test@example.com", password: "password123" },
  });

  expect(response.statusCode).toBe(200);
  expect(response.cookies[0].name).toBe("rapt_session");
});
```

### Error Cases

Test each error condition:

```typescript
it("should return 401 for invalid email", async () => {
  mockDb.query.users.findFirst.mockResolvedValue(undefined);

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "nonexistent@example.com", password: "password" },
  });

  expect(response.statusCode).toBe(401);
  expect(response.json().code).toBe("UNAUTHORIZED");
});

it("should return 401 for invalid password", async () => {
  mockDb.query.users.findFirst.mockResolvedValue(existingUser);
  mockVerify.mockResolvedValue(false);

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "test@example.com", password: "wrong-password" },
  });

  expect(response.statusCode).toBe(401);
});

it("should return 401 for OAuth user (no password)", async () => {
  mockDb.query.users.findFirst.mockResolvedValue({
    ...existingUser,
    passwordHash: null,
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "oauth@example.com", password: "password123" },
  });

  expect(response.statusCode).toBe(401);
});
```

### Edge Cases

Test boundary conditions:

```typescript
it("should handle session that expires during request", async () => {
  mockLucia.validateSession.mockResolvedValue({
    session: null,  // Session expired
    user: null,
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/logout",
    cookies: { rapt_session: "expired-session" },
  });

  // Logout should still succeed and clear cookie
  expect(response.statusCode).toBe(204);
  const blankCookie = response.cookies.find(
    (c) => c.name === "rapt_session" && c.value === ""
  );
  expect(blankCookie).toBeDefined();
});
```

## Testing Rate Limiting

Mock Redis rate limit store:

```typescript
const createMockRedisInstance = () => {
  const instance: Record<string, unknown> = {
    on: vi.fn(),
    quit: vi.fn(),
    defineCommand: vi.fn((name: string) => {
      if (name === "rateLimit") {
        instance.rateLimit = (
          key: string,
          timeWindow: number,
          max: number,
          _ban: number,
          _continueExceeding: string,
          callback: (err: Error | null, result: [number, number, boolean] | null) => void
        ) => {
          const now = Date.now();
          const entry = rateLimitStore.get(key);

          if (!entry || entry.resetAt < now) {
            rateLimitStore.set(key, { count: 1, resetAt: now + timeWindow });
            callback(null, [1, timeWindow, false]);
          } else {
            entry.count += 1;
            rateLimitStore.set(key, entry);
            const ttl = entry.resetAt - now;
            callback(null, [entry.count, ttl > 0 ? ttl : 0, false]);
          }
        };
      }
    }),
  };
  return instance;
};
```

Test rate limit behavior:

```typescript
it("should rate limit after too many requests", async () => {
  // Make requests up to limit
  for (let i = 0; i < 5; i++) {
    await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@example.com", password: "wrong" },
    });
  }

  // Next request should be rate limited
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "test@example.com", password: "wrong" },
  });

  expect(response.statusCode).toBe(429);
});
```

## Testing Guard Composition

Test chained middleware guards:

```typescript
describe("Guard Composition", () => {
  it("should correctly chain multiple guards", async () => {
    mockSessionService.validate.mockResolvedValue({
      session: { id: "session-123", userId: "user-123" },
      user: { id: "user-123", status: "active" },
    });

    mockDb.query.groupMembers.findFirst.mockResolvedValue({
      userId: "user-123",
      groupId: "group-456",
      role: "group_admin",
    });

    // Route: requireAuth + requireGroupFromParams + requireGroupRole
    const response = await app.inject({
      method: "GET",
      url: "/test/group/group-456/manage",
      cookies: { rapt_session: "session-123" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should fail at first failed guard", async () => {
    mockSessionService.validate.mockResolvedValue({
      session: null,
      user: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/test/group/group-456/manage",
    });

    // Fails at requireAuth (first guard)
    expect(response.statusCode).toBe(401);
    // requireGroupFromParams should not have been called
    expect(mockDb.query.groupMembers.findFirst).not.toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Reset state in beforeEach** — Clear mocks and any shared state
2. **Use realistic mock data** — Mirror actual database responses
3. **Test the contract** — Focus on request/response shape, not implementation
4. **Test error responses** — Verify error codes and messages
5. **Test cookie handling** — Verify cookies are set/cleared correctly
6. **Group related tests** — Use nested describe blocks by endpoint

## Related Pages

- [Fastify Testing](/testing/patterns/fastify-testing) — app.inject() API details
- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Plugin registration issues
- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
- [Test Factories](/testing/patterns/factories) — Creating mock data
- [Testing Overview](/testing/) — All testing patterns

## References

**Key Files:**
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts) — Complete integration test
- [auth.guards.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.guards.test.ts) — Guard testing
- [oauth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/oauth.routes.test.ts) — OAuth flow testing

**Implements:** E02-T008 (Auth integration tests)
