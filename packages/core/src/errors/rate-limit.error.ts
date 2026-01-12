import { AppError, ErrorCode, type ErrorDetails } from "./base.error.js";

/**
 * Error thrown when rate limit is exceeded.
 * Defaults to HTTP 429 Too Many Requests.
 *
 * Details should include:
 * - limit: Maximum requests allowed
 * - remaining: Requests remaining (always 0 when thrown)
 * - resetAt: ISO timestamp when limit resets
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", details?: ErrorDetails) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
    this.name = "RateLimitError";
  }
}
