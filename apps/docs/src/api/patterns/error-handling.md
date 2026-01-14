---
title: Error Handling Patterns
description: Typed AppError classes, error handler, and consistent error responses
related_code:
  - packages/core/src/errors/base.error.ts
  - packages/core/src/errors/common.error.ts
  - packages/core/src/errors/rate-limit.error.ts
  - apps/api/src/middleware/error-handler.ts
last_verified: 2026-01-14
---

# Error Handling Patterns

RaptScallions uses typed error classes that map to HTTP status codes. The global error handler catches all errors and formats them into consistent JSON responses.

## Error Class Hierarchy

All application errors extend the base `AppError` class:

```
AppError (base)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
└── RateLimitError (429)
```

## Base Error Class

```typescript
// packages/core/src/errors/base.error.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ErrorDetails;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
```

## Common Error Classes

```typescript
// packages/core/src/errors/common.error.ts
import { AppError, ErrorCode } from "./base.error.js";

/**
 * Input validation failed (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Authentication required or failed (401 Unauthorized)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

/**
 * User lacks permission (403 Forbidden)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

/**
 * Resource not found (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, ErrorCode.NOT_FOUND, 404);
  }
}

/**
 * Resource conflict (409 Conflict)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
  }
}
```

```typescript
// packages/core/src/errors/rate-limit.error.ts
/**
 * Rate limit exceeded (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", details?: ErrorDetails) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
  }
}
```

## Using Errors in Code

### In Services

```typescript
// apps/api/src/services/auth.service.ts
import { ConflictError, UnauthorizedError } from "@raptscallions/core";

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // ... create user
  }

  async login(input: LoginInput) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    // Generic message for security (timing attack mitigation)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const valid = await verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // ... create session
  }
}
```

### In Route Handlers

```typescript
import { NotFoundError, ForbiddenError } from "@raptscallions/core";

app.get("/users/:id", async (request, reply) => {
  const user = await userService.findById(request.params.id);

  if (!user) {
    throw new NotFoundError("User", request.params.id);
  }

  if (user.id !== request.user?.id && !isAdmin(request.user)) {
    throw new ForbiddenError("You can only view your own profile");
  }

  return reply.send({ data: user });
});
```

### In Middleware

```typescript
// apps/api/src/middleware/auth.middleware.ts
app.decorate("requireAuth", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
});

app.decorate("requireRole", (...roles: MemberRole[]) => {
  return async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const hasRole = /* ... check roles ... */;

    if (!hasRole) {
      throw new ForbiddenError(
        `This action requires one of the following roles: ${roles.join(", ")}`
      );
    }
  };
});
```

## Global Error Handler

The error handler catches all errors and formats consistent responses:

```typescript
// apps/api/src/middleware/error-handler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "@raptscallions/core";
import { getLogger } from "@raptscallions/telemetry";

const logger = getLogger("api:error-handler");

// Duck typing for test compatibility
function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "statusCode" in error &&
      typeof (error as Record<string, unknown>).code === "string" &&
      typeof (error as Record<string, unknown>).statusCode === "number")
  );
}

export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Known application errors
  if (isAppError(error)) {
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  // Unknown errors - log and return generic 500
  logger.error("Unhandled error", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestId: request.id,
    method: request.method,
    url: request.url,
  });

  void reply.status(500).send({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}
```

## Error Response Format

All errors follow the same JSON structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* optional additional context */ }
}
```

### Example Responses

**Validation Error (400):**

```json
{
  "error": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "value": "not-an-email"
  }
}
```

**Unauthorized (401):**

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Forbidden (403):**

```json
{
  "error": "You cannot delete this tool",
  "code": "FORBIDDEN"
}
```

**Not Found (404):**

```json
{
  "error": "User not found: abc-123",
  "code": "NOT_FOUND"
}
```

**Conflict (409):**

```json
{
  "error": "Email already registered",
  "code": "CONFLICT"
}
```

**Rate Limited (429):**

```json
{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 5,
    "remaining": 0,
    "resetAt": "2026-01-14T12:00:00Z",
    "retryAfter": "45",
    "message": "For security, login attempts are limited to 5 per minute."
  }
}
```

**Internal Error (500):**

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

::: warning Never Expose Stack Traces
Stack traces are logged server-side but never returned to clients. This prevents leaking implementation details.
:::

## Error Codes

Standard error codes used across the application:

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Adding Details to Errors

Use the `details` parameter for additional context:

```typescript
// With object details
throw new ValidationError("Invalid input", {
  field: "password",
  reason: "Must be at least 8 characters",
  received: 5,
});

// Error response includes details
// {
//   "error": "Invalid input",
//   "code": "VALIDATION_ERROR",
//   "details": {
//     "field": "password",
//     "reason": "Must be at least 8 characters",
//     "received": 5
//   }
// }
```

## Creating Custom Errors

For domain-specific errors, extend `AppError`:

```typescript
import { AppError } from "@raptscallions/core";

export class InsufficientTokensError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient tokens: need ${required}, have ${available}`,
      "INSUFFICIENT_TOKENS",
      402, // Payment Required
      { required, available }
    );
  }
}
```

## Best Practices

### Use specific error types

```typescript
// BAD - generic error
throw new Error("User not found");

// GOOD - specific error type
throw new NotFoundError("User", userId);
```

### Keep messages user-friendly

```typescript
// BAD - technical message
throw new ForbiddenError("RBAC check failed for action:delete on resource:tool");

// GOOD - user-friendly message
throw new ForbiddenError("You cannot delete this tool");
```

### Don't expose internal details

```typescript
// BAD - exposes database error
throw new Error(dbError.message);

// GOOD - log internally, return generic
logger.error("Database error", { error: dbError });
throw new AppError("Failed to save user", "DB_ERROR", 500);
```

### Use consistent error codes

Always use the standard codes from `ErrorCode` enum. This helps clients handle errors programmatically.

## Related Pages

- [Validation](/api/patterns/validation) — Validation errors from Zod
- [Route Handlers](/api/patterns/route-handlers) — Throwing errors in routes
- [Request Lifecycle](/api/concepts/request-lifecycle) — How errors flow through hooks
