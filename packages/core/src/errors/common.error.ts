import { AppError, ErrorCode, type ErrorDetails } from "./base.error.js";

/**
 * Error thrown when input validation fails.
 * Defaults to HTTP 400 Bad Request.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Error thrown when a requested resource is not found.
 * Defaults to HTTP 404 Not Found.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, ErrorCode.NOT_FOUND, 404);
  }
}

/**
 * Error thrown when authentication/authorization fails.
 * Defaults to HTTP 401 Unauthorized.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

/**
 * Error thrown when user lacks permission for an action.
 * Defaults to HTTP 403 Forbidden.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

/**
 * Error thrown when a resource conflict occurs (e.g., duplicate email).
 * Defaults to HTTP 409 Conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
  }
}
