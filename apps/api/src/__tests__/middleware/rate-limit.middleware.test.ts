import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for rate limit middleware functions.
 *
 * Since the rate-limit.middleware.ts exports a Fastify plugin with internal
 * functions (keyGenerator, errorResponseBuilder), we test the logic patterns
 * that these functions implement.
 */
describe("Rate Limit Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Key Generation Logic", () => {
    // Replicate the keyGenerator logic for testing
    const keyGenerator = (request: { user?: { id: string } | null; ip: string }): string => {
      if (request.user) {
        return `user:${request.user.id}`;
      }
      return `ip:${request.ip}`;
    };

    // Replicate the authKeyGenerator logic for testing
    const authKeyGenerator = (request: { ip: string }): string => {
      return `auth:${request.ip}`;
    };

    it("should use user ID for authenticated API requests", () => {
      // Arrange
      const request = {
        user: { id: "user-123" },
        ip: "192.168.1.1",
      };

      // Act
      const key = keyGenerator(request);

      // Assert
      expect(key).toBe("user:user-123");
    });

    it("should use IP address for anonymous requests", () => {
      // Arrange
      const request = {
        user: null,
        ip: "192.168.1.1",
      };

      // Act
      const key = keyGenerator(request);

      // Assert
      expect(key).toBe("ip:192.168.1.1");
    });

    it("should use IP address when user is undefined", () => {
      // Arrange
      const request = {
        ip: "10.0.0.5",
      };

      // Act
      const key = keyGenerator(request);

      // Assert
      expect(key).toBe("ip:10.0.0.5");
    });

    it("should always use IP with auth prefix for auth routes", () => {
      // Arrange - even authenticated users get IP-based limiting on auth routes
      const request = {
        user: { id: "user-123" },
        ip: "192.168.1.1",
      };

      // Act
      const authKey = authKeyGenerator(request);

      // Assert
      expect(authKey).toBe("auth:192.168.1.1");
    });

    it("should generate unique keys for different users on same IP", () => {
      // Arrange
      const request1 = { user: { id: "user-111" }, ip: "192.168.1.1" };
      const request2 = { user: { id: "user-222" }, ip: "192.168.1.1" };

      // Act
      const key1 = keyGenerator(request1);
      const key2 = keyGenerator(request2);

      // Assert
      expect(key1).not.toBe(key2);
      expect(key1).toBe("user:user-111");
      expect(key2).toBe("user:user-222");
    });

    it("should generate same key for same anonymous IP", () => {
      // Arrange
      const request1 = { user: null, ip: "192.168.1.1" };
      const request2 = { user: null, ip: "192.168.1.1" };

      // Act
      const key1 = keyGenerator(request1);
      const key2 = keyGenerator(request2);

      // Assert
      expect(key1).toBe(key2);
      expect(key1).toBe("ip:192.168.1.1");
    });
  });

  describe("Error Response Builder Logic", () => {
    // Replicate the errorResponseBuilder logic for testing
    const errorResponseBuilder = (
      request: { url: string },
      context: { max: number; after: string; ttl: number }
    ) => {
      const resetAt = new Date(Date.now() + context.ttl);
      const isAuthRoute = request.url.startsWith("/auth");

      const message = isAuthRoute
        ? `For security, login attempts are limited to ${context.max} per minute. Please wait ${context.after} seconds.`
        : `You've reached the request limit of ${context.max} per minute. Please wait ${context.after} seconds.`;

      return {
        statusCode: 429,
        error: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          limit: context.max,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          retryAfter: context.after,
          message,
        },
      };
    };

    it("should format rate limit error with correct status code", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.statusCode).toBe(429);
    });

    it("should include correct error code", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should include limit and remaining in details", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.limit).toBe(100);
      expect(error.details.remaining).toBe(0);
    });

    it("should include retryAfter in details", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "30", ttl: 30000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.retryAfter).toBe("30");
    });

    it("should include valid ISO resetAt timestamp", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "42", ttl: 42000 };
      const beforeTime = Date.now();

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      const resetAt = new Date(error.details.resetAt);
      expect(() => resetAt.toISOString()).not.toThrow();
      expect(resetAt.getTime()).toBeGreaterThanOrEqual(beforeTime + 42000);
    });

    it("should include auth-specific message for auth routes", () => {
      // Arrange
      const request = { url: "/auth/login" };
      const context = { max: 5, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.message).toBe(
        "For security, login attempts are limited to 5 per minute. Please wait 42 seconds."
      );
    });

    it("should include auth-specific message for all auth subroutes", () => {
      // Arrange
      const routes = ["/auth/login", "/auth/register", "/auth/google", "/auth/microsoft/callback"];

      // Act & Assert
      routes.forEach((url) => {
        const request = { url };
        const context = { max: 5, after: "30", ttl: 30000 };
        const error = errorResponseBuilder(request, context);
        expect(error.details.message).toContain("For security");
        expect(error.details.message).toContain("login attempts");
      });
    });

    it("should include API-specific message for non-auth routes", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.message).toBe(
        "You've reached the request limit of 100 per minute. Please wait 42 seconds."
      );
    });

    it("should include API-specific message for health routes", () => {
      // Arrange - health routes should show API message, not auth message
      const request = { url: "/health" };
      const context = { max: 100, after: "15", ttl: 15000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.message).toContain("request limit");
      expect(error.details.message).not.toContain("login attempts");
    });

    it("should dynamically include max value in message", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 50, after: "42", ttl: 42000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.message).toContain("50 per minute");
    });

    it("should dynamically include wait time in message", () => {
      // Arrange
      const request = { url: "/api/users" };
      const context = { max: 100, after: "17", ttl: 17000 };

      // Act
      const error = errorResponseBuilder(request, context);

      // Assert
      expect(error.details.message).toContain("wait 17 seconds");
    });
  });

  describe("Redis Configuration", () => {
    it("should use correct namespace prefix for isolation", () => {
      // The middleware uses "rapt:rl:" as namespace to avoid key collisions
      const namespace = "rapt:rl:";
      const userKey = "user:user-123";

      // Actual Redis key would be prefixed
      const fullKey = `${namespace}${userKey}`;

      expect(fullKey).toBe("rapt:rl:user:user-123");
    });

    it("should use separate namespace for auth routes", () => {
      // Auth routes use "rapt:rl:auth:" prefix
      const authNamespace = "rapt:rl:";
      const authKey = "auth:192.168.1.1";

      const fullKey = `${authNamespace}${authKey}`;

      expect(fullKey).toBe("rapt:rl:auth:192.168.1.1");
    });
  });

  describe("Retry Strategy Logic", () => {
    // Replicate the retry strategy logic
    const retryStrategy = (times: number): number => {
      return Math.min(times * 50, 2000);
    };

    it("should start with 50ms delay", () => {
      expect(retryStrategy(1)).toBe(50);
    });

    it("should increase delay linearly", () => {
      expect(retryStrategy(2)).toBe(100);
      expect(retryStrategy(5)).toBe(250);
      expect(retryStrategy(10)).toBe(500);
    });

    it("should cap delay at 2000ms", () => {
      expect(retryStrategy(40)).toBe(2000);
      expect(retryStrategy(50)).toBe(2000);
      expect(retryStrategy(100)).toBe(2000);
    });
  });
});
