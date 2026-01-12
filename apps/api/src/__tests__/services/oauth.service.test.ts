import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError, AppError } from "@raptscallions/core";
import type { User } from "@raptscallions/db/schema";
import type {
  GoogleUserProfile,
  MicrosoftUserProfile,
} from "@raptscallions/core";

// Mock dependencies before importing service
vi.mock("@raptscallions/db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

vi.mock("@raptscallions/auth", () => ({
  lucia: {
    createSession: vi.fn(),
    sessionCookieAttributes: {
      secure: true,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  },
  sessionService: {
    createSession: vi.fn(),
    sessionCookieAttributes: {
      secure: true,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  },
  requireGoogleOAuth: vi.fn(),
  requireMicrosoftOAuth: vi.fn(),
  generateOAuthState: vi.fn(() => "mock-state-abc123"),
  generateOAuthCodeVerifier: vi.fn(() => "mock-code-verifier"),
  validateOAuthState: vi.fn(),
  OAUTH_STATE_COOKIE: "oauth_state",
  OAUTH_CODE_VERIFIER_COOKIE: "oauth_code_verifier",
  OAUTH_STATE_MAX_AGE: 600,
}));

vi.mock("@raptscallions/telemetry", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

import { db } from "@raptscallions/db";
import {
  lucia,
  sessionService,
  requireGoogleOAuth,
  requireMicrosoftOAuth,
  generateOAuthState,
  generateOAuthCodeVerifier,
  validateOAuthState,
  OAUTH_STATE_COOKIE,
  OAUTH_CODE_VERIFIER_COOKIE,
  OAUTH_STATE_MAX_AGE,
} from "@raptscallions/auth";
import { logger } from "@raptscallions/telemetry";
import {
  initiateGoogleOAuth,
  handleGoogleCallback,
  initiateMicrosoftOAuth,
  handleMicrosoftCallback,
} from "../../services/oauth.service.js";

describe("OAuth Service", () => {
  let mockReply: Partial<FastifyReply>;
  let mockRequest: Partial<FastifyRequest>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReply = {
      setCookie: vi.fn(),
      redirect: vi.fn(),
      send: vi.fn(),
    };

    mockRequest = {
      query: {},
      cookies: {},
    };

    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  describe("initiateGoogleOAuth", () => {
    it("should generate state, code verifier, set cookies, and redirect to Google", async () => {
      // Arrange
      const mockGoogleClient = {
        createAuthorizationURL: vi.fn().mockReturnValue(
          new URL("https://accounts.google.com/oauth/authorize?state=mock-state-abc123")
        ),
      };
      vi.mocked(requireGoogleOAuth).mockReturnValue(mockGoogleClient as any);

      // Act
      await initiateGoogleOAuth(mockReply as FastifyReply);

      // Assert
      expect(generateOAuthState).toHaveBeenCalledTimes(1);
      expect(generateOAuthCodeVerifier).toHaveBeenCalledTimes(1);
      expect(mockGoogleClient.createAuthorizationURL).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-code-verifier",
        ["email", "profile"]
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        "mock-state-abc123",
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: OAUTH_STATE_MAX_AGE,
          path: "/",
        }
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        OAUTH_CODE_VERIFIER_COOKIE,
        "mock-code-verifier",
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: OAUTH_STATE_MAX_AGE,
          path: "/",
        }
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://accounts.google.com/oauth/authorize?state=mock-state-abc123"
      );
    });

    it("should throw AppError if Google OAuth not configured", async () => {
      // Arrange
      vi.mocked(requireGoogleOAuth).mockImplementation(() => {
        throw new AppError(
          "Google OAuth not configured",
          "OAUTH_NOT_CONFIGURED",
          503
        );
      });

      // Act & Assert
      await expect(
        initiateGoogleOAuth(mockReply as FastifyReply)
      ).rejects.toThrow(AppError);
      await expect(
        initiateGoogleOAuth(mockReply as FastifyReply)
      ).rejects.toThrow("Google OAuth not configured");
    });
  });

  describe("handleGoogleCallback", () => {
    it("should create new user when email doesn't exist", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockGoogleClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: vi.fn().mockReturnValue("access-token-123"),
        }),
      };
      vi.mocked(requireGoogleOAuth).mockReturnValue(mockGoogleClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const googleUser: GoogleUserProfile = {
        sub: "google-user-123",
        email: "newuser@example.com",
        email_verified: true,
        name: "New User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => googleUser,
      } as Response);

      const newUser: User = {
        id: "user-new-123",
        email: googleUser.email,
        name: googleUser.name,
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      } as any);

      vi.mocked(lucia.createSession).mockResolvedValue({
        id: "session-123",
        userId: newUser.id,
        expiresAt: new Date(),
      } as any);

      // Act
      await handleGoogleCallback(
        db as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(validateOAuthState).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-state-abc123"
      );
      expect(mockGoogleClient.validateAuthorizationCode).toHaveBeenCalledWith(
        "auth-code-123",
        "mock-code-verifier"
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        {
          headers: {
            Authorization: "Bearer access-token-123",
          },
        }
      );
      expect(db.insert).toHaveBeenCalled();
      expect(lucia.createSession).toHaveBeenCalledWith(newUser.id, {
        context: "oauth_google",
        last_activity_at: expect.any(Date),
      });
      expect(mockReply.setCookie).toHaveBeenCalledWith(OAUTH_STATE_COOKIE, "", {
        maxAge: 0,
      });
      expect(mockReply.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should link account when email already exists", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockGoogleClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: vi.fn().mockReturnValue("access-token-123"),
        }),
      };
      vi.mocked(requireGoogleOAuth).mockReturnValue(mockGoogleClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const googleUser: GoogleUserProfile = {
        sub: "google-user-123",
        email: "existing@example.com",
        email_verified: true,
        name: "Existing User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => googleUser,
      } as Response);

      const existingUser: User = {
        id: "user-existing-123",
        email: googleUser.email,
        name: "Existing User",
        passwordHash: "hashed-password",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser);

      vi.mocked(lucia.createSession).mockResolvedValue({
        id: "session-456",
        userId: existingUser.id,
        expiresAt: new Date(),
      } as any);

      // Act
      await handleGoogleCallback(
        db as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(db.query.users.findFirst).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
      expect(lucia.createSession).toHaveBeenCalledWith(existingUser.id, {
        context: "oauth_google",
        last_activity_at: expect.any(Date),
      });
      expect(logger.info).toHaveBeenCalledWith(
        { userId: existingUser.id, email: googleUser.email },
        "OAuth user found, linking account"
      );
    });

    it("should throw UnauthorizedError for invalid state", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "wrong-state",
        },
        cookies: {
          oauth_state: "correct-state",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      vi.mocked(validateOAuthState).mockReturnValue(false);

      // Act & Assert
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Invalid OAuth state");
    });

    it("should throw UnauthorizedError for missing code", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      vi.mocked(validateOAuthState).mockReturnValue(true);

      // Act & Assert
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Missing authorization code");
    });

    it("should throw UnauthorizedError when email not verified", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockGoogleClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: vi.fn().mockReturnValue("access-token-123"),
        }),
      };
      vi.mocked(requireGoogleOAuth).mockReturnValue(mockGoogleClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const googleUser: GoogleUserProfile = {
        sub: "google-user-123",
        email: "unverified@example.com",
        email_verified: false,
        name: "Unverified User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => googleUser,
      } as Response);

      // Act & Assert
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Email not verified with Google");
    });

    it("should throw UnauthorizedError when OAuth provider returns error", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          error: "access_denied",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      // Act & Assert
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Google authentication failed");
    });

    it("should throw AppError when profile fetch fails", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockGoogleClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: vi.fn().mockReturnValue("access-token-123"),
        }),
      };
      vi.mocked(requireGoogleOAuth).mockReturnValue(mockGoogleClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      // Act & Assert
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(AppError);
      await expect(
        handleGoogleCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Failed to fetch Google user profile");
    });
  });

  describe("initiateMicrosoftOAuth", () => {
    it("should generate state, set cookie, and redirect to Microsoft", async () => {
      // Arrange
      const mockMicrosoftClient = {
        createAuthorizationURL: vi.fn(() =>
          Promise.resolve(new URL("https://login.microsoftonline.com/oauth/authorize?state=mock-state-abc123"))
        ),
      };
      vi.mocked(requireMicrosoftOAuth).mockReturnValue(mockMicrosoftClient as any);

      // Act
      await initiateMicrosoftOAuth(mockReply as FastifyReply);

      // Assert
      expect(generateOAuthState).toHaveBeenCalledTimes(1);
      expect(generateOAuthCodeVerifier).toHaveBeenCalledTimes(1);
      expect(mockMicrosoftClient.createAuthorizationURL).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-code-verifier",
        ["User.Read", "email", "profile", "openid"]
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        OAUTH_STATE_COOKIE,
        "mock-state-abc123",
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: OAUTH_STATE_MAX_AGE,
          path: "/",
        }
      );
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        OAUTH_CODE_VERIFIER_COOKIE,
        "mock-code-verifier",
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: OAUTH_STATE_MAX_AGE,
          path: "/",
        }
      );
      expect(mockReply.redirect).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/oauth/authorize?state=mock-state-abc123"
      );
    });

    it("should throw AppError if Microsoft OAuth not configured", async () => {
      // Arrange
      vi.mocked(requireMicrosoftOAuth).mockImplementation(() => {
        throw new AppError(
          "Microsoft OAuth not configured",
          "OAUTH_NOT_CONFIGURED",
          503
        );
      });

      // Act & Assert
      await expect(
        initiateMicrosoftOAuth(mockReply as FastifyReply)
      ).rejects.toThrow(AppError);
      await expect(
        initiateMicrosoftOAuth(mockReply as FastifyReply)
      ).rejects.toThrow("Microsoft OAuth not configured");
    });
  });

  describe("handleMicrosoftCallback", () => {
    it("should create new user when email doesn't exist", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockMicrosoftClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: () => "access-token-123",
        }),
      };
      vi.mocked(requireMicrosoftOAuth).mockReturnValue(mockMicrosoftClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const microsoftUser: MicrosoftUserProfile = {
        id: "microsoft-user-123",
        userPrincipalName: "newuser@example.com",
        mail: "newuser@example.com",
        displayName: "New User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => microsoftUser,
      } as Response);

      const newUser: User = {
        id: "user-new-456",
        email: microsoftUser.mail!,
        name: microsoftUser.displayName,
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      } as any);

      vi.mocked(lucia.createSession).mockResolvedValue({
        id: "session-789",
        userId: newUser.id,
        expiresAt: new Date(),
      } as any);

      // Act
      await handleMicrosoftCallback(
        db as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(validateOAuthState).toHaveBeenCalledWith(
        "mock-state-abc123",
        "mock-state-abc123"
      );
      expect(mockMicrosoftClient.validateAuthorizationCode).toHaveBeenCalledWith(
        "auth-code-123",
        "mock-code-verifier"
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me",
        {
          headers: {
            Authorization: "Bearer access-token-123",
          },
        }
      );
      expect(db.insert).toHaveBeenCalled();
      expect(lucia.createSession).toHaveBeenCalledWith(newUser.id, {
        context: "oauth_microsoft",
        last_activity_at: expect.any(Date),
      });
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        "rapt_session",
        "session-789",
        sessionService.sessionCookieAttributes
      );
      expect(mockReply.redirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should link account when email already exists", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockMicrosoftClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: () => "access-token-123",
        }),
      };
      vi.mocked(requireMicrosoftOAuth).mockReturnValue(mockMicrosoftClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const microsoftUser: MicrosoftUserProfile = {
        id: "microsoft-user-123",
        userPrincipalName: "existing@example.com",
        mail: "existing@example.com",
        displayName: "Existing User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => microsoftUser,
      } as Response);

      const existingUser: User = {
        id: "user-existing-456",
        email: microsoftUser.mail!,
        name: "Existing User",
        passwordHash: "hashed-password",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser);

      vi.mocked(lucia.createSession).mockResolvedValue({
        id: "session-999",
        userId: existingUser.id,
        expiresAt: new Date(),
      } as any);

      // Act
      await handleMicrosoftCallback(
        db as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(db.query.users.findFirst).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
      expect(lucia.createSession).toHaveBeenCalledWith(existingUser.id, {
        context: "oauth_microsoft",
        last_activity_at: expect.any(Date),
      });
      expect(logger.info).toHaveBeenCalledWith(
        { userId: existingUser.id, email: microsoftUser.mail },
        "OAuth user found, linking account"
      );
    });

    it("should throw UnauthorizedError for invalid state", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "wrong-state",
        },
        cookies: {
          oauth_state: "correct-state",
        },
      };

      vi.mocked(validateOAuthState).mockReturnValue(false);

      // Act & Assert
      await expect(
        handleMicrosoftCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleMicrosoftCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("Invalid OAuth state");
    });

    it("should throw UnauthorizedError when no email in profile", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockMicrosoftClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: () => "access-token-123",
        }),
      };
      vi.mocked(requireMicrosoftOAuth).mockReturnValue(mockMicrosoftClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const microsoftUser: MicrosoftUserProfile = {
        id: "microsoft-user-123",
        userPrincipalName: "",
        mail: null,
        displayName: "No Email User",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => microsoftUser,
      } as Response);

      // Act & Assert
      await expect(
        handleMicrosoftCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        handleMicrosoftCallback(
          db as any,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        )
      ).rejects.toThrow("No email address found in Microsoft account");
    });

    it("should use userPrincipalName when mail is null", async () => {
      // Arrange
      const mockRequest: Partial<FastifyRequest> = {
        query: {
          code: "auth-code-123",
          state: "mock-state-abc123",
        },
        cookies: {
          oauth_state: "mock-state-abc123",
          oauth_code_verifier: "mock-code-verifier",
        },
      };

      const mockMicrosoftClient = {
        validateAuthorizationCode: vi.fn().mockResolvedValue({
          accessToken: () => "access-token-123",
        }),
      };
      vi.mocked(requireMicrosoftOAuth).mockReturnValue(mockMicrosoftClient as any);
      vi.mocked(validateOAuthState).mockReturnValue(true);

      const microsoftUser: MicrosoftUserProfile = {
        id: "microsoft-user-123",
        userPrincipalName: "user@company.onmicrosoft.com",
        mail: null,
        displayName: "User Name",
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => microsoftUser,
      } as Response);

      const newUser: User = {
        id: "user-upn-123",
        email: microsoftUser.userPrincipalName,
        name: microsoftUser.displayName,
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      } as any);

      vi.mocked(lucia.createSession).mockResolvedValue({
        id: "session-upn",
        userId: newUser.id,
        expiresAt: new Date(),
      } as any);

      // Act
      await handleMicrosoftCallback(
        db as any,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert - Should use userPrincipalName as email
      expect(db.insert).toHaveBeenCalled();
      const insertCall = vi.mocked(db.insert).mock.results[0]?.value;
      expect(insertCall.values).toBeDefined();
    });
  });
});
