import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import fastify, { type FastifyInstance } from "fastify";
import { UnauthorizedError } from "@raptscallions/core";

describe("Auth Middleware (auth.middleware.ts)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Reset modules
    vi.resetModules();

    // Create Fastify instance
    app = fastify({
      logger: false,
      requestIdHeader: "x-request-id",
    });
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("Plugin Registration", () => {
    it("should register as a Fastify plugin", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );

      // Act
      await app.register(authMiddleware);

      // Assert
      expect(app).toBeDefined();
      expect(app.requireAuth).toBeDefined();
      expect(app.requireActiveUser).toBeDefined();
    });

    it("should decorate app with requireAuth", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );

      // Act
      await app.register(authMiddleware);

      // Assert
      expect(app.requireAuth).toBeDefined();
      expect(typeof app.requireAuth).toBe("function");
    });

    it("should decorate app with requireActiveUser", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );

      // Act
      await app.register(authMiddleware);

      // Assert
      expect(app.requireActiveUser).toBeDefined();
      expect(typeof app.requireActiveUser).toBe("function");
    });
  });

  describe("requireAuth", () => {
    it("should throw UnauthorizedError when no user", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      // Mock request with no user
      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ success: true })
      );

      // Mock session middleware that sets null user
      app.addHook("onRequest", async (request) => {
        request.user = null;
        request.session = null;
      });

      // Act & Assert
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should allow request when user is present", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      // Mock session middleware that sets user
      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active" as const,
        };
        request.session = {
          id: "session-123",
          userId: "user-123",
          expiresAt: new Date(),
          fresh: false,
          context: "personal",
          lastActivityAt: new Date(),
        };
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth],
        },
        async (request) => ({
          userId: request.user?.id,
        })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json().userId).toBe("user-123");
    });

    it("should work as preHandler in route", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      // Set up authenticated user
      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "auth-user",
          email: "auth@example.com",
          name: "Authed User",
          status: "active" as const,
        };
        request.session = null;
      });

      app.get(
        "/api/protected",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ protected: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json().protected).toBe(true);
    });

    it("should allow suspended user (only checks authentication)", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "suspended-user",
          email: "suspended@example.com",
          name: "Suspended User",
          status: "suspended" as const,
        };
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });

    it("should allow pending_verification user (only checks authentication)", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "pending-user",
          email: "pending@example.com",
          name: "Pending User",
          status: "pending_verification" as const,
        };
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });
  });

  describe("requireActiveUser", () => {
    it("should throw UnauthorizedError when no user", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = null;
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireActiveUser],
        },
        async () => ({ success: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("should throw UnauthorizedError when user is suspended", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "suspended-user",
          email: "suspended@example.com",
          name: "Suspended User",
          status: "suspended" as const,
        };
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireActiveUser],
        },
        async () => ({ success: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("should throw UnauthorizedError when user is pending_verification", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "pending-user",
          email: "pending@example.com",
          name: "Pending User",
          status: "pending_verification" as const,
        };
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireActiveUser],
        },
        async () => ({ success: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("should allow request when user is active", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "active-user",
          email: "active@example.com",
          name: "Active User",
          status: "active" as const,
        };
        request.session = null;
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireActiveUser],
        },
        async (request) => ({
          userId: request.user?.id,
        })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json().userId).toBe("active-user");
    });

    it("should work as preHandler in route", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "user-456",
          email: "user@example.com",
          name: "User",
          status: "active" as const,
        };
        request.session = null;
      });

      app.post(
        "/api/action",
        {
          preHandler: [app.requireActiveUser],
        },
        async () => ({ action: "performed" })
      );

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/api/action",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json().action).toBe("performed");
    });
  });

  describe("Multiple Handlers", () => {
    it("should work with multiple preHandlers", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "multi-user",
          email: "multi@example.com",
          name: "Multi User",
          status: "active" as const,
        };
        request.session = null;
      });

      const customHandler = async (request: any, reply: any) => {
        // Custom validation logic
      };

      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth, customHandler],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });

    it("should combine requireAuth and requireActiveUser", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "combined-user",
          email: "combined@example.com",
          name: "Combined User",
          status: "active" as const,
        };
        request.session = null;
      });

      app.get(
        "/very-protected",
        {
          preHandler: [app.requireAuth, app.requireActiveUser],
        },
        async () => ({ veryProtected: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/very-protected",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Error Messages", () => {
    it("should return Authentication required for requireAuth", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = null;
        request.session = null;
      });

      // Register error handler to format errors
      app.setErrorHandler((error, request, reply) => {
        reply.status(error.statusCode || 500).send({
          error: error.message,
        });
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Authentication required");
    });

    it("should return Account is not active for suspended user", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "suspended",
          email: "suspended@example.com",
          name: "Suspended",
          status: "suspended" as const,
        };
        request.session = null;
      });

      app.setErrorHandler((error, request, reply) => {
        reply.status(error.statusCode || 500).send({
          error: error.message,
        });
      });

      app.get(
        "/protected",
        {
          preHandler: [app.requireActiveUser],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe("Account is not active");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null user gracefully", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = null;
        request.session = null;
      });

      app.get(
        "/test",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("should handle undefined user gracefully", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        // Don't set request.user at all
      });

      app.get(
        "/test",
        {
          preHandler: [app.requireAuth],
        },
        async () => ({ ok: true })
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it("should handle routes without auth middleware", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.get("/public", async () => ({ public: true }));

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/public",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json().public).toBe(true);
    });

    it("should work across different HTTP methods", async () => {
      // Arrange
      const { authMiddleware } = await import(
        "../../middleware/auth.middleware.js"
      );
      await app.register(authMiddleware);

      app.addHook("onRequest", async (request) => {
        request.user = {
          id: "method-user",
          email: "method@example.com",
          name: "Method User",
          status: "active" as const,
        };
        request.session = null;
      });

      app.get("/test", { preHandler: [app.requireAuth] }, async () => ({
        method: "GET",
      }));
      app.post("/test", { preHandler: [app.requireAuth] }, async () => ({
        method: "POST",
      }));
      app.put("/test", { preHandler: [app.requireAuth] }, async () => ({
        method: "PUT",
      }));
      app.delete("/test", { preHandler: [app.requireAuth] }, async () => ({
        method: "DELETE",
      }));

      // Act
      const getResponse = await app.inject({ method: "GET", url: "/test" });
      const postResponse = await app.inject({ method: "POST", url: "/test" });
      const putResponse = await app.inject({ method: "PUT", url: "/test" });
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: "/test",
      });

      // Assert
      expect(getResponse.statusCode).toBe(200);
      expect(postResponse.statusCode).toBe(200);
      expect(putResponse.statusCode).toBe(200);
      expect(deleteResponse.statusCode).toBe(200);
    });
  });
});
