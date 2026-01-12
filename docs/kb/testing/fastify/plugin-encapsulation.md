# Fastify Plugin Encapsulation and Testing

## Problem

When testing Fastify applications with Vitest, hooks registered in plugins (like `onRequest`) may not apply to routes registered in separate plugins or test files. This causes tests to fail because middleware doesn't run.

**Symptoms:**
- Session middleware initializes but `onRequest` hook never fires
- `request.user` and `request.session` are always `null`/`undefined`
- Authentication guards return 401 even with valid mock session data

## Root Cause

Fastify uses **encapsulation** by default. Hooks, decorators, and plugins are scoped to their registration context. A plugin's hooks only apply to routes registered within that same plugin scope.

```typescript
// This hook ONLY applies to routes registered in this plugin
const myPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => {
    // This won't run for routes in other plugins!
  });
};
```

## Solution

Wrap plugins with `fastify-plugin` (fp) to skip encapsulation and make hooks/decorators available globally:

```typescript
import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

const sessionMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    // Now applies to ALL routes
  });
};

// Export wrapped with fastify-plugin
export const sessionMiddleware = fp(sessionMiddlewarePlugin, {
  name: "sessionMiddleware",
});
```

## Dependency Injection for Testing

For better testability, add dependency injection support to middleware:

```typescript
export interface SessionServiceLike {
  sessionCookieName: string;
  validate: (sessionId: string) => Promise<SessionValidationResult>;
  createBlankSessionCookie: () => { name: string; value: string; attributes: Record<string, unknown> };
}

export interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike;
}

const sessionMiddlewarePlugin: FastifyPluginAsync<SessionMiddlewareOptions> = async (app, opts = {}) => {
  // Use injected service or default
  const sessionService = opts.sessionService ?? defaultSessionService;

  app.addHook("onRequest", async (request, reply) => {
    // Use sessionService...
  });
};
```

In tests, inject mocks directly:

```typescript
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
  sessionService: mockSessionService as any,
});
```

## Why vi.mock() Often Fails

Vitest's `vi.mock()` with `vi.hoisted()` can fail for Fastify integration tests because:

1. **Module resolution aliases** in `vitest.config.ts` point to source files
2. Source files create **singletons** at module load time
3. The singleton is created before mocks are applied
4. `app.inject()` runs in the same process, using the already-instantiated singleton

Dependency injection bypasses this entirely by passing mocks at runtime.

## Test Pattern for Auth Guards

```typescript
describe("Authentication Guards", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const fastify = await import("fastify");
    const cookie = await import("@fastify/cookie");
    const { sessionMiddleware } = await import("../../middleware/session.middleware.js");
    const { authMiddleware } = await import("../../middleware/auth.middleware.js");

    app = fastify.default({ logger: false });

    await app.register(cookie.default);

    // Inject mock session service
    await app.register(sessionMiddleware, {
      sessionService: mockSessionService as any,
    });

    await app.register(authMiddleware);

    // Register test routes
    await app.register(async (testRoutes) => {
      testRoutes.get("/test/protected", {
        preHandler: [app.requireAuth],
      }, async () => ({ message: "protected" }));
    });

    await app.ready();
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
```

## Resources

- [Fastify Plugins Documentation](https://fastify.dev/docs/latest/Reference/Plugins/)
- [fastify-plugin on npm](https://www.npmjs.com/package/fastify-plugin)
- [Fastify Encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/)
- [Fastify Testing with app.inject()](https://fastify.dev/docs/latest/Guides/Testing/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

## Related Issues in This Codebase

- **Task E02-T008**: Rate limiting tests initially failed due to this encapsulation issue
- **File**: `apps/api/src/middleware/session.middleware.ts` - Updated to use `fastify-plugin`
- **Tests**: `apps/api/src/__tests__/integration/auth.guards.test.ts` - Uses DI pattern
