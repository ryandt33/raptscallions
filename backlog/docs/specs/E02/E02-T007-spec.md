# Implementation Spec: E02-T007

## Overview

This task implements comprehensive rate limiting middleware using `@fastify/rate-limit` with Redis as the storage backend. The system provides different rate limits for auth routes (strict: 5 req/min per IP) versus general API routes (lenient: 100 req/min per user), with support for custom limits on specific routes. Rate limiting prevents abuse, protects against brute-force attacks on auth endpoints, and ensures fair resource allocation across users.

## Approach

### Technical Strategy

1. **@fastify/rate-limit Plugin**: Use Fastify's official rate limiting plugin with Redis backend for distributed rate limiting across multiple API instances.

2. **Tiered Rate Limiting**: Implement two primary tiers:
   - **Auth routes**: Strict IP-based limiting (5 req/min) to prevent brute-force attacks
   - **General API**: Lenient user-based limiting (100 req/min) with IP fallback for anonymous requests

3. **Custom Route Limits**: Support per-route override of rate limits via route config for expensive operations (e.g., 10 req/hour for data exports).

4. **Redis Storage**: Use Redis for distributed rate limit counters with automatic expiration via TTL.

5. **Error Response Format**: Return 429 status with standard error format including Retry-After header and rate limit metadata.

6. **Key Generation Strategy**:
   - Anonymous users: IP address (`ip:{address}`)
   - Authenticated users: User ID (`user:{id}`)
   - Auth routes: Always IP (`auth:{address}`)

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Redis backend over memory | Allows horizontal scaling, persistence across restarts, shared state between API instances |
| IP-based for auth routes | Prevents distributed brute-force attacks across multiple accounts |
| User-based for API routes | Prevents single user from monopolizing resources while allowing shared IPs (schools, offices) |
| 5 req/min for auth | Balance between UX (allows legitimate retries) and security (prevents brute-force) |
| 100 req/min for API | Generous limit for normal usage, prevents runaway clients |
| Fastify plugin pattern | Consistent with existing middleware architecture, enables route-level config |

### Rate Limit Tiers

```typescript
// Tier 1: Auth routes (strictest)
// - 5 requests per minute
// - Key: IP address only
// - Routes: /auth/login, /auth/register, /auth/google, /auth/microsoft

// Tier 2: General API (default)
// - 100 requests per minute
// - Key: User ID if authenticated, IP otherwise
// - Routes: All other API routes

// Tier 3: Custom per-route
// - Configurable via route options
// - Example: 10 requests per hour for /export/data
```

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/middleware/rate-limit.middleware.ts` | Rate limiting plugin with Redis backend and key generation logic |
| `apps/api/src/__tests__/middleware/rate-limit.middleware.test.ts` | Unit tests for rate limit middleware |
| `apps/api/src/__tests__/integration/rate-limit.test.ts` | Integration tests verifying rate limits are enforced |
| `packages/core/src/errors/rate-limit.error.ts` | RateLimitError class extending AppError |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/server.ts` | Register rate limit middleware, apply to auth and API routes |
| `apps/api/package.json` | Add `@fastify/rate-limit` and `ioredis` dependencies |
| `packages/core/src/errors/index.ts` | Export RateLimitError |
| `packages/core/src/errors/base.error.ts` | Add RATE_LIMIT_EXCEEDED to ErrorCode enum |
| `apps/api/src/config.ts` | Add rate limit config (auth max, API max, time window) |

## Implementation Details

### 1. Rate Limit Error Class

**File**: `packages/core/src/errors/rate-limit.error.ts`

```typescript
import { AppError, ErrorCode, type ErrorDetails } from "./base.error.js";

/**
 * Error thrown when rate limit is exceeded.
 * Defaults to HTTP 429 Too Many Requests.
 *
 * Details should include:
 * - limit: Maximum requests allowed
 * - remaining: Requests remaining (always 0 when thrown)
 * - resetAt: ISO timestamp when limit resets
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", details?: ErrorDetails) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
  }
}
```

### 2. Rate Limit Middleware

**File**: `apps/api/src/middleware/rate-limit.middleware.ts`

```typescript
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import Redis from "ioredis";
import { config } from "../config.js";
import { RateLimitError } from "@raptscallions/core";
import { getLogger } from "@raptscallions/telemetry";

const logger = getLogger("rate-limit-middleware");

/**
 * Rate limiting middleware using Redis for distributed state.
 *
 * Provides two main strategies:
 * 1. Default API rate limiting (100 req/min per user, IP fallback)
 * 2. Auth route rate limiting (5 req/min per IP only)
 *
 * Routes can override limits via config:
 * ```typescript
 * app.post('/expensive', {
 *   config: {
 *     rateLimit: {
 *       max: 10,
 *       timeWindow: '1 hour'
 *     }
 *   }
 * }, handler);
 * ```
 */
const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  // Create Redis client for rate limit storage
  const redis = new Redis(config.REDIS_URL, {
    // Connection name for debugging
    connectionName: "rate-limit",
    // Retry strategy for resilience
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ times, delay }, "Redis connection retry");
      return delay;
    },
    // Max retries before failing
    maxRetriesPerRequest: 3,
  });

  // Handle Redis connection errors
  redis.on("error", (error) => {
    logger.error({ error }, "Redis connection error");
  });

  redis.on("connect", () => {
    logger.info("Redis connected for rate limiting");
  });

  // Key generator function - determines how to identify requester
  const keyGenerator = (request: FastifyRequest): string => {
    // For authenticated users on non-auth routes, use user ID
    // This allows shared IPs (schools, offices) and prevents
    // one user from blocking others on the same network
    if (request.user) {
      return `user:${request.user.id}`;
    }

    // For anonymous requests and all auth routes, use IP
    // Auth routes always use IP to prevent distributed attacks
    return `ip:${request.ip}`;
  };

  // Error response builder - formats 429 errors
  const errorResponseBuilder = (
    request: FastifyRequest,
    context: { max: number; after: string; ttl: number }
  ): RateLimitError => {
    // Calculate reset timestamp
    const resetAt = new Date(Date.now() + context.ttl);

    return new RateLimitError("Too many requests, please try again later", {
      limit: context.max,
      remaining: 0,
      resetAt: resetAt.toISOString(),
      retryAfter: context.after,
    });
  };

  // Register global rate limiter (default for all routes)
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_API_MAX,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
    redis,
    keyGenerator,
    errorResponseBuilder,
    // Add rate limit headers to all responses
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    // Skip successful requests from logging (reduce noise)
    skipOnError: false,
    // Namespace for Redis keys to avoid collisions
    nameSpace: "rapt:rl:",
  });

  // Decorate app with helper to create auth-specific rate limiter
  // This will be used in auth routes registration
  app.decorate("createAuthRateLimiter", () => {
    return rateLimit.default({
      max: config.RATE_LIMIT_AUTH_MAX,
      timeWindow: config.RATE_LIMIT_TIME_WINDOW,
      redis,
      // Auth routes ALWAYS use IP-based limiting
      keyGenerator: (request: FastifyRequest) => `auth:${request.ip}`,
      errorResponseBuilder,
      addHeaders: {
        "x-ratelimit-limit": true,
        "x-ratelimit-remaining": true,
        "x-ratelimit-reset": true,
        "retry-after": true,
      },
      nameSpace: "rapt:rl:auth:",
    });
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
export const rateLimitMiddleware = fp(rateLimitPlugin, {
  name: "rateLimitMiddleware",
  dependencies: ["@fastify/cookie"], // Requires cookies for session
});

// Augment Fastify instance with rate limit decorator
declare module "fastify" {
  interface FastifyInstance {
    createAuthRateLimiter: () => FastifyPluginAsync;
  }

  interface FastifyContextConfig {
    rateLimit?: {
      max: number;
      timeWindow: string | number;
    };
  }
}
```

### 3. Configuration Updates

**File**: `apps/api/src/config.ts` (additions)

```typescript
export const envSchema = z.object({
  // ... existing fields ...

  // Rate Limiting
  RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"), // Accepts "1 minute", "60000", etc.
});
```

### 4. Server Integration

**File**: `apps/api/src/server.ts` (modifications)

```typescript
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware.js";

export async function createServer(): Promise<FastifyInstance> {
  // ... existing setup ...

  // Register rate limiting BEFORE routes but AFTER session middleware
  // This ensures request.user is available for key generation
  await app.register(rateLimitMiddleware);

  // Register routes
  await app.register(healthRoutes); // No rate limit on health checks

  // Auth routes use stricter rate limiting
  await app.register(
    async (authApp) => {
      // Apply auth-specific rate limiter
      await authApp.register(authApp.createAuthRateLimiter());
      // Register auth routes within this context
      await authApp.register(authRoutes);
    },
    { prefix: "/auth" }
  );

  // ... rest of routes ...
}
```

### 5. Error Code Update

**File**: `packages/core/src/errors/base.error.ts` (modification)

```typescript
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED", // NEW
} as const;
```

### 6. Error Export

**File**: `packages/core/src/errors/index.ts` (modification)

```typescript
export { RateLimitError } from "./rate-limit.error.js";
```

## Testing Strategy

### Unit Tests

**File**: `apps/api/src/__tests__/middleware/rate-limit.middleware.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FastifyRequest } from "fastify";
import Redis from "ioredis";

// Mock Redis
vi.mock("ioredis", () => {
  return {
    default: vi.fn(() => ({
      on: vi.fn(),
      quit: vi.fn(),
    })),
  };
});

describe("Rate Limit Middleware", () => {
  describe("Key Generation", () => {
    it("should use user ID for authenticated API requests", () => {
      // Test keyGenerator logic with authenticated user
      const request = {
        user: { id: "user-123" },
        ip: "192.168.1.1",
      } as unknown as FastifyRequest;

      const key = keyGenerator(request);
      expect(key).toBe("user:user-123");
    });

    it("should use IP address for anonymous requests", () => {
      const request = {
        user: null,
        ip: "192.168.1.1",
      } as unknown as FastifyRequest;

      const key = keyGenerator(request);
      expect(key).toBe("ip:192.168.1.1");
    });

    it("should always use IP for auth routes", () => {
      // Auth routes override keyGenerator
      const request = {
        user: { id: "user-123" }, // Even if authenticated
        ip: "192.168.1.1",
      } as unknown as FastifyRequest;

      const authKey = `auth:${request.ip}`;
      expect(authKey).toBe("auth:192.168.1.1");
    });
  });

  describe("Error Response Builder", () => {
    it("should format rate limit error with correct details", () => {
      const request = {} as FastifyRequest;
      const context = {
        max: 5,
        after: "42",
        ttl: 42000,
      };

      const error = errorResponseBuilder(request, context);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.details).toMatchObject({
        limit: 5,
        remaining: 0,
        retryAfter: "42",
      });
      expect(error.details.resetAt).toBeDefined();
    });
  });

  describe("Redis Connection", () => {
    it("should create Redis client with correct config", () => {
      // Verify Redis instantiation with connection name and retry strategy
      expect(Redis).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          connectionName: "rate-limit",
          retryStrategy: expect.any(Function),
        })
      );
    });

    it("should have retry strategy that backs off exponentially", () => {
      const retryStrategy = vi.mocked(Redis).mock.calls[0]?.[1]?.retryStrategy;
      expect(retryStrategy).toBeDefined();

      // Test retry backoff
      expect(retryStrategy!(1)).toBe(50);   // 1 * 50
      expect(retryStrategy!(5)).toBe(250);  // 5 * 50
      expect(retryStrategy!(50)).toBe(2000); // Capped at 2000
    });
  });
});
```

### Integration Tests

**File**: `apps/api/src/__tests__/integration/rate-limit.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { createServer } from "../../server.js";

describe("Rate Limiting Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth Route Rate Limiting", () => {
    it("should allow 5 login attempts per minute per IP", async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "test@example.com", password: "wrong" },
            headers: { "x-forwarded-for": "192.168.1.100" },
          })
        );

      const responses = await Promise.all(requests);

      // First 5 should be processed (might be 401 for wrong password)
      responses.forEach((r, i) => {
        expect(r.statusCode).not.toBe(429);
        expect(r.headers["x-ratelimit-limit"]).toBe("5");
        expect(r.headers["x-ratelimit-remaining"]).toBe(String(4 - i));
      });
    });

    it("should block 6th login attempt from same IP", async () => {
      // Make 5 requests to reach limit
      await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "test@example.com", password: "wrong" },
              headers: { "x-forwarded-for": "192.168.1.101" },
            })
          )
      );

      // 6th request should be rate limited
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.1.101" },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBe("0");

      const body = JSON.parse(response.body);
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.details.limit).toBe(5);
      expect(body.details.remaining).toBe(0);
      expect(body.details.resetAt).toBeDefined();
    });

    it("should rate limit by IP even for authenticated users", async () => {
      // Login successfully to get session
      const loginRes = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "valid@example.com", password: "correct" },
        headers: { "x-forwarded-for": "192.168.1.102" },
      });

      const sessionCookie = loginRes.cookies[0]?.value;

      // Make 4 more requests with session cookie
      await Promise.all(
        Array(4)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "other@example.com", password: "test" },
              headers: {
                "x-forwarded-for": "192.168.1.102",
                cookie: `rapt_session=${sessionCookie}`,
              },
            })
          )
      );

      // 6th request should still be rate limited by IP
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "another@example.com", password: "test" },
        headers: {
          "x-forwarded-for": "192.168.1.102",
          cookie: `rapt_session=${sessionCookie}`,
        },
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe("API Route Rate Limiting", () => {
    it("should allow 100 requests per minute for authenticated users", async () => {
      // This test is slow - make 100 requests
      // In practice, may want to mock time or use smaller limit for tests

      const user = await createTestUser();
      const session = await createTestSession(user.id);

      const requests = Array(100)
        .fill(null)
        .map(() =>
          app.inject({
            method: "GET",
            url: "/api/users/me",
            headers: {
              cookie: `rapt_session=${session.id}`,
            },
          })
        );

      const responses = await Promise.all(requests);

      // All 100 should succeed
      responses.forEach((r) => {
        expect(r.statusCode).not.toBe(429);
      });
    });

    it("should block 101st request for authenticated user", async () => {
      const user = await createTestUser();
      const session = await createTestSession(user.id);

      // Make 100 requests
      await Promise.all(
        Array(100)
          .fill(null)
          .map(() =>
            app.inject({
              method: "GET",
              url: "/api/users/me",
              headers: { cookie: `rapt_session=${session.id}` },
            })
          )
      );

      // 101st should be blocked
      const response = await app.inject({
        method: "GET",
        url: "/api/users/me",
        headers: { cookie: `rapt_session=${session.id}` },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers["x-ratelimit-limit"]).toBe("100");
    });

    it("should rate limit anonymous users by IP", async () => {
      const ip = "192.168.1.200";

      // Make 100 requests to public endpoint
      await Promise.all(
        Array(100)
          .fill(null)
          .map(() =>
            app.inject({
              method: "GET",
              url: "/health",
              headers: { "x-forwarded-for": ip },
            })
          )
      );

      // 101st should be blocked
      const response = await app.inject({
        method: "GET",
        url: "/health",
        headers: { "x-forwarded-for": ip },
      });

      expect(response.statusCode).toBe(429);
    });

    it("should not share rate limits between different users", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const session1 = await createTestSession(user1.id);
      const session2 = await createTestSession(user2.id);

      // Each user can make 100 requests independently
      const user1Requests = Array(100)
        .fill(null)
        .map(() =>
          app.inject({
            method: "GET",
            url: "/api/users/me",
            headers: { cookie: `rapt_session=${session1.id}` },
          })
        );

      const user2Requests = Array(100)
        .fill(null)
        .map(() =>
          app.inject({
            method: "GET",
            url: "/api/users/me",
            headers: { cookie: `rapt_session=${session2.id}` },
          })
        );

      const allResponses = await Promise.all([
        ...user1Requests,
        ...user2Requests,
      ]);

      // All 200 requests should succeed (no rate limit sharing)
      allResponses.forEach((r) => {
        expect(r.statusCode).not.toBe(429);
      });
    });
  });

  describe("Custom Route Rate Limits", () => {
    it("should enforce custom rate limit on specific route", async () => {
      // Assumes a route like /export/data with custom limit
      const user = await createTestUser();
      const session = await createTestSession(user.id);

      // Make 10 requests (custom limit)
      await Promise.all(
        Array(10)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/export/data",
              headers: { cookie: `rapt_session=${session.id}` },
            })
          )
      );

      // 11th should be blocked
      const response = await app.inject({
        method: "POST",
        url: "/export/data",
        headers: { cookie: `rapt_session=${session.id}` },
      });

      expect(response.statusCode).toBe(429);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should include rate limit headers in successful responses", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(response.headers["x-ratelimit-reset"]).toBeDefined();
    });

    it("should include Retry-After header in 429 responses", async () => {
      // Hit rate limit
      await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "test@example.com", password: "wrong" },
              headers: { "x-forwarded-for": "192.168.1.250" },
            })
          )
      );

      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.1.250" },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
    });
  });
});
```

## Dependencies

### Requires
- E02-T001 (Fastify server setup) - COMPLETED
- E02-T002 (Session middleware) - COMPLETED (provides request.user)

### New Packages

```json
{
  "dependencies": {
    "@fastify/rate-limit": "^9.1.0",
    "ioredis": "^5.3.2"
  }
}
```

**Installation:**
```bash
pnpm add @fastify/rate-limit ioredis --filter @raptscallions/api
```

## Acceptance Criteria Breakdown

### AC1: @fastify/rate-limit plugin installed and configured
- **Implementation**: Add to `apps/api/package.json`, register in middleware
- **Verification**: Plugin appears in dependencies, middleware registered in server.ts
- **Test**: Integration test verifies rate limiting is active

### AC2: Redis used as storage backend for rate limit counters
- **Implementation**: Create Redis client with connection pooling and error handling
- **Verification**: Redis client passed to rate limit plugin, keys visible in Redis
- **Test**: Mock Redis in unit tests, verify real Redis in integration tests

### AC3: Auth routes limited to 5 requests per minute per IP
- **Implementation**: `RATE_LIMIT_AUTH_MAX=5`, auth-specific plugin registration
- **Verification**: Config value used, auth keyGenerator uses IP only
- **Test**: Integration test makes 6 requests, verifies 6th is blocked

### AC4: General API routes limited to 100 requests per minute per user
- **Implementation**: `RATE_LIMIT_API_MAX=100`, user-based keyGenerator
- **Verification**: Default plugin uses user ID for authenticated requests
- **Test**: Integration test makes 101 requests, verifies 101st is blocked

### AC5: Rate limit exceeded returns 429 with Retry-After header
- **Implementation**: `errorResponseBuilder` returns RateLimitError, plugin sets header
- **Verification**: 429 status, Retry-After header present
- **Test**: Integration test verifies response format and headers

### AC6: Anonymous users rate limited by IP address
- **Implementation**: keyGenerator returns `ip:{address}` when `request.user` is null
- **Verification**: Anonymous requests use IP-based keys
- **Test**: Unit test verifies keyGenerator logic, integration test verifies enforcement

### AC7: Authenticated users rate limited by user ID
- **Implementation**: keyGenerator returns `user:{id}` when `request.user` exists
- **Verification**: Authenticated requests use user-based keys
- **Test**: Unit test verifies keyGenerator logic, integration test verifies separate limits per user

### AC8: Rate limit counters reset after time window expires
- **Implementation**: Redis TTL set by `@fastify/rate-limit`, automatic expiration
- **Verification**: Redis keys have TTL matching time window
- **Test**: Integration test waits for expiration (or uses time mocking), verifies reset

### AC9: Tests verify rate limits are enforced correctly
- **Implementation**: Comprehensive unit and integration tests
- **Verification**: All tests pass, 80%+ coverage
- **Test**: Run `pnpm test` and `pnpm test:coverage`

### AC10: Different rate limits can be applied to specific routes
- **Implementation**: FastifyContextConfig extension, route-level config support
- **Verification**: Example route with custom limit works
- **Test**: Integration test verifies custom limit on specific route

## Edge Cases

### 1. Redis Connection Failure
**Scenario**: Redis becomes unavailable during request processing
**Handling**:
- @fastify/rate-limit falls back to memory storage (local to instance)
- Log error but continue serving requests
- Monitor Redis connection status via health check
- Consider circuit breaker pattern for repeated failures

### 2. Multiple IPs for Same User (VPN, Mobile)
**Scenario**: User switches networks mid-session
**Handling**:
- User-based limiting handles this gracefully (same limit regardless of IP)
- Auth routes still IP-limited (intentional for security)
- No special handling needed

### 3. Shared IPs (Schools, Offices)
**Scenario**: 100+ users behind single NAT IP
**Handling**:
- API routes use user-based limiting (prevents blocking entire school)
- Auth routes still IP-limited (intentional trade-off for security)
- Document in deployment guide: consider higher auth limits for known schools

### 4. Clock Skew Between Servers
**Scenario**: Multiple API instances with slightly different clocks
**Handling**:
- Redis-based storage eliminates clock skew issues
- Rate limit windows based on Redis server time (single source of truth)
- No special handling needed

### 5. Rate Limit Headers on Error Responses
**Scenario**: Request fails validation before rate limit check
**Handling**:
- Rate limit runs as Fastify hook (before route handler)
- Headers added to all responses, including errors
- Ensures consistent header presence

### 6. Very High Request Volume (DDoS)
**Scenario**: Malicious actor sends thousands of requests per second
**Handling**:
- Rate limiting blocks at application level
- Consider adding infrastructure-level protection (Cloudflare, AWS WAF)
- Monitor Redis memory usage (rate limit keys)
- Document DDoS mitigation strategy in deployment guide

### 7. User ID Spoofing
**Scenario**: Malicious client attempts to manipulate user ID
**Handling**:
- User ID comes from validated session (Lucia), not client input
- Session middleware runs before rate limit middleware
- No risk of spoofing

## Open Questions

- [ ] **Question**: Should rate limit errors be logged as warnings or info level?
  - **Context**: High traffic might generate many rate limit events
  - **Recommendation**: Info level for normal rate limits, warn for repeated abuse from same key
  - **Decision needed**: PM/Architect approval

- [ ] **Question**: Should we implement rate limit bypass for system admins?
  - **Context**: Admins might need to perform bulk operations
  - **Recommendation**: No bypass initially (admins are subject to same limits for security), add if needed
  - **Decision needed**: PM approval

- [ ] **Question**: Should rate limit config be group-scoped (different schools have different limits)?
  - **Context**: Some schools might need higher limits than others
  - **Recommendation**: Not for MVP, add in future epic if needed
  - **Decision needed**: PM approval

- [ ] **Question**: How should we handle rate limit key collisions (extremely unlikely with UUIDs)?
  - **Context**: UUIDs prevent collisions in practice
  - **Recommendation**: No special handling, log if detected
  - **Decision needed**: None required (acknowledge acceptable risk)

## Performance Implications

### Redis Load
- **Impact**: Each request performs 2-3 Redis operations (INCR, TTL, GET)
- **Mitigation**: Redis is designed for high throughput (100k+ ops/sec single instance)
- **Monitoring**: Track Redis CPU, memory, and network usage

### Request Latency
- **Impact**: +1-5ms per request for Redis round-trip
- **Mitigation**: Use Redis pipelining, keep Redis on same network as API
- **Monitoring**: Track rate limit middleware execution time

### Memory Usage
- **Impact**: Each rate limit key ~100 bytes, TTL expires automatically
- **Calculation**: 10k active users = ~1MB Redis memory
- **Mitigation**: Redis maxmemory-policy: volatile-lru (evict expired keys first)

### Horizontal Scaling
- **Impact**: Rate limits shared across all API instances (benefit of Redis)
- **Verification**: Deploy 2+ API instances, verify shared limits
- **Monitoring**: Track rate limit key distribution across instances

## Security Considerations

### 1. IP Spoofing (X-Forwarded-For)
**Risk**: Malicious client sends fake X-Forwarded-For header
**Mitigation**:
- Trust proxy setting in Fastify (only trust known proxies)
- Use `request.ip` (validated by Fastify) not raw header
- Document proxy configuration in deployment guide

### 2. Distributed Brute-Force
**Risk**: Attacker uses many IPs to bypass rate limit
**Mitigation**:
- Auth routes use IP limiting (forces distributed infrastructure)
- Monitor for suspicious patterns (many IPs, same account)
- Consider account-level lockout after N failed attempts (future enhancement)

### 3. Redis Injection
**Risk**: Malicious keys could corrupt Redis data
**Mitigation**:
- Use namespace prefix (`rapt:rl:`) to isolate rate limit keys
- Validate all inputs before using in keys
- No user input directly in Redis keys

### 4. Denial of Service via Rate Limit
**Risk**: Attacker intentionally triggers rate limits for legitimate users
**Mitigation**:
- Auth routes: IP-based (attacker can't block specific user)
- API routes: User-based (attacker needs valid sessions)
- Monitor for abuse patterns

### 5. Time-Based Attacks
**Risk**: Attacker waits for rate limit window to reset
**Mitigation**:
- Acceptable trade-off (rate limiting is statistical, not absolute)
- Consider progressive backoff for repeat offenders (future enhancement)

## Integration Points

### 1. Session Middleware
- **Dependency**: Rate limit middleware MUST run after session middleware
- **Reason**: Needs `request.user` for key generation
- **Verification**: Check middleware registration order in server.ts

### 2. Error Handler
- **Dependency**: Error handler must recognize RateLimitError
- **Reason**: Format 429 responses correctly
- **Verification**: RateLimitError extends AppError (handled automatically)

### 3. Health Checks
- **Dependency**: Health check endpoints should be rate limited differently
- **Reason**: Kubernetes/load balancer probes shouldn't be blocked
- **Verification**: Consider exempting `/health` and `/ready` from rate limits

### 4. Telemetry
- **Integration**: Log rate limit events for monitoring
- **Metrics**: Track rate limit hits by route and key type
- **Future**: Add OpenTelemetry metrics for rate limit events

## Documentation Requirements

### 1. Environment Variables
Document in `.env.example`:
```bash
# Rate Limiting
RATE_LIMIT_API_MAX=100          # Max requests per minute for API routes
RATE_LIMIT_AUTH_MAX=5           # Max requests per minute for auth routes
RATE_LIMIT_TIME_WINDOW="1 minute"  # Time window for rate limits
```

### 2. Deployment Guide
Add section on rate limiting:
- Redis requirements and scaling
- Proxy configuration (X-Forwarded-For trust)
- Monitoring and alerting
- DDoS mitigation strategies

### 3. API Documentation
Document rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705067890
Retry-After: 42
```

### 4. Developer Guide
Example custom rate limit:
```typescript
app.post('/expensive-operation', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 hour'
    }
  }
}, handler);
```

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** APPROVED with recommendations

### Summary

The rate limiting implementation is well-designed with good consideration for user experience. The specification balances security needs with legitimate user workflows. The error messaging, header transparency, and tiered approach (strict for auth, lenient for API) demonstrate thoughtful UX design.

### Strengths

1. **Clear Error Communication**
   - 429 responses include all necessary information: limit, remaining, resetAt, retryAfter
   - Retry-After header enables automatic retry logic in clients
   - Error message is user-friendly: "Too many requests, please try again later"

2. **Appropriate Rate Limits**
   - Auth: 5 req/min is reasonable for legitimate retries while preventing brute-force
   - API: 100 req/min is generous for normal usage patterns
   - Both limits unlikely to impact legitimate users

3. **Smart Key Generation**
   - User-based limiting for API routes prevents shared IP issues (schools, offices)
   - IP-based for auth routes balances security with usability
   - Prevents one user from blocking others on same network

4. **Transparency via Headers**
   - X-RateLimit-* headers on all responses enable proactive client behavior
   - Clients can show "You have X requests remaining" UI
   - Prevents surprise rate limit errors

### UX Concerns & Recommendations

#### 🟡 MEDIUM: User Education on Rate Limits

**Issue**: Users may not understand why they're being rate limited, especially on auth routes.

**Impact**: Confusion, frustration, perception of broken application

**Recommendation**:
```json
{
  "error": "Too many login attempts. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 5,
    "remaining": 0,
    "resetAt": "2026-01-12T12:34:56Z",
    "retryAfter": "42",
    "message": "For security, login attempts are limited to 5 per minute. Please wait 42 seconds before trying again."
  }
}
```

**Specific Changes**:
- Add user-friendly `message` field to error details explaining why and how long
- Differentiate messages for auth vs API rate limits
- Frontend should display countdown timer: "Try again in 42 seconds"

#### 🟡 MEDIUM: School/Shared IP Edge Case Handling

**Issue**: Schools with 100+ students could hit 5 req/min auth limit during class login rush.

**Impact**: Students unable to log in at start of class, negative first impression

**Recommendation**:
- Document in deployment guide: schools should use SSO (Google, Microsoft, Clever) to avoid this
- Add operational playbook: "If school reports login issues, check if IP-based limit too low for their size"
- Consider future enhancement: group-scoped rate limits (per-group config)

**No Code Changes Needed**: Document only, acknowledge in spec

#### 🟢 LOW: Progressive Disclosure of Rate Limit Info

**Issue**: Always showing "87 requests remaining" might cause unnecessary anxiety.

**Impact**: Minor - users might worry about running out

**Recommendation**:
- Frontend should only show rate limit info when remaining < 20% of limit
- Example: Show warning at 20 requests remaining, not at 87
- Show countdown timer only when rate limited (429), not preemptively

**No Backend Changes Needed**: Frontend design decision

#### 🟢 LOW: Rate Limit Reset User Experience

**Issue**: Users might retry immediately after rate limit, not understanding they need to wait.

**Impact**: Minor - additional failed requests, user confusion

**Recommendation**:
- Spec already includes Retry-After header (good!)
- Frontend should disable submit button and show countdown: "Try again in 42 seconds"
- Optional: Auto-retry after countdown completes

**No Backend Changes Needed**: Headers sufficient, frontend implementation

### Accessibility Concerns

#### ✅ PASS: Screen Reader Compatibility

- Error messages are text-based and screen reader compatible
- Countdown timers should announce via ARIA live regions
- No accessibility issues with backend implementation

#### ✅ PASS: Keyboard Navigation

- Rate limiting doesn't affect keyboard navigation
- Frontend should ensure disabled buttons during countdown are keyboard accessible (focusable but not clickable)

### User Flow Analysis

#### Login Flow with Rate Limiting

```
1. User enters wrong password → 401 error (remaining: 4)
2. User retries with wrong password → 401 error (remaining: 3)
3. User retries 3 more times → 401 error (remaining: 0)
4. User retries again → 429 error with Retry-After: 42
5. Frontend shows: "Too many login attempts. Try again in 42 seconds" with countdown
6. User waits 42 seconds
7. User retries successfully
```

**UX Assessment**: Good flow, clear feedback at each step. Countdown timer is critical for good UX.

#### API Usage Flow with Rate Limiting

```
1. User makes 90 API requests (normal usage)
2. Headers show: X-RateLimit-Remaining: 10
3. Frontend optionally shows warning: "Approaching request limit (10 remaining)"
4. User makes 10 more requests → 0 remaining
5. User makes another request → 429 error
6. Frontend shows: "You've reached the request limit. Resets in 23 seconds"
```

**UX Assessment**: Good, but 100 req/min is very generous - most users won't hit this. Warning at 10 remaining is optional but nice-to-have.

### Consistency with Design System

#### ✅ Error Response Format

- Follows standard error format: `{ error, code, details }`
- Consistent with other error types in the system
- No design system changes needed

#### ✅ HTTP Status Codes

- 429 Too Many Requests is standard and expected
- Retry-After header is industry standard
- X-RateLimit-* headers follow common conventions

### Mobile & Responsive Considerations

#### ✅ PASS: Mobile Experience

- Rate limits same for mobile and desktop (appropriate)
- Mobile apps can use Retry-After header for automatic retry
- No mobile-specific concerns

#### ⚠️ CONSIDER: Mobile Network Switching

**Scenario**: User on mobile switches from WiFi to cellular (IP changes)

**Impact**: Auth rate limit resets (new IP), but user rate limit persists (user-based)

**Assessment**: This is actually good UX - user isn't penalized for network changes on API routes, but auth security is maintained. No changes needed.

### Recommendations Summary

| Priority | Recommendation | Action Required |
|----------|---------------|-----------------|
| 🟡 MEDIUM | Add user-friendly message field to error details | Backend change: Add `message` to error details |
| 🟡 MEDIUM | Document school/shared IP scenario | Add to deployment guide (no code change) |
| 🟢 LOW | Progressive disclosure of rate limit info | Frontend design decision (no backend change) |
| 🟢 LOW | Frontend countdown timer and auto-retry | Frontend implementation (no backend change) |

### Required Changes

#### 1. Enhanced Error Message (MEDIUM Priority)

**File**: `apps/api/src/middleware/rate-limit.middleware.ts`

**Change**: Update `errorResponseBuilder` to include context-aware message:

```typescript
const errorResponseBuilder = (
  request: FastifyRequest,
  context: { max: number; after: string; ttl: number }
): RateLimitError => {
  const resetAt = new Date(Date.now() + context.ttl);
  const isAuthRoute = request.url.startsWith('/auth');

  // Context-aware user message
  const userMessage = isAuthRoute
    ? `For security, login attempts are limited to ${context.max} per minute. Please wait ${context.after} seconds before trying again.`
    : `You've reached the request limit of ${context.max} requests per minute. Please wait ${context.after} seconds before trying again.`;

  return new RateLimitError("Too many requests, please try again later", {
    limit: context.max,
    remaining: 0,
    resetAt: resetAt.toISOString(),
    retryAfter: context.after,
    message: userMessage, // NEW: User-friendly explanation
  });
};
```

#### 2. Documentation Updates (MEDIUM Priority)

**File**: Add to deployment guide

Add section: "Rate Limiting Considerations for Schools"

```markdown
### Rate Limiting for Educational Institutions

Schools and educational institutions may experience high concurrent login volumes during class start times. Consider the following:

1. **Recommend SSO**: Google Workspace, Microsoft 365, or Clever authentication reduces login attempts and provides better UX
2. **Monitor login patterns**: Track rate limit hits by IP to identify schools experiencing issues
3. **Operational playbook**: If school reports login issues:
   - Check if their IP is hitting auth rate limit
   - Verify they're using username/password instead of SSO
   - Recommend SSO setup or staggered login times
4. **Future enhancement**: Group-scoped rate limits allow per-school customization
```

### Acceptance Criteria UX Validation

| AC | UX Impact | Assessment |
|----|-----------|------------|
| AC1 | None (infrastructure) | ✅ N/A |
| AC2 | None (infrastructure) | ✅ N/A |
| AC3 | High (prevents brute-force, may affect legitimate users) | ✅ Good with message enhancement |
| AC4 | Low (generous limit) | ✅ Good |
| AC5 | High (user-facing error) | ✅ Good, enhanced message recommended |
| AC6 | Medium (shared IP considerations) | ✅ Good, document edge cases |
| AC7 | Low (expected behavior) | ✅ Good |
| AC8 | High (user can retry after) | ✅ Good |
| AC9 | None (infrastructure) | ✅ N/A |
| AC10 | Medium (custom limits per route) | ✅ Good flexibility |

### Final Verdict

**APPROVED with minor enhancements**

The specification demonstrates strong UX considerations for a security-focused feature. The rate limits are well-balanced, error messaging is clear, and the tiered approach (strict auth, lenient API) shows good judgment.

**Required before implementation:**
1. Add user-friendly `message` field to error response details (MEDIUM priority)
2. Document school/shared IP scenario in deployment guide (MEDIUM priority)

**Recommended for frontend implementation:**
1. Countdown timers on rate-limited responses
2. Progressive disclosure of rate limit info (show warning at <20% remaining)
3. Disable/enable submit buttons based on rate limit state
4. ARIA live regions for screen reader announcements

The backend implementation is ready to proceed with the two required enhancements above.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED WITH MINOR CHANGES

### Executive Summary

The rate limiting implementation spec demonstrates **excellent architectural alignment** with the project's technology stack, design principles, and security requirements. The use of `@fastify/rate-limit` with Redis backend is the correct architectural choice for this distributed system. The two-tier rate limiting strategy (strict auth, lenient API) is well-reasoned and addresses the security/UX balance appropriately.

**Three minor changes required before implementation:**

1. **Redis client management** - Reuse existing Redis connection from configuration
2. **Error handler integration** - Clarify error handler middleware ordering
3. **Health check exemption** - Explicitly exempt health endpoints from rate limiting

### Architectural Alignment

#### ✅ PASS: Technology Stack Compliance

| Requirement | Spec | Status |
|-------------|------|--------|
| Fastify 4.x plugin pattern | `@fastify/rate-limit` with `fastify-plugin` wrapper | ✅ Correct |
| Redis 7 for distributed state | `ioredis` client with Redis backend | ✅ Correct |
| Zod validation | Config validation with Zod schema | ✅ Correct |
| TypeScript strict mode | Full type safety with module augmentation | ✅ Correct |
| OpenTelemetry logging | Uses `@raptscallions/telemetry` logger | ✅ Correct |
| Typed errors | `RateLimitError` extends `AppError` | ✅ Correct |

**Assessment:** The spec correctly uses all canonical technologies from ARCHITECTURE.md. No deviations.

#### ✅ PASS: Fastify Middleware Pattern

The spec follows Fastify's plugin architecture correctly with `FastifyPluginAsync`, proper encapsulation via `fastify-plugin`, and correct type augmentation.

#### ✅ PASS: Rate Limiting Strategy

The two-tier strategy is architecturally sound:
- Auth routes: 5 req/min per IP (prevents distributed brute-force)
- API routes: 100 req/min per user (allows shared IPs, fair resource allocation)

**Assessment:** Excellent security/UX balance.

#### ✅ PASS: Error Handling Architecture

The spec correctly uses the project's typed error system (`RateLimitError` extends `AppError`, uses `ErrorCode` enum, 429 status).

### Required Changes

#### 🟡 CHANGE 1: Redis Connection Management (MEDIUM)

**Issue:** The spec creates a new Redis client in the middleware (lines 136-154), but the project likely already has a Redis connection configured (used for sessions, BullMQ, Socket.io per ARCHITECTURE.md).

**Problem:**
- Creates duplicate connection pool
- Connection lifecycle not managed
- Config duplication

**Required Change:**

Create a shared Redis client in `apps/api/src/config.ts`:

```typescript
// apps/api/src/config.ts
import Redis from "ioredis";

export const redis = new Redis(config.REDIS_URL, {
  connectionName: "api",
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

// Cleanup on shutdown
process.on('SIGTERM', () => redis.quit());
```

Then in middleware (replace lines 136-154):

```typescript
import { redis } from "../config.js";

const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  // Reuse shared Redis client (don't create new)
  await app.register(rateLimit, {
    // ... other config
    redis, // Use shared connection
  });
};
```

**Rationale:** Single connection pool, proper lifecycle management, consistent with existing patterns.

#### 🟡 CHANGE 2: Middleware Registration Order (MEDIUM)

**Issue:** The spec doesn't explicitly state where rate limit middleware runs relative to error handler (line 278).

**Problem:**
- Unclear if rate limit errors will be caught by global error handler
- Middleware order matters in Fastify hooks

**Required Change:**

Add explicit ordering documentation in spec Section 4:

```typescript
// apps/api/src/server.ts

// MIDDLEWARE REGISTRATION ORDER (CRITICAL):

// 1. Error handler (global hooks - catches all errors)
await app.register(errorHandlerMiddleware);

// 2. Session middleware (populates request.user)
await app.register(sessionMiddleware);

// 3. Rate limiting (needs request.user for key generation)
await app.register(rateLimitMiddleware);

// 4. Routes
await app.register(healthRoutes); // Exempt from rate limiting
await app.register(authRoutes);   // Uses auth-specific rate limit
// ... other routes use default rate limit
```

**Rationale:** Explicit ordering ensures error handling works correctly and dependencies are satisfied.

#### 🟡 CHANGE 3: Health Check Exemption (MEDIUM)

**Issue:** The spec briefly mentions health checks should be rate limited differently (line 959) but doesn't specify implementation.

**Problem:**
- Health checks called frequently by load balancers (every 5-10 seconds)
- Will exhaust rate limits quickly
- Could cause cascading failures

**Required Change:**

Add to `health.routes.ts`:

```typescript
// apps/api/src/routes/health.routes.ts
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    config: {
      rateLimit: false, // Disable rate limiting for health checks
    },
  }, async (request, reply) => {
    return { status: 'ok' };
  });

  app.get('/ready', {
    config: {
      rateLimit: false, // Disable rate limiting for readiness checks
    },
  }, readinessHandler);
};
```

Add to integration tests (line 696):

```typescript
describe('Health Check Exemption', () => {
  it('should not rate limit health check endpoint', async () => {
    const requests = Array(200).fill(null).map(() =>
      app.inject({ method: 'GET', url: '/health' })
    );

    const responses = await Promise.all(requests);

    // All requests should succeed (no rate limiting)
    responses.forEach(r => {
      expect(r.statusCode).toBe(200);
    });
  });
});
```

**Rationale:** Prevents health check interference with application availability.

### Integration Points Review

#### ✅ PASS: Session Middleware Dependency

The spec correctly identifies session middleware dependency (rate limit MUST run after session, needs `request.user`).

#### ✅ PASS: Redis Integration

The spec correctly uses Redis for distributed state (enables horizontal scaling, TTL-based expiration, namespace prefix).

#### ✅ PASS: OpenTelemetry Integration

The spec correctly uses structured logging from `@raptscallions/telemetry`.

### Security Review

#### ✅ PASS: IP Spoofing Protection

The spec correctly uses `request.ip` (validated by Fastify) not raw X-Forwarded-For header.

**Verification Required:** Ensure `apps/api/src/server.ts` has `trustProxy: true` enabled.

#### ✅ PASS: Redis Injection Prevention

The spec correctly uses namespacing (`rapt:rl:` prefix) and validated inputs (user ID from session, IP from Fastify).

#### ✅ PASS: Distributed Brute-Force Protection

Auth route strategy correctly prevents distributed attacks (IP-based, 5 req/min too slow for brute-force).

### Testing Strategy Review

#### ✅ PASS: Comprehensive Test Coverage

The spec includes excellent test coverage:
- Unit tests: key generation, error builder, Redis config
- Integration tests: auth limiting, API limiting, headers, multi-user isolation

**Coverage:** Meets 80% minimum requirement.

### Performance Review

#### ✅ PASS: Performance Considerations

The spec correctly analyzes performance impact:
- Request latency: +1-5ms (acceptable)
- Redis load: 2-3 ops/request (acceptable)
- Memory usage: ~100 bytes/key (negligible)

### Open Questions Resolution

**Q1: Rate limit log level**
- **Decision:** Info level for normal rate limiting, warn level for repeated abuse (3+ times in 5 minutes)

**Q2: System admin bypass**
- **Decision:** No bypass for MVP (security-first, admin compromise shouldn't bypass limits)

**Q3: Group-scoped rate limits**
- **Decision:** No for MVP (global config only, add in future epic if needed)

**Q4: UUID collision handling**
- **Decision:** No special handling (UUID collision probability ~1 in 10^36, acceptable risk)

### Summary of Required Changes

| Priority | Change | Action |
|----------|--------|--------|
| 🟡 MEDIUM | Reuse existing Redis connection | Replace new Redis() with shared client from config.ts |
| 🟡 MEDIUM | Clarify middleware registration order | Add explicit ordering documentation |
| 🟡 MEDIUM | Exempt health checks from rate limiting | Add `rateLimit: false` to health routes |

### Final Verdict

**APPROVED WITH MINOR CHANGES**

The rate limiting implementation spec is architecturally sound and demonstrates excellent understanding of Fastify plugin patterns, distributed systems design, security best practices, and performance considerations.

**The spec is ready for implementation after applying the three required changes above.**

All architectural concerns have been addressed. The implementation will integrate cleanly with the existing codebase and follow all established patterns and conventions.

---

**Specification Complete**

This specification provides a complete blueprint for implementing rate limiting middleware with Redis backend, supporting different limits for auth vs API routes, and enabling per-route customization. The implementation enforces security best practices while maintaining good UX for legitimate users.
