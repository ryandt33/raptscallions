import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { validateDbEnv, dbEnvSchema } from "../env.js";

describe("Database Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("dbEnvSchema", () => {
    it("should validate a valid DATABASE_URL", () => {
      // Arrange
      const validEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      };

      // Act
      const result = dbEnvSchema.safeParse(validEnv);

      // Assert
      expect(result.success).toBe(true);
    });

    it("should reject missing DATABASE_URL", () => {
      // Arrange
      const invalidEnv = {};

      // Act
      const result = dbEnvSchema.safeParse(invalidEnv);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should reject invalid DATABASE_URL format", () => {
      // Arrange
      const invalidEnv = {
        DATABASE_URL: "not-a-valid-url",
      };

      // Act
      const result = dbEnvSchema.safeParse(invalidEnv);

      // Assert
      expect(result.success).toBe(false);
    });

    it("should provide default values for optional pool settings", () => {
      // Arrange
      const validEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      };

      // Act
      const result = dbEnvSchema.safeParse(validEnv);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_POOL_MIN).toBe(2);
        expect(result.data.DATABASE_POOL_MAX).toBe(10);
      }
    });

    it("should accept custom pool settings", () => {
      // Arrange
      const validEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        DATABASE_POOL_MIN: "5",
        DATABASE_POOL_MAX: "20",
      };

      // Act
      const result = dbEnvSchema.safeParse(validEnv);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.DATABASE_POOL_MIN).toBe(5);
        expect(result.data.DATABASE_POOL_MAX).toBe(20);
      }
    });

    it("should reject pool settings less than 1", () => {
      // Arrange
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        DATABASE_POOL_MIN: "0",
      };

      // Act
      const result = dbEnvSchema.safeParse(invalidEnv);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe("validateDbEnv", () => {
    it("should return parsed environment when valid", () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";

      // Act
      const result = validateDbEnv();

      // Assert
      expect(result.DATABASE_URL).toBe(
        "postgresql://user:pass@localhost:5432/db"
      );
      expect(result.DATABASE_POOL_MIN).toBe(2);
      expect(result.DATABASE_POOL_MAX).toBe(10);
    });

    it("should throw an error when DATABASE_URL is missing", () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      expect(() => validateDbEnv()).toThrow(
        "Database environment validation failed"
      );
    });

    it("should throw an error when DATABASE_URL is invalid", () => {
      // Arrange
      process.env.DATABASE_URL = "invalid-url";

      // Act & Assert
      expect(() => validateDbEnv()).toThrow(
        "Database environment validation failed"
      );
    });

    it("should provide meaningful error message format", () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      expect(() => validateDbEnv()).toThrow("Database environment");
    });
  });
});
