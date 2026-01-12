import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fastify from "fastify";
describe("Health Routes (health.routes.ts)", () => {
    let app;
    let mockQueryClient;
    beforeEach(async () => {
        // Reset modules
        vi.resetModules();
        // Mock queryClient
        mockQueryClient = {
            unsafe: vi.fn(),
            end: vi.fn(),
        };
        // Mock @raptscallions/db module
        vi.doMock("@raptscallions/db", () => ({
            queryClient: mockQueryClient,
        }));
        // Create Fastify instance
        app = fastify({
            logger: false,
        });
    });
    afterEach(async () => {
        await app.close();
        vi.clearAllMocks();
    });
    describe("GET /health", () => {
        it("should return 200 with status and timestamp", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body).toHaveProperty("status", "ok");
            expect(body).toHaveProperty("timestamp");
        });
        it("should return timestamp in ISO8601 format", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            const body = response.json();
            expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            // Verify it's a valid date
            const date = new Date(body.timestamp);
            expect(date).toBeInstanceOf(Date);
            expect(date.toISOString()).toBe(body.timestamp);
        });
        it("should respond quickly (< 10ms)", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const startTime = Date.now();
            await app.inject({
                method: "GET",
                url: "/health",
            });
            const duration = Date.now() - startTime;
            // Assert
            expect(duration).toBeLessThan(10);
        });
        it("should always return 200 regardless of database state", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Simulate database being down (should not affect /health)
            mockQueryClient.unsafe.mockRejectedValue(new Error("Database down"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.json()).toHaveProperty("status", "ok");
        });
        it("should not require authentication", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act - no auth headers
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
        });
        it("should return valid JSON", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.headers["content-type"]).toContain("application/json");
            expect(() => JSON.parse(response.body)).not.toThrow();
        });
    });
    describe("GET /ready", () => {
        it("should return 200 when database is connected", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.ready).toBe(true);
            expect(body.checks.database).toBe("ok");
        });
        it("should return 503 when database is unavailable", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockRejectedValue(new Error("Connection refused"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(503);
            const body = response.json();
            expect(body.ready).toBe(false);
            expect(body.checks.database).toBe("error");
        });
        it("should call database with SELECT 1 query", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(mockQueryClient.unsafe).toHaveBeenCalledWith("SELECT 1");
        });
        it("should include checks object in response", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            const body = response.json();
            expect(body).toHaveProperty("ready");
            expect(body).toHaveProperty("checks");
            expect(body.checks).toHaveProperty("database");
        });
        it("should handle database timeout errors", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockRejectedValue(new Error("Query timeout"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(503);
            expect(response.json().ready).toBe(false);
        });
        it("should not throw unhandled errors on database failure", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockRejectedValue(new Error("Database error"));
            // Act & Assert - should not throw
            await expect(app.inject({
                method: "GET",
                url: "/ready",
            })).resolves.toBeDefined();
        });
        it("should not require authentication", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act - no auth headers
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(200);
        });
        it("should return valid JSON", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.headers["content-type"]).toContain("application/json");
            expect(() => JSON.parse(response.body)).not.toThrow();
        });
    });
    describe("Route registration", () => {
        it("should register as Fastify plugin", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            // Act & Assert - should not throw
            await expect(app.register(healthRoutes)).resolves.toBeDefined();
        });
        it("should register both /health and /ready routes", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const healthResponse = await app.inject({ method: "GET", url: "/health" });
            const readyResponse = await app.inject({ method: "GET", url: "/ready" });
            // Assert
            expect(healthResponse.statusCode).toBe(200);
            expect(readyResponse.statusCode).toBe(200);
        });
        it("should only respond to GET requests", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const postHealth = await app.inject({ method: "POST", url: "/health" });
            const putReady = await app.inject({ method: "PUT", url: "/ready" });
            // Assert
            expect(postHealth.statusCode).toBe(404);
            expect(putReady.statusCode).toBe(404);
        });
    });
    describe("Response structure", () => {
        it("should have consistent response format for /health", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            const body = response.json();
            expect(Object.keys(body)).toEqual(expect.arrayContaining(["status", "timestamp"]));
            expect(Object.keys(body)).toHaveLength(2);
        });
        it("should have consistent response format for /ready", async () => {
            // Arrange
            const { healthRoutes } = await import("../../routes/health.routes.js");
            await app.register(healthRoutes);
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            const body = response.json();
            expect(Object.keys(body)).toEqual(expect.arrayContaining(["ready", "checks"]));
            expect(typeof body.ready).toBe("boolean");
            expect(typeof body.checks).toBe("object");
        });
    });
});
//# sourceMappingURL=health.routes.test.js.map