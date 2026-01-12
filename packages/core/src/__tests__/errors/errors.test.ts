import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ErrorCode
} from "../../errors/index.js";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with message, code, statusCode, and details", () => {
      // Arrange
      const message = "Something went wrong";
      const code = "GENERIC_ERROR";
      const statusCode = 500;
      const details = { context: "test" };

      // Act
      const error = new AppError(message, code, statusCode, details);

      // Assert
      expect(error.message).toBe(message);
      expect(error.code).toBe(code);
      expect(error.statusCode).toBe(statusCode);
      expect(error.details).toEqual(details);
      expect(error.name).toBe("AppError");
      expect(error).toBeInstanceOf(Error);
    });

    it("should default to statusCode 500 when not provided", () => {
      // Arrange & Act
      const error = new AppError("Test error", "TEST_ERROR");

      // Assert
      expect(error.statusCode).toBe(500);
    });

    it("should handle undefined details", () => {
      // Arrange & Act
      const error = new AppError("Test error", "TEST_ERROR", 400);

      // Assert
      expect(error.details).toBeUndefined();
    });

    it("should handle string details", () => {
      // Arrange
      const details = "Additional error info";

      // Act
      const error = new AppError("Test error", "TEST_ERROR", 400, details);

      // Assert
      expect(error.details).toBe(details);
    });

    it("should handle object details", () => {
      // Arrange
      const details = { field: "email", validation: "required" };

      // Act
      const error = new AppError("Test error", "TEST_ERROR", 400, details);

      // Assert
      expect(error.details).toEqual(details);
    });

    it("should be catchable as Error", () => {
      // Arrange
      const error = new AppError("Test", "TEST", 500);

      // Act & Assert
      try {
        throw error;
      } catch (caught) {
        expect(caught).toBeInstanceOf(Error);
        expect(caught).toBeInstanceOf(AppError);
      }
    });

    it("should have stack trace", () => {
      // Arrange & Act
      const error = new AppError("Test error", "TEST_ERROR");

      // Assert
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with correct defaults", () => {
      // Arrange
      const message = "Validation failed";

      // Act
      const error = new ValidationError(message);

      // Assert
      expect(error.message).toBe(message);
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
      expect(error.name).toBe("AppError");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });

    it("should accept validation details", () => {
      // Arrange
      const message = "Validation failed";
      const details = { field: "email", expected: "valid email" };

      // Act
      const error = new ValidationError(message, details);

      // Assert
      expect(error.details).toEqual(details);
    });

    it("should inherit from AppError", () => {
      // Arrange & Act
      const error = new ValidationError("Test validation error");

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error with resource and id", () => {
      // Arrange
      const resource = "User";
      const id = "123";

      // Act
      const error = new NotFoundError(resource, id);

      // Assert
      expect(error.message).toBe("User not found: 123");
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it("should work with different resource types", () => {
      // Arrange & Act
      const userError = new NotFoundError("User", "user-123");
      const groupError = new NotFoundError("Group", "group-456");

      // Assert
      expect(userError.message).toBe("User not found: user-123");
      expect(groupError.message).toBe("Group not found: group-456");
    });

    it("should inherit from AppError", () => {
      // Arrange & Act
      const error = new NotFoundError("Resource", "id");

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("UnauthorizedError", () => {
    it("should create unauthorized error with default message", () => {
      // Arrange & Act
      const error = new UnauthorizedError();

      // Assert
      expect(error.message).toBe("Unauthorized");
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
    });

    it("should accept custom message", () => {
      // Arrange
      const customMessage = "Token expired";

      // Act
      const error = new UnauthorizedError(customMessage);

      // Assert
      expect(error.message).toBe(customMessage);
    });

    it("should inherit from AppError", () => {
      // Arrange & Act
      const error = new UnauthorizedError();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ErrorCode enum", () => {
    it("should contain all required error codes", () => {
      // Arrange & Act & Assert
      expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    });

    it("should be exported and accessible", () => {
      // Arrange
      const expectedCodes = ["VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED"];

      // Act
      const actualCodes = Object.values(ErrorCode);

      // Assert
      expect(actualCodes).toEqual(expect.arrayContaining(expectedCodes));
    });
  });

  describe("Error serialization", () => {
    it("should serialize AppError correctly", () => {
      // Arrange
      const error = new AppError("Test error", "TEST_CODE", 500, { extra: "data" });

      // Act
      const serialized = JSON.parse(JSON.stringify(error));

      // Assert
      expect(serialized.message).toBe("Test error");
      expect(serialized.code).toBe("TEST_CODE");
      expect(serialized.statusCode).toBe(500);
      expect(serialized.details).toEqual({ extra: "data" });
    });

    it("should serialize ValidationError correctly", () => {
      // Arrange
      const error = new ValidationError("Invalid input", { field: "email" });

      // Act
      const serialized = JSON.parse(JSON.stringify(error));

      // Assert
      expect(serialized.message).toBe("Invalid input");
      expect(serialized.code).toBe("VALIDATION_ERROR");
      expect(serialized.statusCode).toBe(400);
      expect(serialized.details).toEqual({ field: "email" });
    });
  });

  describe("Error chaining and inheritance", () => {
    it("should maintain proper inheritance chain", () => {
      // Arrange
      const validationError = new ValidationError("Test");
      const notFoundError = new NotFoundError("User", "123");
      const unauthorizedError = new UnauthorizedError();

      // Act & Assert
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError).toBeInstanceOf(AppError);
      expect(validationError).toBeInstanceOf(Error);

      expect(notFoundError).toBeInstanceOf(NotFoundError);
      expect(notFoundError).toBeInstanceOf(AppError);
      expect(notFoundError).toBeInstanceOf(Error);

      expect(unauthorizedError).toBeInstanceOf(UnauthorizedError);
      expect(unauthorizedError).toBeInstanceOf(AppError);
      expect(unauthorizedError).toBeInstanceOf(Error);
    });

    it("should be distinguishable by instanceof", () => {
      // Arrange
      const errors = [
        new ValidationError("Test"),
        new NotFoundError("User", "123"),
        new UnauthorizedError(),
        new AppError("Generic", "CODE")
      ];

      // Act & Assert
      expect(errors.filter(e => e instanceof ValidationError)).toHaveLength(1);
      expect(errors.filter(e => e instanceof NotFoundError)).toHaveLength(1);
      expect(errors.filter(e => e instanceof UnauthorizedError)).toHaveLength(1);
      expect(errors.filter(e => e instanceof AppError)).toHaveLength(4);
    });
  });
});