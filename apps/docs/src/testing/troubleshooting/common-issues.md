---
title: Common Testing Issues
description: Solutions for frequent test failures and troubleshooting steps
related_code:
  - apps/api/src/__tests__/integration/auth.routes.test.ts
  - apps/api/src/__tests__/integration/auth.guards.test.ts
last_verified: 2026-01-14
---

# Common Testing Issues

This guide covers frequent test failures and their solutions, organized by symptom.

## Mocking Issues

### Mocks Not Applied

**Symptom:** Real implementations run instead of mocks, tests fail with database connection errors or real API calls.

**Cause:** Module singletons are created before `vi.mock()` runs.

**Solution:** Use `vi.hoisted()` to create mock objects before imports:

```typescript
// WRONG - mock objects created after singleton
vi.mock("@raptscallions/db", () => ({
  db: { query: { users: { findFirst: vi.fn() } } },  // Created too late
}));

// CORRECT - mock objects hoisted to top
const { mockDb } = vi.hoisted(() => ({
  mockDb: { query: { users: { findFirst: vi.fn() } } },
}));

vi.mock("@raptscallions/db", () => ({ db: mockDb }));
```

See [Mocking Patterns](/testing/patterns/mocking) for complete examples.

### Mock Not Resetting Between Tests

**Symptom:** Test passes alone but fails when run with other tests. Mock return values from previous tests affect current test.

**Solution:** Add `vi.clearAllMocks()` in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

### vi.mock() Not Mocking Correctly

**Symptom:** Some exports are mocked, others are real.

**Solution:** Ensure you're returning all required exports:

```typescript
// WRONG - missing exports
vi.mock("@raptscallions/auth", () => ({
  lucia: mockLucia,
  // Missing: sessionService, permissionMiddleware
}));

// CORRECT - all exports
vi.mock("@raptscallions/auth", () => ({
  lucia: mockLucia,
  sessionService: mockSessionService,
  permissionMiddleware: async () => {},
}));
```

## Fastify Issues

### Hooks Not Firing

**Symptom:** Session middleware `onRequest` hook never runs. `request.user` and `request.session` are always undefined.

**Cause:** Fastify encapsulation — hooks only apply within the plugin that registered them.

**Solution:** Wrap middleware with `fastify-plugin`:

```typescript
import fp from "fastify-plugin";

// WRONG - hooks only apply within this plugin
const sessionMiddleware: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => { ... });
};

// CORRECT - hooks apply globally
export const sessionMiddleware = fp(
  async (app) => {
    app.addHook("onRequest", async (request) => { ... });
  },
  { name: "sessionMiddleware" }
);
```

See [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation).

### app.inject() Returns Undefined

**Symptom:** `response` is undefined or `response.json()` throws.

**Cause:** Missing `await` or app not ready.

**Solution:** Ensure proper async handling:

```typescript
// WRONG - missing await
const response = app.inject({ method: "GET", url: "/health" });

// CORRECT
const response = await app.inject({ method: "GET", url: "/health" });

// Also ensure app is ready
beforeAll(async () => {
  app = fastify();
  await app.register(plugins);
  await app.ready();  // IMPORTANT
});
```

### Tests Timeout

**Symptom:** Tests hang and timeout after 5 seconds.

**Cause:** Usually missing `await` or unclosed resources.

**Solution:**

1. Check all async operations are awaited:
   ```typescript
   // WRONG
   it("should work", () => {  // Missing async
     const result = await service.get();  // Error!
   });

   // CORRECT
   it("should work", async () => {
     const result = await service.get();
   });
   ```

2. Ensure app is closed in `afterAll`:
   ```typescript
   afterAll(async () => {
     await app.close();
   });
   ```

3. Check for unresolved promises in mocks:
   ```typescript
   // WRONG - forgot to resolve
   mockDb.query.users.findFirst.mockReturnValue(user);

   // CORRECT - for async functions
   mockDb.query.users.findFirst.mockResolvedValue(user);
   ```

## Assertion Issues

### expect().toEqual() Fails on Dates

**Symptom:** Objects with Date fields fail equality even though they look the same.

**Solution:** Use `expect.any(Date)` or convert to ISO strings:

```typescript
// Option 1: Use expect.any()
expect(result).toEqual({
  id: "123",
  createdAt: expect.any(Date),
});

// Option 2: Compare specific fields
expect(result.id).toBe("123");
expect(result.createdAt).toBeInstanceOf(Date);
```

### expect().toMatchObject() vs toEqual()

**Symptom:** Test fails because response has extra fields you don't care about.

**Solution:** Use `toMatchObject()` for partial matching:

```typescript
// WRONG - fails if response has extra fields
expect(response.json()).toEqual({
  data: { id: "123" },
});

// CORRECT - matches subset
expect(response.json()).toMatchObject({
  data: { id: "123" },
});
```

### Checking Error Messages

**Symptom:** Test fails because error message format changed.

**Solution:** Use `toContain()` or `toMatch()` for flexible matching:

```typescript
// WRONG - brittle
expect(error.message).toBe("User not found: 123");

// CORRECT - flexible
expect(error.message).toContain("not found");
// Or
expect(error.message).toMatch(/not found/);
```

## Environment Issues

### Missing Environment Variables

**Symptom:** Tests fail with "missing required environment variable" errors.

**Solution:** Set environment variables before importing app:

```typescript
beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://...";
  process.env.REDIS_URL = "redis://...";
  process.env.SESSION_SECRET = "test-secret-at-least-32-chars";

  // AFTER setting env vars
  const { createServer } = await import("../../server.js");
  app = await createServer();
});
```

### Environment Leaking Between Tests

**Symptom:** Test passes alone but fails when run with other tests due to environment state.

**Solution:** Save and restore environment:

```typescript
describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should use default when PORT not set", async () => {
    delete process.env.PORT;
    const { config } = await import("../config.js");
    expect(config.PORT).toBe(3000);
  });
});
```

## Coverage Issues

### Coverage Below Threshold

**Symptom:** Tests pass but coverage check fails with "Coverage is below threshold".

**Cause:** Untested code paths.

**Solutions:**

1. Run coverage report to see what's missed:
   ```bash
   pnpm test:coverage
   # Open coverage/index.html in browser
   ```

2. Add tests for uncovered branches:
   ```typescript
   // If you have: if (user.status === "suspended") throw new Error()
   // Add test for suspended case:
   it("should throw for suspended user", async () => {
     const user = createMockUser({ status: "suspended" });
     await expect(service.validate(user)).rejects.toThrow();
   });
   ```

3. Exclude untestable code from coverage:
   ```typescript
   // vitest.config.ts
   coverage: {
     exclude: [
       '**/types/**',      // Type definitions
       '**/migrations/**', // SQL migrations
       'packages/*/src/index.ts',  // Barrel exports
     ],
   }
   ```

### Coverage Report Shows Wrong Files

**Symptom:** Coverage includes node_modules or test files.

**Solution:** Check exclusion patterns in vitest.config.ts:

```typescript
coverage: {
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/__tests__/**',
    '**/*.test.ts',
  ],
}
```

## Type Errors in Tests

### Mock Type Mismatches

**Symptom:** TypeScript errors when mocking complex types.

**Solution:** Use `as` casts or `vi.mocked()`:

```typescript
// Option 1: Type assertion
await app.register(sessionMiddleware, {
  sessionService: mockSessionService as SessionServiceLike,
});

// Option 2: Infer from mock
import { verify } from "@node-rs/argon2";
vi.mocked(verify).mockResolvedValue(true);
```

### FastifyInstance Type Missing

**Symptom:** `app.requireAuth` or custom decorators not recognized.

**Solution:** Import types for decorators:

```typescript
import type { FastifyInstance } from "fastify";

// If needed, extend the type locally
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

## Quick Debugging Tips

### Run Single Test

```bash
# Run specific test file
pnpm test -- auth.routes.test.ts

# Run tests matching pattern
pnpm test -- -t "should register new user"
```

### Verbose Output

```bash
pnpm test -- --reporter=verbose
```

### Debug Mode

Add `console.log` in test or use debugger:

```typescript
it("should work", async () => {
  const response = await app.inject({ ... });
  console.log("Response:", response.json());  // Debug output
  console.log("Status:", response.statusCode);
  expect(response.statusCode).toBe(200);
});
```

### Check Mock Calls

```typescript
it("should call the right method", async () => {
  await service.doSomething();

  console.log("Mock calls:", mockDb.query.users.findFirst.mock.calls);

  expect(mockDb.query.users.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ ... })
  );
});
```

## Related Pages

- [Mocking Patterns](/testing/patterns/mocking) — vi.mock and vi.hoisted
- [Fastify Plugin Encapsulation](/testing/patterns/fastify-plugin-encapsulation) — Plugin issues
- [Fastify Testing](/testing/patterns/fastify-testing) — app.inject() usage
- [Test Structure](/testing/concepts/test-structure) — AAA pattern
- [Testing Overview](/testing/) — All testing patterns

## References

**Key Files:**
- [auth.routes.test.ts](https://github.com/ryandt33/raptscallions/blob/main/apps/api/src/__tests__/integration/auth.routes.test.ts) — Integration test patterns
- [vitest.config.ts](https://github.com/ryandt33/raptscallions/blob/main/vitest.config.ts) — Coverage configuration

**External Resources:**
- [Vitest Debugging Guide](https://vitest.dev/guide/debugging.html)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

**Implements:** E02-T008 (Auth integration tests)
