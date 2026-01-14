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
const { mockDb, mockLucia, rateLimitStore } = vi.hoisted(() => {
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

  return { mockDb, mockLucia, rateLimitStore };
});

// Hoisted mocks - these are processed BEFORE any imports
vi.mock("@raptscallions/db", () => ({
  db: mockDb,
}));

// Mock @raptscallions/auth to export mocked lucia
// This is the key - we mock the auth package to use our mocked lucia
vi.mock("@raptscallions/auth", () => {
  // Create a mock SessionService that uses mockLucia
  const sessionService = {
    sessionCookieName: "rapt_session",
    sessionCookieAttributes: {
      secure: false,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
    validate: (sessionId: string) => mockLucia.validateSession(sessionId),
    create: (userId: string, context = "unknown") => mockLucia.createSession(userId, { context, last_activity_at: new Date() }),
    invalidate: (sessionId: string) => mockLucia.invalidateSession(sessionId),
    invalidateUserSessions: (userId: string) => mockLucia.invalidateUserSessions(userId),
    createBlankSessionCookie: () => mockLucia.createBlankSessionCookie(),
  };

  return {
    lucia: mockLucia,
    sessionService,
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
// @fastify/rate-limit uses a Lua script via defineCommand
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

describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Reset module cache to ensure our mocks are used
    vi.resetModules();

    // Set up environment
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";

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
    rateLimitStore.clear(); // Reset rate limit counters between tests
  });

  describe("POST /auth/register", () => {
    it("should register new user and return 201 with session cookie", async () => {
      // Arrange
      const newUser = {
        email: "newuser@example.com",
        name: "New User",
        password: "password123",
      };

      const createdUser = {
        id: "user-123",
        email: newUser.email,
        name: newUser.name,
        passwordHash: "hashed-password",
        status: "pending_verification",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });
      mockLucia.createSession.mockResolvedValue({
        id: "session-123",
        userId: createdUser.id,
        expiresAt: new Date(),
      });
      mockLucia.createSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "session-123",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: newUser,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toEqual({
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      });
      expect(response.cookies).toHaveLength(1);
      expect(response.cookies[0]).toMatchObject({
        name: "rapt_session",
        value: "session-123",
      });
    });

    it("should return 409 for duplicate email", async () => {
      // Arrange
      const duplicateUser = {
        email: "existing@example.com",
        name: "Test User",
        password: "password123",
      };

      mockDb.query.users.findFirst.mockResolvedValue({
        id: "existing-user",
        email: duplicateUser.email,
        name: "Existing User",
        passwordHash: "hash",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: duplicateUser,
      });

      // Assert
      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("CONFLICT");
    });

    it("should return 400 for invalid email", async () => {
      // Arrange
      const invalidUser = {
        email: "not-an-email",
        name: "Test User",
        password: "password123",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: invalidUser,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      // Fastify returns FST_ERR_VALIDATION, our error handler returns VALIDATION_ERROR
      expect(body.code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
    });

    it("should return 400 for short password", async () => {
      // Arrange
      const invalidUser = {
        email: "test@example.com",
        name: "Test User",
        password: "short",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: invalidUser,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
    });

    it("should return 400 for missing name", async () => {
      // Arrange
      const invalidUser = {
        email: "test@example.com",
        password: "password123",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: invalidUser,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
    });

    it("should return 400 for empty name", async () => {
      // Arrange
      const invalidUser = {
        email: "test@example.com",
        name: "",
        password: "password123",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: invalidUser,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
    });
  });

  describe("POST /auth/login", () => {
    it("should login user and set session cookie with 200", async () => {
      // Arrange
      const loginData = {
        email: "test@example.com",
        password: "password123",
      };

      const existingUser = {
        id: "user-123",
        email: loginData.email,
        name: "Test User",
        passwordHash: "hashed-password",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);

      // Import verify mock
      const { verify } = await import("@node-rs/argon2");
      vi.mocked(verify).mockResolvedValue(true);

      mockLucia.createSession.mockResolvedValue({
        id: "session-456",
        userId: existingUser.id,
        expiresAt: new Date(),
      });
      mockLucia.createSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "session-456",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: loginData,
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual({
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
      });
      expect(response.cookies).toHaveLength(1);
      expect(response.cookies[0]).toMatchObject({
        name: "rapt_session",
        value: "session-456",
      });
    });

    it("should return 401 for invalid email", async () => {
      // Arrange
      const loginData = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      mockDb.query.users.findFirst.mockResolvedValue(undefined);

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: loginData,
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 for invalid password", async () => {
      // Arrange
      const loginData = {
        email: "test@example.com",
        password: "wrong-password",
      };

      const existingUser = {
        id: "user-123",
        email: loginData.email,
        name: "Test User",
        passwordHash: "hashed-password",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);

      // Import verify mock
      const { verify } = await import("@node-rs/argon2");
      vi.mocked(verify).mockResolvedValue(false);

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: loginData,
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 for user without password hash (OAuth user)", async () => {
      // Arrange
      const loginData = {
        email: "oauth@example.com",
        password: "password123",
      };

      const oauthUser = {
        id: "user-123",
        email: loginData.email,
        name: "OAuth User",
        passwordHash: null, // OAuth user
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(oauthUser);

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: loginData,
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 for invalid email format", async () => {
      // Arrange
      const loginData = {
        email: "not-an-email",
        password: "password123",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: loginData,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toMatch(/VALIDATION|FST_ERR_VALIDATION/);
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout user with valid session and clear cookie with 204", async () => {
      // Arrange
      const sessionId = "session-123";
      const userId = "user-123";

      // Mock sessionService.validate to return a valid session
      // This is used by the session middleware to attach user/session to request
      mockLucia.validateSession.mockResolvedValue({
        session: {
          id: sessionId,
          userId: userId,
          expiresAt: new Date(),
          fresh: false,
        },
        user: {
          id: userId,
          email: "test@example.com",
          name: "Test User",
          status: "active",
        },
      });
      mockLucia.invalidateSession.mockResolvedValue(undefined);
      mockLucia.createBlankSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        cookies: {
          rapt_session: sessionId,
        },
      });

      // Assert
      expect(response.statusCode).toBe(204);
      // Check cookie is cleared (may have multiple cookies set)
      const blankCookie = response.cookies.find(
        (c) => c.name === "rapt_session" && c.value === ""
      );
      expect(blankCookie).toBeDefined();
    });

    it("should return 204 and clear cookie even without session cookie", async () => {
      // Arrange - no session cookie sent
      mockLucia.createBlankSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
      });

      // Assert - logout succeeds even without session
      // This is intentional UX: user can always "logout" to clear any stale state
      expect(response.statusCode).toBe(204);
      const blankCookie = response.cookies.find(
        (c) => c.name === "rapt_session" && c.value === ""
      );
      expect(blankCookie).toBeDefined();
    });

    it("should return 204 and clear cookie for invalid/expired session", async () => {
      // Arrange - session validation returns null (invalid/expired)
      mockLucia.validateSession.mockResolvedValue({
        session: null,
        user: null,
      });
      mockLucia.createBlankSessionCookie.mockReturnValue({
        name: "rapt_session",
        value: "",
        attributes: {},
      });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        cookies: {
          rapt_session: "invalid-session",
        },
      });

      // Assert - logout succeeds even with invalid session
      // Cookie is cleared so user gets a clean state
      expect(response.statusCode).toBe(204);
      const blankCookie = response.cookies.find(
        (c) => c.name === "rapt_session" && c.value === ""
      );
      expect(blankCookie).toBeDefined();
    });
  });

  // AC4: Session Management Tests
  describe("Session Management", () => {
    describe("Session Creation", () => {
      it("should create session with 30-day expiration on login", async () => {
        // Arrange
        const loginData = {
          email: "test@example.com",
          password: "password123",
        };

        const existingUser = {
          id: "user-123",
          email: loginData.email,
          name: "Test User",
          passwordHash: "hashed-password",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        mockDb.query.users.findFirst.mockResolvedValue(existingUser);
        const { verify } = await import("@node-rs/argon2");
        vi.mocked(verify).mockResolvedValue(true);
        mockLucia.createSession.mockResolvedValue({
          id: "session-123",
          userId: existingUser.id,
          expiresAt: thirtyDaysFromNow,
        });
        mockLucia.createSessionCookie.mockReturnValue({
          name: "rapt_session",
          value: "session-123",
          attributes: { maxAge: 60 * 60 * 24 * 30 },
        });

        // Act
        const response = await app.inject({
          method: "POST",
          url: "/auth/login",
          payload: loginData,
        });

        // Assert
        expect(response.statusCode).toBe(200);
        expect(mockLucia.createSession).toHaveBeenCalledWith(
          existingUser.id,
          expect.any(Object)
        );
        const cookie = response.cookies.find((c) => c.name === "rapt_session");
        expect(cookie?.maxAge).toBe(60 * 60 * 24 * 30); // 30 days in seconds
      });
    });

    describe("Session Validation", () => {
      it("should attach user and session to request for valid session", async () => {
        // Arrange
        const sessionId = "valid-session";
        const userId = "user-123";

        mockLucia.validateSession.mockResolvedValue({
          session: {
            id: sessionId,
            userId: userId,
            expiresAt: new Date(Date.now() + 1000000),
            fresh: false,
          },
          user: {
            id: userId,
            email: "test@example.com",
            name: "Test User",
            status: "active",
          },
        });

        // Act - attempt to access protected endpoint
        const response = await app.inject({
          method: "POST",
          url: "/auth/logout", // Requires session
          cookies: { rapt_session: sessionId },
        });

        // Assert - should succeed (not 401)
        expect(response.statusCode).toBe(204);
        expect(mockLucia.validateSession).toHaveBeenCalledWith(sessionId);
      });

      it("should clear cookie for expired session", async () => {
        // Arrange
        mockLucia.validateSession.mockResolvedValue({
          session: null,
          user: null,
        });
        mockLucia.createBlankSessionCookie.mockReturnValue({
          name: "rapt_session",
          value: "",
          attributes: {},
        });

        // Act
        const response = await app.inject({
          method: "POST",
          url: "/auth/logout",
          cookies: { rapt_session: "expired-session" },
        });

        // Assert
        expect(response.statusCode).toBe(204);
        const blankCookie = response.cookies.find(
          (c) => c.name === "rapt_session" && c.value === ""
        );
        expect(blankCookie).toBeDefined();
      });
    });

    describe("Session Invalidation", () => {
      it("should delete session from database on logout", async () => {
        // Arrange
        const sessionId = "session-to-delete";
        const userId = "user-123";

        mockLucia.validateSession.mockResolvedValue({
          session: { id: sessionId, userId, expiresAt: new Date(), fresh: false },
          user: { id: userId, email: "test@example.com", name: "Test", status: "active" },
        });
        mockLucia.invalidateSession.mockResolvedValue(undefined);
        mockLucia.createBlankSessionCookie.mockReturnValue({
          name: "rapt_session",
          value: "",
          attributes: {},
        });

        // Act
        const response = await app.inject({
          method: "POST",
          url: "/auth/logout",
          cookies: { rapt_session: sessionId },
        });

        // Assert
        expect(response.statusCode).toBe(204);
        expect(mockLucia.invalidateSession).toHaveBeenCalledWith(sessionId);
      });
    });
  });
});
