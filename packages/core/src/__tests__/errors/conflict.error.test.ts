import { describe, it, expect } from "vitest";

import { ErrorCode } from "../../errors/base.error.js";
import { ConflictError } from "../../errors/common.error.js";

describe("ConflictError", () => {
  it("should have correct status code and error code", () => {
    // Arrange & Act
    const error = new ConflictError("Email already exists");

    // Assert
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe(ErrorCode.CONFLICT);
    expect(error.message).toBe("Email already exists");
  });

  it("should extend AppError", () => {
    // Arrange & Act
    const error = new ConflictError("Resource conflict");

    // Assert
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
  });

  it("should serialize to JSON correctly", () => {
    // Arrange
    const error = new ConflictError("Duplicate entry");

    // Act
    const json = error.toJSON();

    // Assert
    expect(json).toEqual({
      message: "Duplicate entry",
      code: ErrorCode.CONFLICT,
      statusCode: 409,
      details: undefined,
    });
  });
});
