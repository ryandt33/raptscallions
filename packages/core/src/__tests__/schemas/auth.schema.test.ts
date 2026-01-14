import { describe, it, expect } from "vitest";
import { ZodError } from "zod";

import { registerSchema, loginSchema } from "../../schemas/auth.schema.js";

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration input", () => {
      // Arrange
      const validInput = {
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      };

      // Act
      const result = registerSchema.parse(validInput);

      // Assert
      expect(result).toEqual(validInput);
    });

    it("should reject invalid email", () => {
      // Arrange
      const invalidInput = {
        email: "invalid-email",
        name: "Test User",
        password: "password123",
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should reject missing email", () => {
      // Arrange
      const invalidInput = {
        name: "Test User",
        password: "password123",
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should reject empty name", () => {
      // Arrange
      const invalidInput = {
        email: "test@example.com",
        name: "",
        password: "password123",
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should reject name that is too long", () => {
      // Arrange
      const invalidInput = {
        email: "test@example.com",
        name: "a".repeat(101), // 101 characters, max is 100
        password: "password123",
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should reject short password", () => {
      // Arrange
      const invalidInput = {
        email: "test@example.com",
        name: "Test User",
        password: "short",
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
      try {
        registerSchema.parse(invalidInput);
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0]?.message).toContain("at least 8 characters");
        }
      }
    });

    it("should reject password that is too long", () => {
      // Arrange
      const invalidInput = {
        email: "test@example.com",
        name: "Test User",
        password: "a".repeat(256), // 256 characters, max is 255
      };

      // Act & Assert
      expect(() => registerSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should accept password with exactly 8 characters", () => {
      // Arrange
      const validInput = {
        email: "test@example.com",
        name: "Test User",
        password: "12345678",
      };

      // Act
      const result = registerSchema.parse(validInput);

      // Assert
      expect(result.password).toBe("12345678");
    });

    it("should accept maximum length name (100 characters)", () => {
      // Arrange
      const validInput = {
        email: "test@example.com",
        name: "a".repeat(100),
        password: "password123",
      };

      // Act
      const result = registerSchema.parse(validInput);

      // Assert
      expect(result.name).toHaveLength(100);
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login input", () => {
      // Arrange
      const validInput = {
        email: "test@example.com",
        password: "password123",
      };

      // Act
      const result = loginSchema.parse(validInput);

      // Assert
      expect(result).toEqual(validInput);
    });

    it("should reject invalid email", () => {
      // Arrange
      const invalidInput = {
        email: "not-an-email",
        password: "password123",
      };

      // Act & Assert
      expect(() => loginSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should reject missing password", () => {
      // Arrange
      const invalidInput = {
        email: "test@example.com",
        password: "",
      };

      // Act & Assert
      expect(() => loginSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it("should accept any password length for login", () => {
      // Arrange - login validation is less strict than registration
      const validInput = {
        email: "test@example.com",
        password: "short",
      };

      // Act
      const result = loginSchema.parse(validInput);

      // Assert
      expect(result.password).toBe("short");
    });
  });
});
