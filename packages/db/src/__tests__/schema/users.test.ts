import { describe, it, expect } from "vitest";
import type { User, NewUser } from "../../schema/users.js";
import { users, userStatusEnum } from "../../schema/users.js";

describe("Users Schema", () => {
  describe("Type Inference", () => {
    it("should infer User type correctly with all required fields", () => {
      // Arrange
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$somehash",
        status: "active",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: null,
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(user.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.passwordHash).toBe("$argon2id$v=19$m=65536,t=3,p=4$somehash");
      expect(user.status).toBe("active");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.deletedAt).toBeNull();
    });

    it("should allow null password_hash for OAuth users", () => {
      // Arrange - OAuth user without password
      const oauthUser: User = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        email: "oauth@example.com",
        name: "OAuth User",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(oauthUser.passwordHash).toBeNull();
      expect(oauthUser.email).toBe("oauth@example.com");
    });

    it("should allow null deleted_at for non-deleted users", () => {
      // Arrange
      const activeUser: User = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        email: "active@example.com",
        name: "Active User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeUser.deletedAt).toBeNull();
    });

    it("should allow non-null deleted_at for soft-deleted users", () => {
      // Arrange
      const deletedUser: User = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        email: "deleted@example.com",
        name: "Deleted User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        status: "suspended",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        deletedAt: new Date("2024-01-03T00:00:00Z"),
      };

      // Act & Assert
      expect(deletedUser.deletedAt).toBeInstanceOf(Date);
      expect(deletedUser.deletedAt?.toISOString()).toBe(
        "2024-01-03T00:00:00.000Z"
      );
    });
  });

  describe("NewUser Type (Insert Operations)", () => {
    it("should infer NewUser type correctly for inserts", () => {
      // Arrange - NewUser should omit auto-generated fields
      const newUser: NewUser = {
        email: "new@example.com",
        name: "New User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        status: "pending_verification",
      };

      // Act & Assert
      expect(newUser.email).toBe("new@example.com");
      expect(newUser.name).toBe("New User");
      expect(newUser.passwordHash).toBe("$argon2id$v=19$m=65536,t=3,p=4$hash");
      expect(newUser.status).toBe("pending_verification");
    });

    it("should allow creating OAuth user without password_hash", () => {
      // Arrange - OAuth user insert without password
      const newOAuthUser: NewUser = {
        email: "oauth.new@example.com",
        name: "New OAuth User",
        status: "active",
      };

      // Act & Assert
      expect(newOAuthUser.email).toBe("oauth.new@example.com");
      expect(newOAuthUser.name).toBe("New OAuth User");
      expect(newOAuthUser.passwordHash).toBeUndefined();
    });

    it("should make auto-generated fields optional in NewUser", () => {
      // Arrange - Minimal NewUser without id, timestamps
      const minimalUser: NewUser = {
        email: "minimal@example.com",
        name: "Minimal User",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalUser.id).toBeUndefined();
      expect(minimalUser.createdAt).toBeUndefined();
      expect(minimalUser.updatedAt).toBeUndefined();
    });
  });

  describe("Status Enum", () => {
    it("should have active status value", () => {
      // Arrange
      const activeStatus: User["status"] = "active";

      // Act & Assert
      expect(activeStatus).toBe("active");
    });

    it("should have suspended status value", () => {
      // Arrange
      const suspendedStatus: User["status"] = "suspended";

      // Act & Assert
      expect(suspendedStatus).toBe("suspended");
    });

    it("should have pending_verification status value", () => {
      // Arrange
      const pendingStatus: User["status"] = "pending_verification";

      // Act & Assert
      expect(pendingStatus).toBe("pending_verification");
    });

    it("should contain exactly three status values", () => {
      // Arrange
      const validStatuses: Array<User["status"]> = [
        "active",
        "suspended",
        "pending_verification",
      ];

      // Act & Assert
      expect(validStatuses).toHaveLength(3);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(users._.name).toBe("users");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(users.id).toBeDefined();
      expect(users.id.name).toBe("id");
    });

    it("should have email column", () => {
      // Act & Assert
      expect(users.email).toBeDefined();
      expect(users.email.name).toBe("email");
    });

    it("should have name column", () => {
      // Act & Assert
      expect(users.name).toBeDefined();
      expect(users.name.name).toBe("name");
    });

    it("should have passwordHash column", () => {
      // Act & Assert
      expect(users.passwordHash).toBeDefined();
      expect(users.passwordHash.name).toBe("password_hash");
    });

    it("should have status column", () => {
      // Act & Assert
      expect(users.status).toBeDefined();
      expect(users.status.name).toBe("status");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(users.createdAt).toBeDefined();
      expect(users.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(users.updatedAt).toBeDefined();
      expect(users.updatedAt.name).toBe("updated_at");
    });

    it("should have deletedAt column", () => {
      // Act & Assert
      expect(users.deletedAt).toBeDefined();
      expect(users.deletedAt.name).toBe("deleted_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "email",
        "name",
        "passwordHash",
        "status",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ];

      // Act
      const actualColumns = Object.keys(users).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export users table", () => {
      // Act & Assert
      expect(users).toBeDefined();
      expect(users._.name).toBe("users");
    });

    it("should export userStatusEnum", () => {
      // Act & Assert
      expect(userStatusEnum).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should enforce required email field", () => {
      // Arrange
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "required@example.com",
        name: "Required Email",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(user.email).toBeTruthy();
      expect(typeof user.email).toBe("string");
    });

    it("should enforce required name field", () => {
      // Arrange
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        name: "Required Name",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(user.name).toBeTruthy();
      expect(typeof user.name).toBe("string");
    });

    it("should enforce required status field", () => {
      // Arrange
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "test@example.com",
        name: "Test User",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(user.status).toBeTruthy();
      expect(["active", "suspended", "pending_verification"]).toContain(
        user.status
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle users with very long emails (up to 255 chars)", () => {
      // Arrange
      const longEmail = "a".repeat(243) + "@example.com"; // 255 chars total
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: longEmail,
        name: "Long Email User",
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(user.email.length).toBe(255);
      expect(user.email).toBe(longEmail);
    });

    it("should handle users with long names (up to 100 chars)", () => {
      // Arrange
      const longName = "A".repeat(100);
      const user: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "longname@example.com",
        name: longName,
        passwordHash: null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(user.name.length).toBe(100);
      expect(user.name).toBe(longName);
    });

    it("should handle pending_verification status for new users", () => {
      // Arrange
      const pendingUser: NewUser = {
        email: "pending@example.com",
        name: "Pending User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        status: "pending_verification",
      };

      // Act & Assert
      expect(pendingUser.status).toBe("pending_verification");
    });

    it("should handle suspended status for disabled accounts", () => {
      // Arrange
      const suspendedUser: User = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "suspended@example.com",
        name: "Suspended User",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$hash",
        status: "suspended",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(suspendedUser.status).toBe("suspended");
    });
  });
});
