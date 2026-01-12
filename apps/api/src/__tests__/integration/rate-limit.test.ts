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

// Use vi.hoisted to ensure mock objects are available when vi.mock factories run
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
    invalidateSession: vi.fn(),
    createSessionCookie: vi.fn(),
    createBlankSessionCookie: vi.fn(),
    validateSession: vi.fn(),
    sessionCookieName: "rapt_session",
  };

  const mockSessionService = {
    sessionCookieName: "rapt_session",
    sessionCookieAttributes: {
      secure: false,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
    validate: vi.fn().mockResolvedValue({
      session: null,
      user: null,
    }),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      name: "rapt_session",
      value: "",
      attributes: {},
    }),
  };

  return { mockDb, mockLucia, mockSessionService };
});

// Hoisted mocks - these are processed BEFORE any imports
vi.mock("@raptscallions/db", () => ({
  db: mockDb,
}));

vi.mock("@raptscallions/auth", () => ({
  lucia: mockLucia,
  sessionService: mockSessionService,
  permissionMiddleware: async () => {
    // No-op for rate limit tests
  },
}));

// Mock ioredis with in-memory storage for rate limiting
// @fastify/rate-limit uses a Lua script via defineCommand that:
// 1. Increments key counter
// 2. Sets/checks TTL
// 3. Returns [current, ttl, isBanned]
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Create a function that builds the mock Redis instance
// This needs to be callable like `new Redis()` or `Redis()`
const createMockRedisInstance = () => {
  const instance: Record<string, unknown> = {
    on: vi.fn(),
    quit: vi.fn(),
    defineCommand: vi.fn((name: string) => {
      // @fastify/rate-limit calls defineCommand('rateLimit', { numberOfKeys: 1, lua: '...' })
      // Then calls redis.rateLimit(key, timeWindow, max, ban, continueExceeding, callback)
      if (name === "rateLimit") {
        instance.rateLimit = (
          key: string,
          timeWindow: number,
          max: number,
          _ban: number,
          _continueExceeding: string,
          callback: (err: Error | null, result: [number, number, boolean] | null) => void
        ) => {
          try {
            const now = Date.now();
            const entry = rateLimitStore.get(key);

            if (!entry || entry.resetAt < now) {
              // New or expired - reset counter
              rateLimitStore.set(key, { count: 1, resetAt: now + timeWindow });
              callback(null, [1, timeWindow, false]);
            } else {
              // Existing - increment counter
              entry.count += 1;
              rateLimitStore.set(key, entry);
              const ttl = entry.resetAt - now;
              callback(null, [entry.count, ttl > 0 ? ttl : 0, false]);
            }
          } catch (err) {
            callback(err as Error, null);
          }
        };
      }
    }),
  };
  return instance;
};

vi.mock("ioredis", () => {
  const MockRedis = vi.fn(() => createMockRedisInstance());
  return {
    default: MockRedis,
    Redis: MockRedis,
  };
});

describe("Rate Limiting Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Reset module cache to ensure our mocks are used
    vi.resetModules();

    // Set up environment
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
    process.env.RATE_LIMIT_API_MAX = "100";
    process.env.RATE_LIMIT_AUTH_MAX = "5";
    process.env.RATE_LIMIT_TIME_WINDOW = "1 minute";

    // Create server - imports will use the mocked modules
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

  describe("Auth Route Rate Limiting", () => {
    it("should allow 5 login attempts per minute per IP", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

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

      // Act
      const responses = await Promise.all(requests);

      // Assert
      // First 5 should be processed (might be 401 for wrong password, not 429)
      responses.forEach((r) => {
        expect(r.statusCode).not.toBe(429);
        expect(r.headers["x-ratelimit-limit"]).toBeDefined();
      });
    });

    it("should block 6th login attempt from same IP", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

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

      // Act - 6th request should be rate limited
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.1.101" },
      });

      // Assert
      expect(response.statusCode).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBe("0");

      const body = response.json();
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.details).toBeDefined();
      expect(body.details.limit).toBe(5);
      expect(body.details.remaining).toBe(0);
      expect(body.details.resetAt).toBeDefined();
    });

    it("should rate limit by IP even for authenticated users on auth routes", async () => {
      // Arrange
      const mockUser = {
        id: "user-123",
        email: "valid@example.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(mockUser);
      mockLucia.createSession.mockResolvedValue({
        id: "session-123",
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });
      mockLucia.createSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "session-cookie-value",
        attributes: {},
      });
      mockSessionService.validate.mockResolvedValue({
        session: {
          id: "session-123",
          userId: mockUser.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
        user: mockUser,
      });

      // Make 5 requests with session cookie
      await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "other@example.com", password: "test" },
              headers: {
                "x-forwarded-for": "192.168.1.102",
                cookie: "rapt_session=session-cookie-value",
              },
            })
          )
      );

      // Act - 6th request should still be rate limited by IP
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "another@example.com", password: "test" },
        headers: {
          "x-forwarded-for": "192.168.1.102",
          cookie: "rapt_session=session-cookie-value",
        },
      });

      // Assert
      expect(response.statusCode).toBe(429);
    });

    it("should not share rate limits between different IPs", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // IP 1 makes 5 requests
      const ip1Requests = Array(5)
        .fill(null)
        .map(() =>
          app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "test@example.com", password: "wrong" },
            headers: { "x-forwarded-for": "192.168.1.201" },
          })
        );

      // IP 2 makes 5 requests
      const ip2Requests = Array(5)
        .fill(null)
        .map(() =>
          app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "test@example.com", password: "wrong" },
            headers: { "x-forwarded-for": "192.168.1.202" },
          })
        );

      // Act
      const allResponses = await Promise.all([...ip1Requests, ...ip2Requests]);

      // Assert
      // All 10 requests should succeed (not 429) because they're from different IPs
      allResponses.forEach((r) => {
        expect(r.statusCode).not.toBe(429);
      });
    });
  });

  describe("API Route Rate Limiting", () => {
    it("should rate limit anonymous users by IP on auth routes", async () => {
      // Arrange
      mockSessionService.validate.mockResolvedValue({
        session: null,
        user: null,
      });
      mockDb.query.users.findFirst.mockResolvedValue(null);

      const ip = "192.168.1.200";

      // Make 6 requests to auth endpoint (auth limit is 5)
      const requests = Array(6)
        .fill(null)
        .map(() =>
          app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email: "test@example.com", password: "wrong" },
            headers: { "x-forwarded-for": ip },
          })
        );

      // Act
      const responses = await Promise.all(requests);

      // Assert
      // First 5 should succeed (401 for wrong password), 6th should be rate limited
      const authFailedCount = responses.filter((r) => r.statusCode === 401).length;
      const rateLimitedCount = responses.filter(
        (r) => r.statusCode === 429
      ).length;

      expect(authFailedCount).toBe(5);
      expect(rateLimitedCount).toBe(1);
    });

    it("should not share rate limits between different IPs on auth routes", async () => {
      // This test verifies that anonymous users from different IPs
      // have separate rate limit buckets.
      mockSessionService.validate.mockResolvedValue({
        session: null,
        user: null,
      });
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // IP 1 makes 3 requests (under limit of 5)
      const ip1Responses = await Promise.all(
        Array(3)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "test@example.com", password: "wrong" },
              headers: { "x-forwarded-for": "10.0.0.1" },
            })
          )
      );

      // IP 2 makes 3 requests (under limit of 5)
      const ip2Responses = await Promise.all(
        Array(3)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "test@example.com", password: "wrong" },
              headers: { "x-forwarded-for": "10.0.0.2" },
            })
          )
      );

      // Assert - all 6 requests succeed (each IP well under 5 limit)
      ip1Responses.forEach((r) => {
        expect(r.statusCode).toBe(401); // 401 for wrong password, not 429
      });

      ip2Responses.forEach((r) => {
        expect(r.statusCode).toBe(401); // 401 for wrong password, not 429
      });

      // Verify they have separate buckets
      expect(rateLimitStore.size).toBe(2);
    });

    it("should exempt health check endpoints from rate limiting", async () => {
      // Arrange
      mockSessionService.validate.mockResolvedValue({
        session: null,
        user: null,
      });

      const ip = "192.168.1.222";

      // Make many requests to health endpoint - more than normal limit
      const requests = Array(150)
        .fill(null)
        .map(() =>
          app.inject({
            method: "GET",
            url: "/health",
            headers: { "x-forwarded-for": ip },
          })
        );

      // Act
      const responses = await Promise.all(requests);

      // Assert - all requests should succeed (health checks are exempt)
      const successCount = responses.filter((r) => r.statusCode === 200).length;
      const rateLimitedCount = responses.filter(
        (r) => r.statusCode === 429
      ).length;

      expect(successCount).toBe(150);
      expect(rateLimitedCount).toBe(0);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should include rate limit headers in responses to rate-limited routes", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Act - auth routes are rate limited
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.99.1" },
      });

      // Assert
      expect(response.statusCode).toBe(401); // Wrong password
      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
      expect(response.headers["x-ratelimit-reset"]).toBeDefined();
    });

    it("should NOT include rate limit headers for exempt routes", async () => {
      // Act - health routes are exempt from rate limiting
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      // Health routes are exempt so they won't have rate limit headers
      expect(response.headers["x-ratelimit-limit"]).toBeUndefined();
    });

    it("should include Retry-After header in 429 responses", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Hit rate limit on auth route
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

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.1.250" },
      });

      // Assert
      expect(response.statusCode).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
      const retryAfter = Number(response.headers["retry-after"]);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60); // Should be within time window
    });

    it("should decrement x-ratelimit-remaining with each request", async () => {
      // Arrange
      const ip = "192.168.1.99";
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Act - Make 3 sequential requests to auth route (which IS rate limited)
      const response1 = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": ip },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": ip },
      });

      const response3 = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": ip },
      });

      // Assert
      const remaining1 = Number(response1.headers["x-ratelimit-remaining"]);
      const remaining2 = Number(response2.headers["x-ratelimit-remaining"]);
      const remaining3 = Number(response3.headers["x-ratelimit-remaining"]);

      expect(remaining1).toBeGreaterThan(remaining2);
      expect(remaining2).toBeGreaterThan(remaining3);
      expect(remaining1 - remaining2).toBe(1);
      expect(remaining2 - remaining3).toBe(1);
    });
  });

  describe("Error Response Format", () => {
    it("should return properly formatted error on rate limit exceeded", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Hit rate limit
      await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            app.inject({
              method: "POST",
              url: "/auth/login",
              payload: { email: "test@example.com", password: "wrong" },
              headers: { "x-forwarded-for": "192.168.1.88" },
            })
          )
      );

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "test@example.com", password: "wrong" },
        headers: { "x-forwarded-for": "192.168.1.88" },
      });

      // Assert
      expect(response.statusCode).toBe(429);

      const body = response.json();
      expect(body).toMatchObject({
        error: expect.any(String),
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          limit: expect.any(Number),
          remaining: 0,
          resetAt: expect.any(String),
        },
      });

      // Verify resetAt is a valid ISO date
      expect(() => new Date(body.details.resetAt)).not.toThrow();
      const resetDate = new Date(body.details.resetAt);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
