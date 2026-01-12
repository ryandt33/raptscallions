import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
describe("Health Endpoints Integration", () => {
    let app;
    let mockQueryClient;
    beforeAll(async () => {
        // Set up environment
        process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
        process.env.REDIS_URL = "redis://localhost:6379";
        process.env.CORS_ORIGINS = "http://localhost:5173";
        process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
        // Mock queryClient
        mockQueryClient = {
            unsafe: vi.fn(),
            end: vi.fn(),
        };
        // Mock @raptscallions/db module
        vi.doMock("@raptscallions/db", () => ({
            queryClient: mockQueryClient,
            db: {
                query: {},
                insert: vi.fn(),
                select: vi.fn(),
            },
        }));
        // Create server
        const { createServer } = await import("../../server.js");
        app = await createServer();
    });
    afterAll(async () => {
        await app.close();
        vi.clearAllMocks();
    });
    describe("GET /health", () => {
        it("should return 200 with status and timestamp", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.status).toBe("ok");
            expect(body.timestamp).toBeDefined();
        });
        it("should return valid ISO8601 timestamp", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            const body = response.json();
            expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            // Verify timestamp is recent (within last 5 seconds)
            const timestamp = new Date(body.timestamp);
            const now = new Date();
            const diffMs = now.getTime() - timestamp.getTime();
            expect(diffMs).toBeLessThan(5000);
        });
        it("should respond in less than 10ms", async () => {
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
        it("should return application/json content type", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.headers["content-type"]).toContain("application/json");
        });
        it("should not require authentication", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
        });
        it("should work when database is down", async () => {
            // Arrange
            mockQueryClient.unsafe.mockRejectedValue(new Error("Database down"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            expect(response.json()).toMatchObject({
                status: "ok",
                timestamp: expect.any(String),
            });
        });
        it("should handle concurrent requests", async () => {
            // Act
            const requests = Array.from({ length: 10 }, () => app.inject({ method: "GET", url: "/health" }));
            const responses = await Promise.all(requests);
            // Assert
            responses.forEach((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.json()).toHaveProperty("status", "ok");
            });
        });
    });
    describe("GET /ready", () => {
        it("should return 200 when database is connected", async () => {
            // Arrange
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
        it("should execute SELECT 1 query", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(mockQueryClient.unsafe).toHaveBeenCalledWith("SELECT 1");
        });
        it("should return valid response structure when ready", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            const body = response.json();
            expect(body).toEqual({
                ready: true,
                checks: {
                    database: "ok",
                },
            });
        });
        it("should return valid response structure when not ready", async () => {
            // Arrange
            mockQueryClient.unsafe.mockRejectedValue(new Error("Connection error"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            const body = response.json();
            expect(body).toMatchObject({
                ready: false,
                checks: {
                    database: "error",
                },
            });
        });
        it("should return application/json content type", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.headers["content-type"]).toContain("application/json");
        });
        it("should not require authentication", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(200);
        });
        it("should gracefully handle database timeout", async () => {
            // Arrange
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
        it("should handle concurrent readiness checks", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const requests = Array.from({ length: 5 }, () => app.inject({ method: "GET", url: "/ready" }));
            const responses = await Promise.all(requests);
            // Assert
            responses.forEach((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.json()).toMatchObject({
                    ready: true,
                    checks: { database: "ok" },
                });
            });
        });
        it("should not propagate database errors to response", async () => {
            // Arrange
            mockQueryClient.unsafe.mockRejectedValue(new Error("password=secret123 authentication failed"));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            const body = response.json();
            expect(JSON.stringify(body)).not.toContain("password=secret123");
        });
    });
    describe("CORS headers", () => {
        it("should include CORS headers on /health requests", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
                headers: {
                    origin: "http://localhost:5173",
                },
            });
            // Assert
            expect(response.headers["access-control-allow-origin"]).toBeDefined();
        });
        it("should include CORS headers on /ready requests", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
                headers: {
                    origin: "http://localhost:5173",
                },
            });
            // Assert
            expect(response.headers["access-control-allow-origin"]).toBeDefined();
        });
        it("should handle preflight OPTIONS requests for /health", async () => {
            // Act
            const response = await app.inject({
                method: "OPTIONS",
                url: "/health",
                headers: {
                    origin: "http://localhost:5173",
                    "access-control-request-method": "GET",
                },
            });
            // Assert
            expect(response.statusCode).toBe(204);
            expect(response.headers["access-control-allow-methods"]).toBeDefined();
        });
        it("should handle preflight OPTIONS requests for /ready", async () => {
            // Act
            const response = await app.inject({
                method: "OPTIONS",
                url: "/ready",
                headers: {
                    origin: "http://localhost:5173",
                    "access-control-request-method": "GET",
                },
            });
            // Assert
            expect(response.statusCode).toBe(204);
            expect(response.headers["access-control-allow-methods"]).toBeDefined();
        });
    });
    describe("Request logging", () => {
        it("should log /health requests", async () => {
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/health",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            // Logging is verified by middleware tests
        });
        it("should log /ready requests", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/ready",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            // Logging is verified by middleware tests
        });
    });
    describe("Edge cases", () => {
        it("should handle rapid successive calls to /health", async () => {
            // Act
            const responses = await Promise.all([
                app.inject({ method: "GET", url: "/health" }),
                app.inject({ method: "GET", url: "/health" }),
                app.inject({ method: "GET", url: "/health" }),
                app.inject({ method: "GET", url: "/health" }),
                app.inject({ method: "GET", url: "/health" }),
            ]);
            // Assert
            responses.forEach((response) => {
                expect(response.statusCode).toBe(200);
                expect(response.json()).toHaveProperty("status", "ok");
            });
        });
        it("should handle rapid successive calls to /ready", async () => {
            // Arrange
            mockQueryClient.unsafe.mockResolvedValue([{ "?column?": 1 }]);
            // Act
            const responses = await Promise.all([
                app.inject({ method: "GET", url: "/ready" }),
                app.inject({ method: "GET", url: "/ready" }),
                app.inject({ method: "GET", url: "/ready" }),
                app.inject({ method: "GET", url: "/ready" }),
                app.inject({ method: "GET", url: "/ready" }),
            ]);
            // Assert
            responses.forEach((response) => {
                expect(response.statusCode).toBe(200);
            });
        });
        it("should return different timestamps on successive /health calls", async () => {
            // Act
            const response1 = await app.inject({ method: "GET", url: "/health" });
            await new Promise((resolve) => setTimeout(resolve, 10));
            const response2 = await app.inject({ method: "GET", url: "/health" });
            // Assert
            const body1 = response1.json();
            const body2 = response2.json();
            expect(body1.timestamp).not.toBe(body2.timestamp);
        });
    });
});
//# sourceMappingURL=health.test.js.map