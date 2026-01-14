import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

import type { SessionServiceLike } from "../../middleware/session.middleware.js";
import type { FastifyInstance } from "fastify";

// Use vi.hoisted to ensure mock objects are available when vi.mock factories run
// CRITICAL: These must be hoisted to the top of the file before ANY imports
const { mockDb, mockLucia, mockSessionService, rateLimitStore } = vi.hoisted(() => {
  const mockSessionService = {
    sessionCookieName: "rapt_session",
    sessionCookieAttributes: {
      secure: false,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
    validate: vi.fn(),
    create: vi.fn(),
    invalidate: vi.fn(),
    invalidateUserSessions: vi.fn(),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      name: "rapt_session",
      value: "",
      attributes: {},
    }),
  };

  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      groupMembers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
  };

  const mockLucia = {
    createSession: vi.fn(),
    invalidateSession: vi.fn(),
    invalidateUserSessions: vi.fn(),
    createSessionCookie: vi.fn(),
    createBlankSessionCookie: vi.fn().mockReturnValue({
      name: "rapt_session",
      value: "",
      attributes: {},
    }),
    validateSession: vi.fn(),
    sessionCookieName: "rapt_session",
  };

  // Rate limit store for mock Redis
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  return { mockDb, mockLucia, mockSessionService, rateLimitStore };
});

// Hoisted mocks - these are processed BEFORE any imports
vi.mock("@raptscallions/db", () => ({
  db: mockDb,
}));

// Mock @raptscallions/auth - use the hoisted mockSessionService directly
// This is a SINGLETON mock that persists across module reloads
vi.mock("@raptscallions/auth", () => {
  return {
    lucia: mockLucia,
    sessionService: mockSessionService,
    permissionMiddleware: async () => {
      // No-op for auth route tests
    },
  };
});

vi.mock("@node-rs/argon2", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
  verify: vi.fn(),
}));

// Mock ioredis with in-memory storage for rate limiting
const createMockRedisInstance = () => {
  const instance: Record<string, unknown> = {
    on: vi.fn(),
    quit: vi.fn(),
    defineCommand: vi.fn((name: string) => {
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
              rateLimitStore.set(key, { count: 1, resetAt: now + timeWindow });
              callback(null, [1, timeWindow, false]);
            } else {
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

describe("Authentication Guards", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Set up environment BEFORE any imports
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";

    // Create a custom test server with injected sessionService
    const fastify = await import("fastify");
    const cors = await import("@fastify/cors");
    const cookie = await import("@fastify/cookie");
    const { sessionMiddleware } = await import("../../middleware/session.middleware.js");
    const { authMiddleware } = await import("../../middleware/auth.middleware.js");
    const { rateLimitMiddleware } = await import("../../middleware/rate-limit.middleware.js");

    app = fastify.default({
      logger: false,
      requestIdHeader: "x-request-id",
      trustProxy: true,
    });

    // Register CORS
    await app.register(cors.default, {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    });

    // Register cookie plugin
    await app.register(cookie.default, {
      secret: process.env.SESSION_SECRET,
    });

    // Register session middleware WITH INJECTED MOCK
    await app.register(sessionMiddleware, {
      sessionService: mockSessionService as SessionServiceLike,
    });

    // Register rate limiting
    await app.register(rateLimitMiddleware);

    // Register auth middleware (provides requireAuth decorator)
    await app.register(authMiddleware);

    // Register permission middleware (no-op for tests)
    await app.register(async () => {});

    // Register test routes for guard testing
    await app.register(async (testRoutes) => {
      testRoutes.get("/test/protected", {
        preHandler: [app.requireAuth],
      }, async () => {
        return { message: "protected" };
      });

      testRoutes.get("/test/active-only", {
        preHandler: [app.requireAuth, app.requireActiveUser],
      }, async () => {
        return { message: "active" };
      });

      testRoutes.get("/test/teacher-only", {
        preHandler: [app.requireAuth, app.requireRole("teacher")],
      }, async () => {
        return { message: "teacher" };
      });

      testRoutes.get("/test/admin-or-teacher", {
        preHandler: [app.requireAuth, app.requireRole("group_admin", "teacher")],
      }, async () => {
        return { message: "admin-or-teacher" };
      });

      testRoutes.get("/test/group/:groupId/members", {
        preHandler: [app.requireAuth, app.requireGroupFromParams()],
      }, async () => {
        return { message: "group-members" };
      });

      testRoutes.get("/test/group/:groupId/manage", {
        preHandler: [
          app.requireAuth,
          app.requireGroupFromParams(),
          app.requireGroupRole("group_admin", "teacher"),
        ],
      }, async () => {
        return { message: "group-manage" };
      });
    });

    // Wait for app to be ready
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitStore.clear();
  });

  describe("requireAuth", () => {
    it("should return 401 without session", async () => {
      // Arrange
      mockSessionService.validate.mockResolvedValue({
        session: null,
        user: null,
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/protected",
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should pass with valid session", async () => {
      // Arrange
      const userId = "user-123";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "test@example.com", name: "Test", status: "active" },
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/protected",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("protected");
    });
  });

  describe("requireActiveUser", () => {
    it("should return 401 for suspended user", async () => {
      // Arrange
      const suspendedUser = {
        id: "user-123",
        email: "suspended@example.com",
        name: "Suspended User",
        status: "suspended",
      };

      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId: suspendedUser.id, expiresAt: new Date(), fresh: false },
        user: suspendedUser,
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/active-only",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should pass for active user", async () => {
      // Arrange
      const activeUser = {
        id: "user-123",
        email: "active@example.com",
        name: "Active User",
        status: "active",
      };

      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId: activeUser.id, expiresAt: new Date(), fresh: false },
        user: activeUser,
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/active-only",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("active");
    });
  });

  describe("requireRole", () => {
    it("should return 403 if user lacks required role", async () => {
      // Arrange
      const userId = "user-123";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "student@example.com", name: "Student", status: "active" },
      });

      // User is a student, not a teacher
      mockDb.query.groupMembers.findMany.mockResolvedValue([
        {
          id: "membership-123",
          userId: userId,
          groupId: "group-123",
          role: "student",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/teacher-only",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should pass if user has required role in any group", async () => {
      // Arrange
      const userId = "user-123";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "teacher@example.com", name: "Teacher", status: "active" },
      });

      mockDb.query.groupMembers.findMany.mockResolvedValue([
        {
          id: "membership-123",
          userId: userId,
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/teacher-only",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("teacher");
    });

    it("should pass if user has any of multiple allowed roles", async () => {
      // Arrange
      const userId = "user-123";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "teacher@example.com", name: "Teacher", status: "active" },
      });

      mockDb.query.groupMembers.findMany.mockResolvedValue([
        {
          id: "membership-123",
          userId: userId,
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/admin-or-teacher",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("admin-or-teacher");
    });
  });

  describe("requireGroupFromParams", () => {
    it("should return 403 if user is not member of group", async () => {
      // Arrange
      const userId = "user-123";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "test@example.com", name: "Test", status: "active" },
      });

      mockDb.query.groupMembers.findFirst.mockResolvedValue(undefined); // No membership

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/group/group-456/members",
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should pass if user is member of group", async () => {
      // Arrange
      const userId = "user-123";
      const groupId = "group-456";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "test@example.com", name: "Test", status: "active" },
      });

      mockDb.query.groupMembers.findFirst.mockResolvedValue({
        id: "membership-123",
        userId: userId,
        groupId: groupId,
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: `/test/group/${groupId}/members`,
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("group-members");
    });
  });

  describe("requireGroupRole", () => {
    it("should return 403 if user has wrong role in group", async () => {
      // Arrange
      const userId = "user-123";
      const groupId = "group-456";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "student@example.com", name: "Student", status: "active" },
      });

      // User is a student in this group
      mockDb.query.groupMembers.findFirst.mockResolvedValue({
        id: "membership-123",
        userId: userId,
        groupId: groupId,
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: `/test/group/${groupId}/manage`,
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should pass if user has correct role in specific group", async () => {
      // Arrange
      const userId = "user-123";
      const groupId = "group-456";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "teacher@example.com", name: "Teacher", status: "active" },
      });

      // User is a teacher in this group
      mockDb.query.groupMembers.findFirst.mockResolvedValue({
        id: "membership-123",
        userId: userId,
        groupId: groupId,
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: `/test/group/${groupId}/manage`,
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("group-manage");
    });
  });

  describe("Guard Composition", () => {
    it("should correctly chain multiple guards", async () => {
      // Arrange
      const userId = "user-123";
      const groupId = "group-456";
      mockSessionService.validate.mockResolvedValue({
        session: { id: "session-123", userId, expiresAt: new Date(), fresh: false },
        user: { id: userId, email: "admin@example.com", name: "Admin", status: "active" },
      });

      mockDb.query.groupMembers.findFirst.mockResolvedValue({
        id: "membership-123",
        userId: userId,
        groupId: groupId,
        role: "group_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act - Test route with: requireAuth + requireGroupFromParams + requireGroupRole
      const response = await app.inject({
        method: "GET",
        url: `/test/group/${groupId}/manage`,
        cookies: { rapt_session: "session-123" },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe("group-manage");
    });

    it("should fail at first failed guard", async () => {
      // Arrange - no session provided
      mockSessionService.validate.mockResolvedValue({
        session: null,
        user: null,
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/test/group/group-456/manage",
      });

      // Assert - should fail at requireAuth (first guard)
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe("UNAUTHORIZED");
      // requireGroupFromParams should not have been called
      expect(mockDb.query.groupMembers.findFirst).not.toHaveBeenCalled();
    });
  });
});
