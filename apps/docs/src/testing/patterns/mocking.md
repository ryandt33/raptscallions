---
title: Mocking Patterns
description: vi.mock(), vi.hoisted(), spies, and when to use dependency injection instead
related_code:
  - apps/api/src/__tests__/integration/auth.routes.test.ts
  - apps/api/src/__tests__/integration/auth.guards.test.ts
  - apps/api/src/middleware/session.middleware.ts
last_verified: 2026-01-14
---

# Mocking Patterns

Vitest provides powerful mocking utilities, but they require careful use in a monorepo with module aliases. This guide covers `vi.mock()`, `vi.hoisted()`, and when to use dependency injection instead.

## The Module Mocking Challenge

In RaptScallions, packages are imported by alias:

```typescript
import { db } from "@raptscallions/db";
import { sessionService } from "@raptscallions/auth";
```

These aliases resolve to source files that often create **singletons** at module load time. This creates a timing problem:

1. Module is imported
2. Singleton is created with real dependencies
3. `vi.mock()` runs (too late!)

::: danger Singletons Defeat Mocks
If a module creates a singleton at load time, `vi.mock()` won't replace it. The singleton was already created with the real implementation.
:::

## vi.hoisted() — The Solution

Use `vi.hoisted()` to create mock objects **before** any imports:

```typescript
// The mock objects are created FIRST, before any imports
const { mockDb, mockLucia, mockSessionService } = vi.hoisted(() => {
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
    validateSession: vi.fn(),
    invalidateSession: vi.fn(),
  };

  const mockSessionService = {
    sessionCookieName: "rapt_session",
    validate: vi.fn(),
    create: vi.fn(),
    invalidate: vi.fn(),
  };

  return { mockDb, mockLucia, mockSessionService };
});

// Now vi.mock() can use the hoisted mock objects
vi.mock("@raptscallions/db", () => ({
  db: mockDb,
}));

vi.mock("@raptscallions/auth", () => ({
  lucia: mockLucia,
  sessionService: mockSessionService,
}));
```

### Why vi.hoisted() Works

Vitest processes `vi.hoisted()` blocks **first**, moving them to the top of the file before any imports run. This ensures mock objects exist when `vi.mock()` factory functions execute.

```typescript
// What you write:
import { db } from "@raptscallions/db";

const { mockDb } = vi.hoisted(() => ({ mockDb: { query: vi.fn() } }));
vi.mock("@raptscallions/db", () => ({ db: mockDb }));

// What Vitest executes:
const { mockDb } = (() => ({ mockDb: { query: vi.fn() } }))();  // FIRST
vi.mock("@raptscallions/db", () => ({ db: mockDb }));           // SECOND
import { db } from "@raptscallions/db";                         // THIRD (uses mock)
```

## Complete Mock Example

From `apps/api/src/__tests__/integration/auth.routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";

// Use vi.hoisted to ensure mock objects are available when vi.mock factories run
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

// Hoisted mocks - these are processed BEFORE any imports
vi.mock("@raptscallions/db", () => ({
  db: mockDb,
}));

vi.mock("@raptscallions/auth", () => {
  const sessionService = {
    sessionCookieName: "rapt_session",
    validate: (sessionId: string) => mockLucia.validateSession(sessionId),
    create: (userId: string) => mockLucia.createSession(userId, {}),
    invalidate: (sessionId: string) => mockLucia.invalidateSession(sessionId),
    createBlankSessionCookie: () => mockLucia.createBlankSessionCookie(),
  };

  return {
    lucia: mockLucia,
    sessionService,
  };
});

vi.mock("@node-rs/argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn(),
}));

describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.resetModules();
    // Set up environment...
    const { createServer } = await import("../../server.js");
    app = await createServer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitStore.clear();
  });

  it("should register new user", async () => {
    // Arrange
    mockDb.query.users.findFirst.mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "user-123" }]),
      }),
    });
    mockLucia.createSession.mockResolvedValue({ id: "session-123" });
    mockLucia.createSessionCookie.mockReturnValue({
      name: "rapt_session",
      value: "session-123",
      attributes: {},
    });

    // Act
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "test@example.com", name: "Test", password: "password123" },
    });

    // Assert
    expect(response.statusCode).toBe(201);
  });
});
```

## When vi.mock() Fails

Even with `vi.hoisted()`, `vi.mock()` can fail for Fastify integration tests because:

1. **Dynamic imports** — `await import("...")` runs after mocks are set up, but the imported module may have already created singletons
2. **Singleton caching** — Node.js caches modules, so a singleton created in one test persists
3. **Plugin registration** — Fastify plugins register during `app.register()`, which may use already-instantiated singletons

### Solution: Dependency Injection

For Fastify middleware, use dependency injection instead of mocking:

```typescript
// In the middleware
export interface SessionServiceLike {
  sessionCookieName: string;
  validate: (sessionId: string) => Promise<SessionValidationResult>;
  createBlankSessionCookie: () => { name: string; value: string; attributes: Record<string, unknown> };
}

export interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike;
}

const sessionMiddlewarePlugin: FastifyPluginAsync<SessionMiddlewareOptions> = async (app, opts = {}) => {
  const sessionService = opts.sessionService ?? defaultSessionService;
  // ...
};
```

```typescript
// In the test
const mockSessionService = {
  sessionCookieName: "rapt_session",
  validate: vi.fn(),
  createBlankSessionCookie: vi.fn().mockReturnValue({
    name: "rapt_session",
    value: "",
    attributes: {},
  }),
};

await app.register(sessionMiddleware, {
  sessionService: mockSessionService as SessionServiceLike,
});
```

See [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) for the complete pattern.

## Spies vs Mocks

### vi.fn() — Mock Functions

Create a function that tracks calls and can be configured:

```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue("result");
mockFn.mockResolvedValue("async result");
mockFn.mockRejectedValue(new Error("fail"));

// Check calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
expect(mockFn).toHaveBeenCalledTimes(2);
```

### vi.spyOn() — Spy on Existing

Spy on a method of an existing object:

```typescript
const spy = vi.spyOn(console, "error").mockImplementation(() => {});

// Call the real function, but track it
someFunction();

expect(spy).toHaveBeenCalled();
spy.mockRestore();  // Restore original
```

## Mock Return Values

### Static Values

```typescript
mockFn.mockReturnValue("static");
mockFn.mockResolvedValue("async static");
```

### Dynamic Values

```typescript
mockFn.mockReturnValueOnce("first").mockReturnValueOnce("second");

mockFn();  // "first"
mockFn();  // "second"
mockFn();  // undefined
```

### Implementation

```typescript
mockFn.mockImplementation((arg) => `Result for ${arg}`);
mockFn.mockImplementationOnce((arg) => `Special ${arg}`);
```

## Clearing and Resetting

| Method | What it does |
|--------|--------------|
| `vi.clearAllMocks()` | Clear call history, keep implementations |
| `vi.resetAllMocks()` | Clear history AND implementations |
| `vi.restoreAllMocks()` | Restore original implementations |

Best practice: Use `vi.clearAllMocks()` in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Common Patterns

### Mock a Module Export

```typescript
vi.mock("./utils", () => ({
  formatDate: vi.fn().mockReturnValue("2026-01-14"),
  parseDate: vi.fn(),
}));
```

### Mock Default Export

```typescript
vi.mock("redis", () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    quit: vi.fn(),
  })),
}));
```

### Mock Class

```typescript
vi.mock("./UserService", () => ({
  UserService: vi.fn().mockImplementation(() => ({
    getById: vi.fn(),
    create: vi.fn(),
  })),
}));
```

### Partial Mock

```typescript
vi.mock("./utils", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    onlyThisFunction: vi.fn(),
  };
});
```

## Related Pages

- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Dependency injection for Fastify
- [Test Factories](/testing/patterns/factories) — Creating mock data
- [Integration Tests](/testing/patterns/integration-tests) — Full API testing
- [Common Issues](/testing/troubleshooting/common-issues) — Troubleshooting mock failures

## References

**Key Files:**
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts) — vi.hoisted example
- [auth.guards.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.guards.test.ts) — DI pattern example
- [session.middleware.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/middleware/session.middleware.ts) — SessionServiceLike interface

**External Resources:**
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [vi.hoisted() Documentation](https://vitest.dev/api/vi.html#vi-hoisted)

**Implements:** E02-T008 (Auth integration tests)
