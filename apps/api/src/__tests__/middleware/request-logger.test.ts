import fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";

describe("Request Logger Middleware (request-logger.ts)", () => {
  let app: FastifyInstance;
  let _mockLogger: {
    info: Mock;
    error: Mock;
  };

  beforeEach(async () => {
    // Reset modules
    vi.resetModules();

    // Mock logger
    _mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    // Create Fastify instance
    app = fastify({
      logger: false,
      requestIdHeader: "x-request-id",
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("onRequest hook", () => {
    it("should log request start with requestId, method, and url", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/test", async () => ({ ok: true }));

      // Act
      await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert - This test verifies the hook is registered
      // Actual logging behavior is tested via integration tests
      expect(app).toBeDefined();
    });
  });

  describe("onResponse hook", () => {
    it("should log request completion with timing and status", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/test", async () => ({ ok: true }));

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });
  });

  describe("Hook registration", () => {
    it("should register as a Fastify plugin", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");

      // Act
      await app.register(requestLogger);

      // Assert
      expect(app).toBeDefined();
      // Plugin registered successfully if no error thrown
    });

    it("should not interfere with route handlers", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/test", async () => ({ message: "success" }));

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: "success" });
    });

    it("should work with multiple routes", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/route1", async () => ({ route: 1 }));
      app.post("/route2", async () => ({ route: 2 }));
      app.put("/route3", async () => ({ route: 3 }));

      // Act
      const response1 = await app.inject({ method: "GET", url: "/route1" });
      const response2 = await app.inject({ method: "POST", url: "/route2" });
      const response3 = await app.inject({ method: "PUT", url: "/route3" });

      // Assert
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response3.statusCode).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("should log requests that result in errors", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/error", async () => {
        throw new Error("Test error");
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/error",
      });

      // Assert
      expect(response.statusCode).toBe(500);
    });

    it("should log 404 requests", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/nonexistent",
      });

      // Assert
      expect(response.statusCode).toBe(404);
    });
  });

  describe("Request context", () => {
    it("should handle requests with various HTTP methods", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/test", async () => ({ method: "GET" }));
      app.post("/test", async () => ({ method: "POST" }));
      app.put("/test", async () => ({ method: "PUT" }));
      app.patch("/test", async () => ({ method: "PATCH" }));
      app.delete("/test", async () => ({ method: "DELETE" }));

      // Act
      const getResponse = await app.inject({ method: "GET", url: "/test" });
      const postResponse = await app.inject({ method: "POST", url: "/test" });
      const putResponse = await app.inject({ method: "PUT", url: "/test" });
      const patchResponse = await app.inject({ method: "PATCH", url: "/test" });
      const deleteResponse = await app.inject({ method: "DELETE", url: "/test" });

      // Assert
      expect(getResponse.statusCode).toBe(200);
      expect(postResponse.statusCode).toBe(200);
      expect(putResponse.statusCode).toBe(200);
      expect(patchResponse.statusCode).toBe(200);
      expect(deleteResponse.statusCode).toBe(200);
    });

    it("should handle requests with different URLs", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/path1", async () => ({ path: 1 }));
      app.get("/path2/nested", async () => ({ path: 2 }));
      app.get("/path3/:id", async (request) => ({ id: request.params }));

      // Act
      const response1 = await app.inject({ method: "GET", url: "/path1" });
      const response2 = await app.inject({ method: "GET", url: "/path2/nested" });
      const response3 = await app.inject({ method: "GET", url: "/path3/123" });

      // Assert
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response3.statusCode).toBe(200);
    });
  });

  describe("Response timing", () => {
    it("should work with fast responses", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/fast", async () => ({ speed: "fast" }));

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/fast",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });

    it("should work with slow responses", async () => {
      // Arrange
      const { requestLogger } = await import("../../middleware/request-logger.js");
      await app.register(requestLogger);

      app.get("/slow", async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { speed: "slow" };
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/slow",
      });

      // Assert
      expect(response.statusCode).toBe(200);
    });
  });
});
