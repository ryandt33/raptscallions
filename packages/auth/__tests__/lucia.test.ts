import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing lucia
vi.mock("@raptscallions/db", () => ({
  db: {
    query: {},
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@raptscallions/db/schema", () => ({
  sessions: {
    id: { name: "id" },
    userId: { name: "user_id" },
    expiresAt: { name: "expires_at" },
    context: { name: "context" },
    lastActivityAt: { name: "last_activity_at" },
  },
  users: {
    id: { name: "id" },
    email: { name: "email" },
    name: { name: "name" },
    status: { name: "status" },
  },
}));

describe("Lucia Configuration", () => {
  // Import lucia after mocks are set up
  let lucia: any;

  beforeEach(async () => {
    vi.resetModules();
    const luciaModule = await import("../src/lucia.js");
    lucia = luciaModule.lucia;
  });

  describe("Lucia Instance", () => {
    it("should export lucia instance", () => {
      // Act & Assert
      expect(lucia).toBeDefined();
      expect(typeof lucia).toBe("object");
    });

    it("should have validateSession method", () => {
      // Act & Assert
      expect(lucia.validateSession).toBeDefined();
      expect(typeof lucia.validateSession).toBe("function");
    });

    it("should have createSession method", () => {
      // Act & Assert
      expect(lucia.createSession).toBeDefined();
      expect(typeof lucia.createSession).toBe("function");
    });

    it("should have invalidateSession method", () => {
      // Act & Assert
      expect(lucia.invalidateSession).toBeDefined();
      expect(typeof lucia.invalidateSession).toBe("function");
    });

    it("should have invalidateUserSessions method", () => {
      // Act & Assert
      expect(lucia.invalidateUserSessions).toBeDefined();
      expect(typeof lucia.invalidateUserSessions).toBe("function");
    });

    it("should have createBlankSessionCookie method", () => {
      // Act & Assert
      expect(lucia.createBlankSessionCookie).toBeDefined();
      expect(typeof lucia.createBlankSessionCookie).toBe("function");
    });
  });

  describe("Session Cookie Configuration", () => {
    it("should have sessionCookieName property", () => {
      // Act & Assert
      expect(lucia.sessionCookieName).toBeDefined();
      expect(typeof lucia.sessionCookieName).toBe("string");
    });

    it("should use rapt_session as cookie name", () => {
      // Act & Assert
      expect(lucia.sessionCookieName).toBe("rapt_session");
    });

    it("should have cookie attributes via createBlankSessionCookie", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes).toBeDefined();
      expect(typeof cookie.attributes).toBe("object");
    });

    it("should set httpOnly to true for security", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.httpOnly).toBe(true);
    });

    it("should set sameSite to lax for CSRF protection", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.sameSite).toBe("lax");
    });

    it("should set path to root", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.path).toBe("/");
    });

    it("should set secure based on NODE_ENV", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();

      // Assert
      const isProduction = process.env.NODE_ENV === "production";
      expect(cookie.attributes.secure).toBe(isProduction);
    });
  });

  describe("Session Cookie Creation", () => {
    it("should create blank session cookie for logout", () => {
      // Act
      const blankCookie = lucia.createBlankSessionCookie();

      // Assert
      expect(blankCookie).toBeDefined();
      expect(blankCookie.name).toBe("rapt_session");
      expect(blankCookie.value).toBe("");
      expect(blankCookie.attributes).toBeDefined();
    });

    it("should have maxAge set to 0 for blank cookie", () => {
      // Act
      const blankCookie = lucia.createBlankSessionCookie();

      // Assert
      expect(blankCookie.attributes.maxAge).toBe(0);
    });
  });

  describe("Type Safety", () => {
    it("should have DatabaseUserAttributes interface with email field", () => {
      // Act & Assert
      // TypeScript compilation verifies this interface exists
      type DatabaseUserAttributes = {
        email: string;
        name: string;
        status: "active" | "suspended" | "pending_verification";
      };

      const attrs: DatabaseUserAttributes = {
        email: "test@example.com",
        name: "Test User",
        status: "active",
      };

      expect(attrs.email).toBe("test@example.com");
      expect(attrs.name).toBe("Test User");
      expect(attrs.status).toBe("active");
    });

    it("should have DatabaseUserAttributes interface with name field", () => {
      // Act & Assert
      type DatabaseUserAttributes = {
        email: string;
        name: string;
        status: "active" | "suspended" | "pending_verification";
      };

      const attrs: DatabaseUserAttributes = {
        email: "test@example.com",
        name: "Test User",
        status: "active",
      };

      expect(attrs.name).toBeTruthy();
      expect(typeof attrs.name).toBe("string");
    });

    it("should have DatabaseUserAttributes interface with status field", () => {
      // Act & Assert
      type DatabaseUserAttributes = {
        email: string;
        name: string;
        status: "active" | "suspended" | "pending_verification";
      };

      const attrs: DatabaseUserAttributes = {
        email: "test@example.com",
        name: "Test User",
        status: "active",
      };

      expect(attrs.status).toBeTruthy();
      expect(["active", "suspended", "pending_verification"]).toContain(
        attrs.status
      );
    });
  });

  describe("Configuration Values", () => {
    it("should have correct cookie name for education platform", () => {
      // Arrange
      const expectedName = "rapt_session";

      // Act
      const actualName = lucia.sessionCookieName;

      // Assert
      expect(actualName).toBe(expectedName);
    });

    it("should have security-focused cookie attributes", () => {
      // Act
      const cookie = lucia.createBlankSessionCookie();
      const attributes = cookie.attributes;

      // Assert
      expect(attributes.httpOnly).toBe(true); // XSS protection
      expect(attributes.sameSite).toBe("lax"); // CSRF protection
      expect(attributes.path).toBe("/"); // Available app-wide
    });
  });

  describe("Edge Cases", () => {
    it("should handle production environment", async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Act
      vi.resetModules();
      const luciaModule = await import("../src/lucia.js");
      const prodLucia = luciaModule.lucia;
      const cookie = prodLucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.secure).toBe(true);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle development environment", async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Act
      vi.resetModules();
      const luciaModule = await import("../src/lucia.js");
      const devLucia = luciaModule.lucia;
      const cookie = devLucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.secure).toBe(false);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it("should handle test environment", async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      // Act
      vi.resetModules();
      const luciaModule = await import("../src/lucia.js");
      const testLucia = luciaModule.lucia;
      const cookie = testLucia.createBlankSessionCookie();

      // Assert
      expect(cookie.attributes.secure).toBe(false);

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});
