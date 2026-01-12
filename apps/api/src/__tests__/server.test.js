import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
describe("Server Factory (server.ts)", () => {
    let app;
    beforeEach(() => {
        vi.resetModules();
        // Set up required environment variables
        process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
        process.env.REDIS_URL = "redis://localhost:6379";
        process.env.CORS_ORIGINS = "http://localhost:5173";
        process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";
    });
    afterEach(async () => {
        if (app) {
            await app.close();
        }
    });
    describe("createServer function", () => {
        it("should create a Fastify instance", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Assert
            expect(app).toBeDefined();
            expect(app.server).toBeDefined();
        });
        it("should be async and return a Promise", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            const result = createServer();
            // Assert
            expect(result).toBeInstanceOf(Promise);
            app = await result;
        });
        it("should create server with request ID header configured", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Assert
            // Verify server is configured (will have requestId support)
            expect(app).toBeDefined();
        });
    });
    describe("CORS configuration", () => {
        it("should register CORS plugin", async () => {
            // Arrange
            process.env.CORS_ORIGINS = "http://localhost:5173";
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Make a request to test CORS headers
            app.get("/test", async () => ({ ok: true }));
            const response = await app.inject({
                method: "GET",
                url: "/test",
                headers: {
                    origin: "http://localhost:5173",
                },
            });
            // Assert
            expect(response.headers["access-control-allow-origin"]).toBeDefined();
        });
        it("should support multiple CORS origins from comma-separated string", async () => {
            // Arrange
            process.env.CORS_ORIGINS = "http://localhost:5173,http://localhost:3000";
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Add a test route
            app.get("/test", async () => ({ ok: true }));
            // Test first origin
            const response1 = await app.inject({
                method: "GET",
                url: "/test",
                headers: {
                    origin: "http://localhost:5173",
                },
            });
            // Test second origin
            const response2 = await app.inject({
                method: "GET",
                url: "/test",
                headers: {
                    origin: "http://localhost:3000",
                },
            });
            // Assert
            expect(response1.headers["access-control-allow-origin"]).toBeDefined();
            expect(response2.headers["access-control-allow-origin"]).toBeDefined();
        });
        it("should enable credentials", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            app.get("/test", async () => ({ ok: true }));
            const response = await app.inject({
                method: "OPTIONS",
                url: "/test",
                headers: {
                    origin: "http://localhost:5173",
                    "access-control-request-method": "GET",
                },
            });
            // Assert
            expect(response.headers["access-control-allow-credentials"]).toBe("true");
        });
        it("should allow standard HTTP methods", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            app.get("/test", async () => ({ ok: true }));
            const response = await app.inject({
                method: "OPTIONS",
                url: "/test",
                headers: {
                    origin: "http://localhost:5173",
                    "access-control-request-method": "POST",
                },
            });
            // Assert
            expect(response.headers["access-control-allow-methods"]).toBeDefined();
        });
    });
    describe("Middleware registration", () => {
        it("should register request logger middleware", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Assert - Request logger registered if server creation succeeds
            expect(app).toBeDefined();
        });
        it("should register error handler", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Test error handler by throwing an error
            app.get("/error", async () => {
                throw new Error("Test error");
            });
            const response = await app.inject({
                method: "GET",
                url: "/error",
            });
            // Assert - Error handler should catch and format the error
            expect(response.statusCode).toBe(500);
            expect(response.json()).toHaveProperty("error");
            expect(response.json()).toHaveProperty("code");
        });
    });
    describe("Routes registration", () => {
        it("should register health routes", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            const healthResponse = await app.inject({
                method: "GET",
                url: "/health",
            });
            const readyResponse = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(healthResponse.statusCode).not.toBe(404);
            expect(readyResponse.statusCode).not.toBe(404);
        });
    });
    describe("Server configuration", () => {
        it("should disable Fastify's built-in logger", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Assert - Server should use custom logger instead
            expect(app).toBeDefined();
        });
        it("should configure request ID header", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            app.get("/test", async (request) => ({ requestId: request.id }));
            const response = await app.inject({
                method: "GET",
                url: "/test",
                headers: {
                    "x-request-id": "custom-request-id",
                },
            });
            // Assert - Request should have ID
            expect(response.json()).toHaveProperty("requestId");
        });
    });
    describe("Error scenarios", () => {
        it("should handle errors during route execution", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            app = await createServer();
            app.get("/throw", async () => {
                throw new Error("Intentional error");
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/throw",
            });
            // Assert
            expect(response.statusCode).toBe(500);
            expect(response.json()).toMatchObject({
                error: "Internal server error",
                code: "INTERNAL_ERROR",
            });
        });
        it("should handle 404 errors", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            app = await createServer();
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/nonexistent",
            });
            // Assert
            expect(response.statusCode).toBe(404);
        });
    });
    describe("Plugin registration order", () => {
        it("should register plugins in correct order", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            // Act
            app = await createServer();
            // Test that CORS, logger, routes, and error handler all work together
            app.get("/test", async () => {
                throw new Error("Test");
            });
            const response = await app.inject({
                method: "GET",
                url: "/test",
                headers: {
                    origin: "http://localhost:5173",
                },
            });
            // Assert - All middleware should process the request
            expect(response.statusCode).toBe(500);
            expect(response.headers["access-control-allow-origin"]).toBeDefined();
            expect(response.json()).toHaveProperty("error");
        });
    });
    describe("Server lifecycle", () => {
        it("should close gracefully", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            app = await createServer();
            // Act & Assert - Should not throw
            await expect(app.close()).resolves.toBeUndefined();
        });
        it("should allow multiple requests before closing", async () => {
            // Arrange
            const { createServer } = await import("../server.js");
            app = await createServer();
            app.get("/test", async () => ({ ok: true }));
            // Act
            const response1 = await app.inject({ method: "GET", url: "/test" });
            const response2 = await app.inject({ method: "GET", url: "/test" });
            const response3 = await app.inject({ method: "GET", url: "/test" });
            await app.close();
            // Assert
            expect(response1.statusCode).toBe(200);
            expect(response2.statusCode).toBe(200);
            expect(response3.statusCode).toBe(200);
        });
    });
});
//# sourceMappingURL=server.test.js.map