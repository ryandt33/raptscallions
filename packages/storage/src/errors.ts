/**
 * Storage-specific error classes.
 * All errors extend AppError from @raptscallions/core for consistent error handling.
 */

import { AppError } from "@raptscallions/core";

/**
 * Error codes for storage operations.
 */
export const StorageErrorCode = {
  STORAGE_ERROR: "STORAGE_ERROR",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  BACKEND_NOT_REGISTERED: "BACKEND_NOT_REGISTERED",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const;

export type StorageErrorCodeType =
  (typeof StorageErrorCode)[keyof typeof StorageErrorCode];

/**
 * Base error for storage backend failures.
 * Used for network errors, permission issues, service unavailability.
 * Defaults to HTTP 500 Internal Server Error.
 */
export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, StorageErrorCode.STORAGE_ERROR, 500, details);
    this.name = "StorageError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when storage quota would be exceeded.
 * Defaults to HTTP 403 Forbidden (action not allowed due to limits).
 */
export class QuotaExceededError extends AppError {
  constructor(
    message: string = "Storage quota exceeded",
    details?: {
      currentUsage?: number;
      quotaLimit?: number;
      requestedSize?: number;
    }
  ) {
    super(message, StorageErrorCode.QUOTA_EXCEEDED, 403, details);
    this.name = "QuotaExceededError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a file is not found in storage.
 * Different from core NotFoundError to provide storage-specific context.
 * Defaults to HTTP 404 Not Found.
 */
export class FileNotFoundError extends AppError {
  constructor(key: string) {
    super(
      `File not found in storage: ${key}`,
      StorageErrorCode.FILE_NOT_FOUND,
      404,
      { key }
    );
    this.name = "FileNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when file MIME type validation fails.
 * Defaults to HTTP 400 Bad Request.
 */
export class InvalidFileTypeError extends AppError {
  constructor(providedType: string, allowedTypes?: string[]) {
    const message = allowedTypes
      ? `Invalid file type: ${providedType}. Allowed types: ${allowedTypes.join(", ")}`
      : `Invalid file type: ${providedType}`;

    super(message, StorageErrorCode.INVALID_FILE_TYPE, 400, {
      providedType,
      allowedTypes,
    });
    this.name = "InvalidFileTypeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when attempting to use an unregistered storage backend.
 * Includes list of available backends for discoverability.
 * Defaults to HTTP 500 Internal Server Error (configuration issue).
 */
export class BackendNotRegisteredError extends AppError {
  constructor(identifier: string, availableBackends: string[]) {
    const message =
      availableBackends.length > 0
        ? `Storage backend not registered: "${identifier}". Available backends: ${availableBackends.join(", ")}`
        : `Storage backend not registered: "${identifier}". No backends are currently registered.`;

    super(message, StorageErrorCode.BACKEND_NOT_REGISTERED, 500, {
      requestedBackend: identifier,
      availableBackends,
    });
    this.name = "BackendNotRegisteredError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when storage configuration validation fails.
 * Provides details about which configuration fields are missing or invalid.
 * Defaults to HTTP 500 Internal Server Error (configuration issue).
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string,
    details?: {
      issues?: Array<{ field: string; message: string }>;
      backend?: string;
    }
  ) {
    super(message, StorageErrorCode.CONFIGURATION_ERROR, 500, details);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
