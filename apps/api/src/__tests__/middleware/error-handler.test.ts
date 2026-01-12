import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError, ValidationError, NotFoundError, UnauthorizedError } from "@raptscallions/core";

describe("Error Handler Middleware (error-handler.ts)", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockLogger: {
    error: Mock;
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetModules();

    // Mock request
    mockRequest = {
      id: "test-request-id",
      method: "GET",
      url: "/test",
    };

    // Mock reply
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Mock logger
    mockLogger = {
      error: vi.fn(),
    };
  });

  describe("AppError handling", () => {
    it("should handle ValidationError and return 400", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new ValidationError("Invalid input", { field: "email" });

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Invalid input",
        code: "VALIDATION_ERROR",
        details: { field: "email" },
      });
    });

    it("should handle NotFoundError and return 404", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new NotFoundError("User", "123");

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "User not found: 123",
        code: "NOT_FOUND",
        details: undefined,
      });
    });

    it("should handle UnauthorizedError and return 401", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new UnauthorizedError("Session expired");

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Session expired",
        code: "UNAUTHORIZED",
        details: undefined,
      });
    });

    it("should handle generic AppError with custom status code", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new AppError("Custom error", "CUSTOM_ERROR", 418);

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(418);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Custom error",
        code: "CUSTOM_ERROR",
        details: undefined,
      });
    });

    it("should include details when provided", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new AppError("Error with details", "ERROR_CODE", 500, {
        extra: "info",
        field: "test",
      });

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Error with details",
        code: "ERROR_CODE",
        details: {
          extra: "info",
          field: "test",
        },
      });
    });
  });

  describe("Unknown error handling", () => {
    it("should handle generic Error and return 500", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new Error("Unexpected error");

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    });

    it("should handle non-Error objects and return 500", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = { message: "Not an Error instance" } as Error;

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    });

    it("should not expose internal error details for unknown errors", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new Error("Database connection failed: password=secret123");

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
      // Verify sensitive data is NOT in response
      expect(mockReply.send).not.toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("password=secret123"),
        })
      );
    });
  });

  describe("Response format", () => {
    it("should always include error and code fields", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const errors = [
        new ValidationError("Test"),
        new NotFoundError("Resource", "id"),
        new UnauthorizedError(),
        new Error("Generic"),
      ];

      for (const error of errors) {
        // Reset mocks
        (mockReply.send as Mock).mockClear();

        // Act
        errorHandler(
          error,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );

        // Assert
        const callArgs = (mockReply.send as Mock).mock.calls[0]?.[0];
        expect(callArgs).toBeDefined();
        expect(callArgs).toHaveProperty("error");
        expect(callArgs).toHaveProperty("code");
        expect(typeof callArgs.error).toBe("string");
        expect(typeof callArgs.code).toBe("string");
      }
    });

    it("should only include details field when present", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const errorWithoutDetails = new NotFoundError("User", "123");
      const errorWithDetails = new ValidationError("Test", { field: "email" });

      // Act - without details
      errorHandler(
        errorWithoutDetails,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );
      const responseWithoutDetails = (mockReply.send as Mock).mock.calls[0]?.[0];

      // Act - with details
      (mockReply.send as Mock).mockClear();
      errorHandler(
        errorWithDetails,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );
      const responseWithDetails = (mockReply.send as Mock).mock.calls[0]?.[0];

      // Assert
      expect(responseWithoutDetails.details).toBeUndefined();
      expect(responseWithDetails.details).toBeDefined();
      expect(responseWithDetails.details).toEqual({ field: "email" });
    });
  });

  describe("HTTP status codes", () => {
    it("should map error types to correct status codes", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");

      const testCases = [
        { error: new ValidationError("Test"), expectedStatus: 400 },
        { error: new UnauthorizedError(), expectedStatus: 401 },
        { error: new NotFoundError("Resource", "id"), expectedStatus: 404 },
        { error: new AppError("Test", "CODE", 418), expectedStatus: 418 },
        { error: new Error("Generic"), expectedStatus: 500 },
      ];

      for (const { error, expectedStatus } of testCases) {
        // Reset mocks
        (mockReply.status as Mock).mockClear();

        // Act
        errorHandler(
          error,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );

        // Assert
        expect(mockReply.status).toHaveBeenCalledWith(expectedStatus);
      }
    });
  });

  describe("Error type discrimination", () => {
    it("should correctly identify AppError subclasses", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const appErrors = [
        new ValidationError("Test"),
        new NotFoundError("Resource", "id"),
        new UnauthorizedError(),
        new AppError("Generic", "CODE", 418), // Provide non-500 status
      ];

      for (const error of appErrors) {
        // Reset mocks
        (mockReply.status as Mock).mockClear();
        (mockReply.send as Mock).mockClear();

        // Act
        errorHandler(
          error,
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );

        // Assert - AppError should use error.statusCode, not 500
        const statusCall = (mockReply.status as Mock).mock.calls[0]?.[0];
        expect(statusCall).not.toBe(500);
      }
    });

    it("should treat standard Error as unknown error", async () => {
      // Arrange
      const { errorHandler } = await import("../../middleware/error-handler.js");
      const error = new Error("Standard error");

      // Act
      errorHandler(
        error,
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    });
  });
});
