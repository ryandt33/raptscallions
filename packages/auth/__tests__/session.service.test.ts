import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionService } from "../src/session.service.js";
import { lucia } from "../src/lucia.js";
import { UnauthorizedError } from "@raptscallions/core/errors";

// Mock lucia module
vi.mock("../src/lucia.js", () => ({
  lucia: {
    validateSession: vi.fn(),
    createSession: vi.fn(),
    invalidateSession: vi.fn(),
    invalidateUserSessions: vi.fn(),
    createBlankSessionCookie: vi.fn(),
    sessionCookieName: "rapt_session",
    sessionCookie: {
      attributes: {
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      },
    },
  },
}));

describe("SessionService", () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validate", () => {
    it("should return session and user when valid", async () => {
      // Arrange
      const mockSession = {
        id: "session-123",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: false,
        context: "personal",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        status: "active" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate("session-123");

      // Assert
      expect(result.session).toEqual(mockSession);
      expect(result.user).toEqual(mockUser);
      expect(lucia.validateSession).toHaveBeenCalledWith("session-123");
      expect(lucia.validateSession).toHaveBeenCalledTimes(1);
    });

    it("should return null for expired session", async () => {
      // Arrange
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: null,
        user: null,
      });

      // Act
      const result = await service.validate("expired-session");

      // Assert
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
      expect(lucia.validateSession).toHaveBeenCalledWith("expired-session");
    });

    it("should return fresh session when < 50% lifetime remaining", async () => {
      // Arrange
      const mockSession = {
        id: "fresh-session-456",
        userId: "user-456",
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days left
        fresh: true, // Lucia marks as fresh
        context: "personal",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-456",
        email: "fresh@example.com",
        name: "Fresh User",
        status: "active" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate("fresh-session-456");

      // Assert
      expect(result.session?.fresh).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("should throw UnauthorizedError when session validation throws", async () => {
      // Arrange
      vi.mocked(lucia.validateSession).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(service.validate("malformed-id")).rejects.toThrow(
        UnauthorizedError
      );
      await expect(service.validate("malformed-id")).rejects.toThrow(
        "Invalid session"
      );
    });

    it("should handle shared device session context", async () => {
      // Arrange
      const mockSession = {
        id: "shared-session-789",
        userId: "user-789",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        fresh: false,
        context: "shared",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-789",
        email: "student@school.edu",
        name: "Student User",
        status: "active" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate("shared-session-789");

      // Assert
      expect(result.session?.context).toBe("shared");
      expect(result.session?.expiresAt.getTime()).toBeLessThan(
        Date.now() + 3 * 60 * 60 * 1000
      ); // Less than 3 hours
    });
  });

  describe("create", () => {
    it("should create new session", async () => {
      // Arrange
      const mockSession = {
        id: "new-session-abc",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: true,
        context: "unknown",
        lastActivityAt: new Date(),
      };
      vi.mocked(lucia.createSession).mockResolvedValue(mockSession);

      // Act
      const result = await service.create("user-123");

      // Assert
      expect(result).toEqual(mockSession);
      expect(lucia.createSession).toHaveBeenCalledWith("user-123", {
        context: "unknown",
        last_activity_at: expect.any(Date),
      });
      expect(lucia.createSession).toHaveBeenCalledTimes(1);
    });

    it("should create session with generated ID", async () => {
      // Arrange
      const mockSession = {
        id: "lucia-generated-id-40-chars-long-example",
        userId: "user-456",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: true,
        context: "personal",
        lastActivityAt: new Date(),
      };
      vi.mocked(lucia.createSession).mockResolvedValue(mockSession);

      // Act
      const result = await service.create("user-456");

      // Assert
      expect(result.id).toBeTruthy();
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.userId).toBe("user-456");
    });

    it("should create session with future expiration", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockSession = {
        id: "session-future-def",
        userId: "user-789",
        expiresAt: futureDate,
        fresh: true,
        context: "personal",
        lastActivityAt: new Date(),
      };
      vi.mocked(lucia.createSession).mockResolvedValue(mockSession);

      // Act
      const result = await service.create("user-789");

      // Assert
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 31 * 24 * 60 * 60 * 1000
      );
    });

    it("should throw Error when session creation fails", async () => {
      // Arrange
      vi.mocked(lucia.createSession).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(service.create("user-fail")).rejects.toThrow(
        "Failed to create session"
      );
    });

    it("should create session marked as fresh", async () => {
      // Arrange
      const mockSession = {
        id: "fresh-new-session",
        userId: "user-new",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: true,
        context: "personal",
        lastActivityAt: new Date(),
      };
      vi.mocked(lucia.createSession).mockResolvedValue(mockSession);

      // Act
      const result = await service.create("user-new");

      // Assert
      expect(result.fresh).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("should invalidate session", async () => {
      // Arrange
      vi.mocked(lucia.invalidateSession).mockResolvedValue();

      // Act
      await service.invalidate("session-123");

      // Assert
      expect(lucia.invalidateSession).toHaveBeenCalledWith("session-123");
      expect(lucia.invalidateSession).toHaveBeenCalledTimes(1);
    });

    it("should not throw when session does not exist", async () => {
      // Arrange
      vi.mocked(lucia.invalidateSession).mockRejectedValue(
        new Error("Session not found")
      );

      // Act & Assert - should not throw
      await expect(
        service.invalidate("non-existent-session")
      ).resolves.toBeUndefined();
    });

    it("should silently handle already invalidated session", async () => {
      // Arrange
      vi.mocked(lucia.invalidateSession).mockRejectedValue(
        new Error("Session already invalid")
      );

      // Act & Assert
      await expect(
        service.invalidate("already-invalid")
      ).resolves.toBeUndefined();
    });

    it("should return void on successful invalidation", async () => {
      // Arrange
      vi.mocked(lucia.invalidateSession).mockResolvedValue();

      // Act
      const result = await service.invalidate("session-to-invalidate");

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("invalidateUserSessions", () => {
    it("should invalidate all sessions for user", async () => {
      // Arrange
      vi.mocked(lucia.invalidateUserSessions).mockResolvedValue();

      // Act
      await service.invalidateUserSessions("user-123");

      // Assert
      expect(lucia.invalidateUserSessions).toHaveBeenCalledWith("user-123");
      expect(lucia.invalidateUserSessions).toHaveBeenCalledTimes(1);
    });

    it("should throw Error when user session invalidation fails", async () => {
      // Arrange
      vi.mocked(lucia.invalidateUserSessions).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(
        service.invalidateUserSessions("user-fail")
      ).rejects.toThrow("Failed to invalidate user sessions");
    });

    it("should handle user with no active sessions", async () => {
      // Arrange
      vi.mocked(lucia.invalidateUserSessions).mockResolvedValue();

      // Act & Assert
      await expect(
        service.invalidateUserSessions("user-no-sessions")
      ).resolves.toBeUndefined();
    });

    it("should return void on successful user sessions invalidation", async () => {
      // Arrange
      vi.mocked(lucia.invalidateUserSessions).mockResolvedValue();

      // Act
      const result = await service.invalidateUserSessions("user-456");

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("createBlankSessionCookie", () => {
    it("should create blank cookie for logout", () => {
      // Arrange
      const mockBlankCookie = {
        name: "rapt_session",
        value: "",
        attributes: {
          secure: false,
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 0,
        },
      };
      vi.mocked(lucia.createBlankSessionCookie).mockReturnValue(
        mockBlankCookie
      );

      // Act
      const result = service.createBlankSessionCookie();

      // Assert
      expect(result).toEqual(mockBlankCookie);
      expect(lucia.createBlankSessionCookie).toHaveBeenCalledTimes(1);
    });

    it("should have empty value for blank cookie", () => {
      // Arrange
      const mockBlankCookie = {
        name: "rapt_session",
        value: "",
        attributes: {
          secure: false,
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 0,
        },
      };
      vi.mocked(lucia.createBlankSessionCookie).mockReturnValue(
        mockBlankCookie
      );

      // Act
      const result = service.createBlankSessionCookie();

      // Assert
      expect(result.value).toBe("");
    });

    it("should have maxAge 0 for blank cookie", () => {
      // Arrange
      const mockBlankCookie = {
        name: "rapt_session",
        value: "",
        attributes: {
          secure: false,
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 0,
        },
      };
      vi.mocked(lucia.createBlankSessionCookie).mockReturnValue(
        mockBlankCookie
      );

      // Act
      const result = service.createBlankSessionCookie();

      // Assert
      expect(result.attributes.maxAge).toBe(0);
    });

    it("should use correct cookie name", () => {
      // Arrange
      const mockBlankCookie = {
        name: "rapt_session",
        value: "",
        attributes: {
          secure: false,
          httpOnly: true,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 0,
        },
      };
      vi.mocked(lucia.createBlankSessionCookie).mockReturnValue(
        mockBlankCookie
      );

      // Act
      const result = service.createBlankSessionCookie();

      // Assert
      expect(result.name).toBe("rapt_session");
    });
  });

  describe("sessionCookieName", () => {
    it("should return cookie name from lucia", () => {
      // Act
      const name = service.sessionCookieName;

      // Assert
      expect(name).toBe("rapt_session");
    });

    it("should be a string", () => {
      // Act
      const name = service.sessionCookieName;

      // Assert
      expect(typeof name).toBe("string");
    });
  });

  describe("sessionCookieAttributes", () => {
    it("should return cookie attributes from lucia", () => {
      // Act
      const attributes = service.sessionCookieAttributes;

      // Assert
      expect(attributes).toBeDefined();
      expect(attributes.httpOnly).toBe(true);
      expect(attributes.sameSite).toBe("lax");
      expect(attributes.path).toBe("/");
    });

    it("should include security attributes", () => {
      // Act
      const attributes = service.sessionCookieAttributes;

      // Assert
      expect(attributes.httpOnly).toBe(true); // XSS protection
      expect(attributes.sameSite).toBe("lax"); // CSRF protection
    });

    it("should be an object", () => {
      // Act
      const attributes = service.sessionCookieAttributes;

      // Assert
      expect(typeof attributes).toBe("object");
      expect(attributes).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty session ID gracefully", async () => {
      // Arrange
      vi.mocked(lucia.validateSession).mockRejectedValue(
        new Error("Invalid session ID")
      );

      // Act & Assert
      await expect(service.validate("")).rejects.toThrow(UnauthorizedError);
    });

    it("should handle malformed session ID", async () => {
      // Arrange
      vi.mocked(lucia.validateSession).mockRejectedValue(
        new Error("Malformed session ID")
      );

      // Act & Assert
      await expect(service.validate("malformed!!!")).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("should handle very long session ID (255 chars)", async () => {
      // Arrange
      const longSessionId = "s".repeat(255);
      const mockSession = {
        id: longSessionId,
        userId: "user-long",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: false,
        context: "personal",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-long",
        email: "long@example.com",
        name: "Long Session User",
        status: "active" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate(longSessionId);

      // Assert
      expect(result.session?.id.length).toBe(255);
    });

    it("should handle session with suspended user", async () => {
      // Arrange
      const mockSession = {
        id: "session-suspended",
        userId: "user-suspended",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: false,
        context: "personal",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-suspended",
        email: "suspended@example.com",
        name: "Suspended User",
        status: "suspended" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate("session-suspended");

      // Assert
      expect(result.user?.status).toBe("suspended");
    });

    it("should handle session with pending_verification user", async () => {
      // Arrange
      const mockSession = {
        id: "session-pending",
        userId: "user-pending",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        fresh: false,
        context: "personal",
        lastActivityAt: new Date(),
      };
      const mockUser = {
        id: "user-pending",
        email: "pending@example.com",
        name: "Pending User",
        status: "pending_verification" as const,
      };
      vi.mocked(lucia.validateSession).mockResolvedValue({
        session: mockSession,
        user: mockUser,
      });

      // Act
      const result = await service.validate("session-pending");

      // Assert
      expect(result.user?.status).toBe("pending_verification");
    });
  });
});
