import { describe, it, expect } from "vitest";
import { ZodError } from "zod";

import {
  userBaseSchema,
  createUserSchema,
  updateUserSchema,
  type User,
  type CreateUser,
  type UpdateUser
} from "../../schemas/user.schema.js";
import {
  createMockUser,
  createMockCreateUser,
  invalidUserData
} from "../factories.js";

describe("User Schemas", () => {
  describe("userBaseSchema", () => {
    it("should validate valid user data", () => {
      // Arrange
      const validUser = createMockUser();

      // Act
      const result = userBaseSchema.parse(validUser);

      // Assert
      expect(result).toEqual(validUser);
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
    });

    it("should accept email with valid format", () => {
      // Arrange
      const userData = createMockUser({ email: "user+tag@example.co.uk" });

      // Act & Assert
      expect(() => userBaseSchema.parse(userData)).not.toThrow();
    });

    it("should accept name at minimum length (1 character)", () => {
      // Arrange
      const userData = createMockUser({ name: "A" });

      // Act & Assert
      expect(() => userBaseSchema.parse(userData)).not.toThrow();
    });

    it("should accept name at maximum length (100 characters)", () => {
      // Arrange
      const userData = createMockUser({ name: "a".repeat(100) });

      // Act & Assert
      expect(() => userBaseSchema.parse(userData)).not.toThrow();
    });

    it("should fail validation when email is missing", () => {
      // Arrange
      const invalidData = invalidUserData.missingEmail;

      // Act & Assert
      expect(() => userBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when name is missing", () => {
      // Arrange
      const invalidData = invalidUserData.missingName;

      // Act & Assert
      expect(() => userBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when email has invalid format", () => {
      // Arrange
      const invalidData = invalidUserData.invalidEmail;

      // Act & Assert
      expect(() => {
        userBaseSchema.parse(invalidData);
      }).toThrow(ZodError);
    });

    it("should fail validation when name is empty", () => {
      // Arrange
      const invalidData = invalidUserData.emptyName;

      // Act & Assert
      expect(() => userBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when name exceeds 100 characters", () => {
      // Arrange
      const invalidData = invalidUserData.nameTooLong;

      // Act & Assert
      expect(() => userBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should provide detailed error messages for validation failures", () => {
      // Arrange
      const invalidData = { email: "not-an-email", name: "" };

      // Act & Assert
      try {
        userBaseSchema.parse(invalidData);
        expect.fail("Should have thrown ZodError");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.errors).toHaveLength(2); // Both email and name errors

        const emailError = zodError.errors.find(e => e.path[0] === "email");
        const nameError = zodError.errors.find(e => e.path[0] === "name");

        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain("email");
        expect(nameError).toBeDefined();
        expect(nameError?.message).toContain("at least 1");
      }
    });
  });

  describe("createUserSchema", () => {
    it("should be identical to userBaseSchema", () => {
      // Arrange
      const userData = createMockCreateUser();

      // Act
      const baseResult = userBaseSchema.parse(userData);
      const createResult = createUserSchema.parse(userData);

      // Assert
      expect(createResult).toEqual(baseResult);
    });

    it("should require all fields from base schema", () => {
      // Arrange
      const incompleteData = { email: "test@example.com" }; // Missing name

      // Act & Assert
      expect(() => createUserSchema.parse(incompleteData)).toThrow(ZodError);
    });
  });

  describe("updateUserSchema", () => {
    it("should accept partial data (all fields optional)", () => {
      // Arrange
      const partialData = { name: "Updated Name" };

      // Act
      const result = updateUserSchema.parse(partialData);

      // Assert
      expect(result).toEqual(partialData);
    });

    it("should accept empty object (all fields optional)", () => {
      // Arrange
      const emptyData = {};

      // Act & Assert
      expect(() => updateUserSchema.parse(emptyData)).not.toThrow();
    });

    it("should validate individual fields when present", () => {
      // Arrange
      const invalidPartial = { email: "not-an-email" };

      // Act & Assert
      expect(() => updateUserSchema.parse(invalidPartial)).toThrow(ZodError);
    });

    it("should accept only email update", () => {
      // Arrange
      const emailOnly = { email: "newemail@example.com" };

      // Act & Assert
      expect(() => updateUserSchema.parse(emailOnly)).not.toThrow();
    });

    it("should accept only name update", () => {
      // Arrange
      const nameOnly = { name: "New Name" };

      // Act & Assert
      expect(() => updateUserSchema.parse(nameOnly)).not.toThrow();
    });
  });

  describe("TypeScript type inference", () => {
    it("should infer correct User type from userBaseSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const user: User = {
        email: "test@example.com",
        name: "Test User",
      };

      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
    });

    it("should infer correct CreateUser type from createUserSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const createUser: CreateUser = {
        email: "test@example.com",
        name: "Test User",
      };

      expect(createUser.email).toBe("test@example.com");
      expect(createUser.name).toBe("Test User");
    });

    it("should infer correct UpdateUser type from updateUserSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const updateUser: UpdateUser = {
        email: "test@example.com",
        // name is optional in updates
      };

      expect(updateUser.email).toBe("test@example.com");
      expect(updateUser.name).toBeUndefined();
    });
  });
});