import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  type Mock,
} from "vitest";
import type { FastifyInstance } from "fastify";

// Rate limit store for mock Redis - needs to be accessible for reset in beforeEach
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

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

describe("OAuth Routes Integration", () => {
  let app: FastifyInstance;
  let mockDb: {
    query: {
      users: {
        findFirst: Mock;
      };
    };
    insert: Mock;
  };
  let mockLucia: {
    createSession: Mock;
    sessionCookieAttributes: {
      secure: boolean;
      httpOnly: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    };
  };
  let mockGoogleClient: {
    createAuthorizationURL: Mock;
    validateAuthorizationCode: Mock;
  };
  let mockMicrosoftClient: {
    createAuthorizationURL: Mock;
    validateAuthorizationCode: Mock;
  };

  beforeAll(async () => {
    // Set up environment
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CORS_ORIGINS = "http://localhost:5173";
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
    process.env.GOOGLE_CLIENT_ID = "test-google-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    process.env.MICROSOFT_CLIENT_ID = "test-microsoft-id";
    process.env.MICROSOFT_CLIENT_SECRET = "test-microsoft-secret";
    process.env.OAUTH_REDIRECT_BASE = "http://localhost:3000";

    // Mock database
    mockDb = {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
    };

    // Mock Lucia
    mockLucia = {
      createSession: vi.fn(),
      sessionCookieAttributes: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    };

    // Mock OAuth clients with PKCE-compatible signatures
    const mockGoogleURL = new URL("https://accounts.google.com/o/oauth2/v2/auth?state=mock-state-abc123");
    mockGoogleClient = {
      // Google createAuthorizationURL returns URL directly (synchronous in Arctic v3)
      createAuthorizationURL: vi.fn().mockReturnValue(mockGoogleURL),
      validateAuthorizationCode: vi.fn().mockResolvedValue({
        accessToken: () => "mock-access-token",
        accessTokenExpiresAt: () => new Date(Date.now() + 3600000),
        refreshToken: () => null,
        idToken: () => null,
      }),
    };

    mockMicrosoftClient = {
      // Microsoft returns Promise<URL> (asynchronous)
      createAuthorizationURL: vi.fn().mockResolvedValue(
        new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=mock-state-abc123")
      ),
      validateAuthorizationCode: vi.fn().mockResolvedValue({
        accessToken: () => "mock-access-token",
        accessTokenExpiresAt: () => new Date(Date.now() + 3600000),
        refreshToken: () => null,
        idToken: () => null,
      }),
    };

    // Mock @raptscallions/db
    vi.doMock("@raptscallions/db", () => ({
      db: mockDb,
    }));

    // Mock @raptscallions/auth with all exports
    vi.doMock("@raptscallions/auth", () => ({
      lucia: mockLucia,
      sessionService: {
        sessionCookieAttributes: mockLucia.sessionCookieAttributes,
        sessionCookieName: "rapt_session",
        validate: vi.fn().mockResolvedValue({ session: null, user: null }),
        createBlankSessionCookie: vi.fn().mockReturnValue({
          name: "rapt_session",
          value: "",
          attributes: {},
        }),
      },
      requireGoogleOAuth: vi.fn(() => mockGoogleClient),
      requireMicrosoftOAuth: vi.fn(() => mockMicrosoftClient),
      generateOAuthState: vi.fn(() => "mock-state-abc123"),
      generateOAuthCodeVerifier: vi.fn(() => "mock-code-verifier-123"),
      validateOAuthState: vi.fn((received, stored) => received === stored),
      OAUTH_STATE_COOKIE: "oauth_state",
      OAUTH_CODE_VERIFIER_COOKIE: "oauth_code_verifier",
      OAUTH_STATE_MAX_AGE: 600,
      // Permission middleware - no-op for OAuth route tests
      permissionMiddleware: async () => {
        // No-op - OAuth routes don't need permission checks
      },
    }));


    // Mock global fetch
    global.fetch = vi.fn();

    // Create server
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

  describe("GET /auth/google", () => {
    it("should set oauth_state cookie and redirect to Google", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/google",
      });

      // Assert
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain("accounts.google.com");
      expect(response.headers.location).toContain("state=mock-state-abc123");

      const cookies = response.cookies;
      const stateCookie = cookies.find((c) => c.name === "oauth_state");
      expect(stateCookie).toBeDefined();
      expect(stateCookie?.value).toBe("mock-state-abc123");
      expect(stateCookie?.httpOnly).toBe(true);
      expect(stateCookie?.sameSite).toBe("Lax");
      expect(stateCookie?.maxAge).toBe(600);
    });

    it("should call Google client with correct scopes", async () => {
      // Arrange
      mockGoogleClient.createAuthorizationURL.mockResolvedValue(
        new URL("https://accounts.google.com/o/oauth2/v2/auth")
      );

      // Act
      await app.inject({
        method: "GET",
        url: "/auth/google",
      });

      // Assert
      expect(mockGoogleClient.createAuthorizationURL).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-code-verifier-123",
        ["email", "profile"]
      );
    });
  });

  describe("GET /auth/google/callback", () => {
    it("should return 401 for invalid state", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/google/callback?code=test-code&state=wrong-state",
        cookies: {
          oauth_state: "correct-state",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 for missing code", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/google/callback?state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when OAuth provider returns error", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/google/callback?error=access_denied&state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should create session and redirect to dashboard on success", async () => {
      // Arrange
      mockGoogleClient.validateAuthorizationCode.mockResolvedValue({
        accessToken: () => "access-token-123",
        accessTokenExpiresAt: () => new Date(Date.now() + 3600000),
        refreshToken: () => null,
        idToken: () => null,
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "google-123",
          email: "test@example.com",
          email_verified: true,
          name: "Test User",
        }),
      } as Response);

      const newUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      });

      mockLucia.createSession.mockResolvedValue({
        id: "session-123",
        userId: newUser.id,
        expiresAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/google/callback?code=test-code&state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/dashboard");

      const cookies = response.cookies;
      const sessionCookie = cookies.find((c) => c.name === "rapt_session");
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBe("session-123");

      const clearedStateCookie = cookies.find((c) => c.name === "oauth_state");
      expect(clearedStateCookie).toBeDefined();
      expect(clearedStateCookie?.value).toBe("");
      expect(clearedStateCookie?.maxAge).toBe(0);
    });
  });

  describe("GET /auth/microsoft", () => {
    it("should set oauth_state cookie and redirect to Microsoft", async () => {
      // Arrange
      mockMicrosoftClient.createAuthorizationURL.mockResolvedValue(
        new URL(
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?state=mock-state-abc123"
        )
      );

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft",
      });

      // Assert
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain("login.microsoftonline.com");
      expect(response.headers.location).toContain("state=mock-state-abc123");

      const cookies = response.cookies;
      const stateCookie = cookies.find((c) => c.name === "oauth_state");
      expect(stateCookie).toBeDefined();
      expect(stateCookie?.value).toBe("mock-state-abc123");
      expect(stateCookie?.httpOnly).toBe(true);
      expect(stateCookie?.sameSite).toBe("Lax");
      expect(stateCookie?.maxAge).toBe(600);
    });

    it("should call Microsoft client with correct scopes", async () => {
      // Arrange
      mockMicrosoftClient.createAuthorizationURL.mockResolvedValue(
        new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
      );

      // Act
      await app.inject({
        method: "GET",
        url: "/auth/microsoft",
      });

      // Assert
      expect(mockMicrosoftClient.createAuthorizationURL).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-code-verifier-123",
        ["User.Read", "email", "profile", "openid"]
      );
    });
  });

  describe("GET /auth/microsoft/callback", () => {
    it("should return 401 for invalid state", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft/callback?code=test-code&state=wrong-state",
        cookies: {
          oauth_state: "correct-state",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 for missing code", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft/callback?state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 when OAuth provider returns error", async () => {
      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft/callback?error=access_denied&state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("should create session and redirect to dashboard on success", async () => {
      // Arrange
      mockMicrosoftClient.validateAuthorizationCode.mockResolvedValue({
        accessToken: () => "access-token-456",
        accessTokenExpiresAt: () => new Date(Date.now() + 3600000),
        refreshToken: () => null,
        idToken: () => null,
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "microsoft-123",
          userPrincipalName: "test@company.onmicrosoft.com",
          mail: "test@company.com",
          displayName: "Test User",
        }),
      } as Response);

      const newUser = {
        id: "user-456",
        email: "test@company.com",
        name: "Test User",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      });

      mockLucia.createSession.mockResolvedValue({
        id: "session-456",
        userId: newUser.id,
        expiresAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft/callback?code=test-code&state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/dashboard");

      const cookies = response.cookies;
      const sessionCookie = cookies.find((c) => c.name === "rapt_session");
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBe("session-456");

      const clearedStateCookie = cookies.find((c) => c.name === "oauth_state");
      expect(clearedStateCookie).toBeDefined();
      expect(clearedStateCookie?.value).toBe("");
      expect(clearedStateCookie?.maxAge).toBe(0);
    });

    it("should link to existing account when email exists", async () => {
      // Arrange
      mockMicrosoftClient.validateAuthorizationCode.mockResolvedValue({
        accessToken: () => "access-token-789",
        accessTokenExpiresAt: () => new Date(Date.now() + 3600000),
        refreshToken: () => null,
        idToken: () => null,
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "microsoft-789",
          userPrincipalName: "existing@company.onmicrosoft.com",
          mail: "existing@company.com",
          displayName: "Existing User",
        }),
      } as Response);

      const existingUser = {
        id: "user-existing",
        email: "existing@company.com",
        name: "Existing User",
        passwordHash: "hashed-password",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);

      mockLucia.createSession.mockResolvedValue({
        id: "session-existing",
        userId: existingUser.id,
        expiresAt: new Date(),
      });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/auth/microsoft/callback?code=test-code&state=mock-state-abc123",
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier-123",
        },
      });

      // Assert
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe("/dashboard");
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockLucia.createSession).toHaveBeenCalledWith(existingUser.id, {
        context: "oauth_microsoft",
        last_activity_at: expect.any(Date),
      });
    });
  });
});
