import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";

// Mock the auth package
vi.mock("@raptscallions/auth", () => ({
  sessionService: {
    validate: vi.fn().mockResolvedValue({
      session: null,
      user: null,
    }),
    sessionCookieName: "rapt_session",
    sessionCookieAttributes: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
    createBlankSessionCookie: vi.fn(() => ({
      name: "rapt_session",
      value: "",
      attributes: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      },
    })),
  },
}));

describe("Session Middleware (session.middleware.ts)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Create Fastify instance
    app = fastify({
      logger: false,
      requestIdHeader: "x-request-id",
    });

    // Register cookie parser (required dependency)
    await app.register(fastifyCookie);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe("Plugin Registration", () => {
    it("should register as a Fastify plugin", async () => {
      // Arrange
      const { sessionMiddleware } = await import(
        "../../middleware/session.middleware.js"
      );

      // Act
      await app.register(sessionMiddleware);

      // Assert
      expect(app).toBeDefined();
      // Plugin registered successfully if no error thrown
    });

    it("should not interfere with route handlers", async () => {
      // Arrange
      const { sessionMiddleware } = await import(
        "../../middleware/session.middleware.js"
      );
      await app.register(sessionMiddleware);

      app.get("/test", async () => ({ ok: true }));

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
    });

    it("should work with multiple routes", async () => {
      // Arrange
      const { sessionMiddleware } = await import(
        "../../middleware/session.middleware.js"
      );
      await app.register(sessionMiddleware);

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

    it("should register before route handlers are added", async () => {
      // Arrange
      const { sessionMiddleware } = await import(
        "../../middleware/session.middleware.js"
      );

      // Act - register middleware first
      await app.register(sessionMiddleware);

      // Then add routes
      app.get("/early-route", async () => ({ registered: "early" }));

      const response = await app.inject({
        method: "GET",
        url: "/early-route",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ registered: "early" });
    });

    it("should work when routes are added after registration", async () => {
      // Arrange
      const { sessionMiddleware } = await import(
        "../../middleware/session.middleware.js"
      );

      app.get("/late-route", async () => ({ registered: "late" }));

      // Act - register middleware after route
      await app.register(sessionMiddleware);

      const response = await app.inject({
        method: "GET",
        url: "/late-route",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ registered: "late" });
    });
  });
});
