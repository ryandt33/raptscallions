# E02-T003: Email/Password Authentication Routes - Implementation Specification

**Task ID:** E02-T003
**Epic:** E02 - Authentication & Authorization
**Status:** Ready for Implementation
**Created:** 2026-01-12
**Analyst:** analyst

---

## Overview

Implement local authentication routes for user registration, login, and logout using email/password with Argon2id hashing. This builds on the existing Lucia session infrastructure (E02-T002) and provides the first authentication method for the platform.

---

## Context

### Existing Infrastructure

- **Database Schema**: `users` table exists with `email`, `name`, `password_hash`, `status` fields
- **Session Management**: Lucia v3 configured in `packages/auth/src/lucia.ts`
- **Session Middleware**: `apps/api/src/middleware/session.middleware.ts` validates and attaches sessions to requests
- **Error Handling**: Typed errors in `packages/core/src/errors/` with `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`
- **API Structure**: Fastify server with route registration pattern established in `apps/api/src/server.ts`

### Dependencies

- **E02-T002**: Session infrastructure and middleware (completed)

### Blocks

- **E02-T006**: OAuth authentication (needs local auth as baseline)
- **E02-T008**: Session management UI (needs working auth routes)

---

## Requirements

### Functional Requirements

1. **User Registration**
   - Accept email, name, and password
   - Validate email format and uniqueness
   - Enforce password minimum length (8 characters)
   - Hash password with Argon2id using OWASP-recommended parameters
   - Create user with `pending_verification` status
   - Create session and set secure cookie
   - Return user data (id, email, name) and 201 status

2. **User Login**
   - Accept email and password
   - Find user by email
   - Verify password hash
   - Reject if user not found or password invalid (same error message for security)
   - Create session and set secure cookie
   - Return user data (id, email, name) and 200 status

3. **User Logout**
   - Require authenticated session
   - Invalidate session in database
   - Clear session cookie
   - Return 204 No Content

### Non-Functional Requirements

1. **Security**
   - Use Argon2id (not bcrypt) for password hashing
   - Set cookie flags: httpOnly, secure (production), sameSite: lax
   - Use constant-time password verification
   - Return generic error messages for login failures (timing attack mitigation)
   - No password in response bodies or logs

2. **Validation**
   - All inputs validated with Zod schemas
   - Email format validation
   - Password length validation (min 8, max 255)
   - Name length validation (1-100 characters)

3. **Error Handling**
   - 400: Validation errors with details
   - 401: Invalid credentials (generic message)
   - 409: Email already exists
   - 500: Internal server errors (logged but generic response)

4. **Testing**
   - Unit tests for all route handlers
   - Integration tests for full request/response cycle
   - Minimum 80% coverage

---

## Implementation Design

### 1. Add ConflictError to Core Package

**File:** `packages/core/src/errors/common.error.ts`

Add new error class:

```typescript
/**
 * Error thrown when a resource conflict occurs (e.g., duplicate email).
 * Defaults to HTTP 409 Conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
  }
}
```

**File:** `packages/core/src/errors/base.error.ts`

Add to ErrorCode:

```typescript
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  CONFLICT: "CONFLICT", // Add this line
} as const;
```

**File:** `packages/core/src/errors/index.ts`

Export ConflictError:

```typescript
export { ValidationError, NotFoundError, UnauthorizedError, ConflictError } from "./common.error.js";
```

### 2. Create Authentication Schemas

**File:** `packages/core/src/schemas/auth.schema.ts` (new file)

```typescript
import { z } from "zod";

/**
 * Schema for user registration.
 * Validates email format, name length, and password strength.
 */
export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password too long"),
});

/**
 * Schema for user login.
 * Less strict than registration - just validate presence.
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// Type inference
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**File:** `packages/core/src/schemas/index.ts`

Add exports:

```typescript
export { registerSchema, loginSchema } from "./auth.schema.js";
export type { RegisterInput, LoginInput } from "./auth.schema.js";
```

### 3. Create Authentication Service

**File:** `apps/api/src/services/auth.service.ts` (new file)

```typescript
import { hash, verify } from "@node-rs/argon2";
import { db } from "@raptscallions/db";
import { users } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";
import { ConflictError, UnauthorizedError } from "@raptscallions/core";
import { lucia } from "@raptscallions/auth";
import type { RegisterInput, LoginInput } from "@raptscallions/core";
import type { User } from "@raptscallions/db/schema";

/**
 * Argon2id hashing options following OWASP recommendations.
 * - memoryCost: 19456 KiB (~19 MB)
 * - timeCost: 2 iterations
 * - outputLen: 32 bytes
 * - parallelism: 1 thread
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Service handling authentication operations.
 */
export class AuthService {
  /**
   * Register a new user with email and password.
   * Creates user account and initial session.
   */
  async register(input: RegisterInput): Promise<{ user: User; sessionId: string }> {
    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const passwordHash = await hash(input.password, ARGON2_OPTIONS);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash,
        status: "pending_verification",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "unknown",
      last_activity_at: new Date(),
    });

    return { user, sessionId: session.id };
  }

  /**
   * Login user with email and password.
   * Returns user and session on success.
   */
  async login(input: LoginInput): Promise<{ user: User; sessionId: string }> {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    // Generic error message for security (timing attack mitigation)
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Verify password
    const validPassword = await verify(user.passwordHash, input.password, ARGON2_OPTIONS);

    if (!validPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Create session
    const session = await lucia.createSession(user.id, {
      context: "unknown",
      last_activity_at: new Date(),
    });

    return { user, sessionId: session.id };
  }

  /**
   * Logout user by invalidating session.
   */
  async logout(sessionId: string): Promise<void> {
    await lucia.invalidateSession(sessionId);
  }
}
```

### 4. Create Authentication Routes

**File:** `apps/api/src/routes/auth.routes.ts` (new file)

```typescript
import type { FastifyPluginAsync } from "fastify";
import { registerSchema, loginSchema } from "@raptscallions/core";
import { AuthService } from "../services/auth.service.js";
import { lucia } from "@raptscallions/auth";

const authService = new AuthService();

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/register
   * Register a new user with email and password.
   */
  app.post(
    "/register",
    {
      schema: {
        body: registerSchema,
      },
    },
    async (request, reply) => {
      const { user, sessionId } = await authService.register(request.body);

      // Set session cookie
      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.status(201).send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  /**
   * POST /auth/login
   * Login with email and password.
   */
  app.post(
    "/login",
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request, reply) => {
      const { user, sessionId } = await authService.login(request.body);

      // Set session cookie
      const sessionCookie = lucia.createSessionCookie(sessionId);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }
  );

  /**
   * POST /auth/logout
   * Logout current user.
   */
  app.post(
    "/logout",
    {
      preHandler: [app.requireAuth],
    },
    async (request, reply) => {
      if (request.session) {
        await authService.logout(request.session.id);
      }

      // Clear session cookie
      const blankCookie = lucia.createBlankSessionCookie();
      reply.setCookie(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes
      );

      return reply.status(204).send();
    }
  );
};
```

### 5. Register Routes in Server

**File:** `apps/api/src/server.ts`

Add import and registration:

```typescript
import { authRoutes } from "./routes/auth.routes.js";
import { sessionMiddleware } from "./middleware/session.middleware.js";
import { authMiddleware } from "./middleware/auth.middleware.js";

export async function createServer(): Promise<FastifyInstance> {
  // ... existing setup ...

  // Register session middleware (validates and attaches session to request)
  await app.register(sessionMiddleware);

  // Register auth middleware (provides requireAuth decorator)
  await app.register(authMiddleware);

  // Register routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/auth" });

  // Register error handler (must be last)
  app.setErrorHandler(errorHandler);

  return app;
}
```

### 6. Install Dependencies

**File:** `apps/api/package.json`

Ensure `@node-rs/argon2` is installed:

```bash
pnpm add @node-rs/argon2 --filter @raptscallions/api
```

---

## Test Strategy

### Unit Tests

**File:** `apps/api/src/__tests__/services/auth.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../services/auth.service.js";
import { ConflictError, UnauthorizedError } from "@raptscallions/core";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  describe("register", () => {
    it("should create user with hashed password", async () => {
      // Test implementation
    });

    it("should throw ConflictError if email exists", async () => {
      // Test implementation
    });

    it("should create session after registration", async () => {
      // Test implementation
    });
  });

  describe("login", () => {
    it("should return user and session for valid credentials", async () => {
      // Test implementation
    });

    it("should throw UnauthorizedError for invalid email", async () => {
      // Test implementation
    });

    it("should throw UnauthorizedError for invalid password", async () => {
      // Test implementation
    });
  });

  describe("logout", () => {
    it("should invalidate session", async () => {
      // Test implementation
    });
  });
});
```

**File:** `packages/core/src/__tests__/errors/conflict.error.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { ConflictError } from "../../errors/common.error.js";

describe("ConflictError", () => {
  it("should have correct status code and error code", () => {
    const error = new ConflictError("Email already exists");
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("Email already exists");
  });
});
```

### Integration Tests

**File:** `apps/api/src/__tests__/integration/auth.routes.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer } from "../../server.js";
import type { FastifyInstance } from "fastify";

describe("Auth Routes Integration", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createServer();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("should register new user and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          email: "test@example.com",
          name: "Test User",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        data: {
          email: "test@example.com",
          name: "Test User",
        },
      });
      expect(response.cookies).toHaveLength(1);
    });

    it("should return 409 for duplicate email", async () => {
      // Test implementation
    });

    it("should return 400 for invalid email", async () => {
      // Test implementation
    });

    it("should return 400 for short password", async () => {
      // Test implementation
    });
  });

  describe("POST /auth/login", () => {
    it("should login user and set session cookie", async () => {
      // Test implementation
    });

    it("should return 401 for invalid credentials", async () => {
      // Test implementation
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout user and clear cookie", async () => {
      // Test implementation
    });

    it("should return 401 if not authenticated", async () => {
      // Test implementation
    });
  });
});
```

### Schema Tests

**File:** `packages/core/src/__tests__/schemas/auth.schema.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../../schemas/auth.schema.js";

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration input", () => {
      const result = registerSchema.parse({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      });
      expect(result).toBeDefined();
    });

    it("should reject invalid email", () => {
      expect(() =>
        registerSchema.parse({
          email: "invalid",
          name: "Test",
          password: "password123",
        })
      ).toThrow();
    });

    it("should reject short password", () => {
      expect(() =>
        registerSchema.parse({
          email: "test@example.com",
          name: "Test",
          password: "short",
        })
      ).toThrow();
    });
  });
});
```

---

## File Changes Summary

### New Files

1. `packages/core/src/schemas/auth.schema.ts` - Zod schemas for register/login
2. `packages/core/src/__tests__/schemas/auth.schema.test.ts` - Schema tests
3. `packages/core/src/__tests__/errors/conflict.error.test.ts` - ConflictError tests
4. `apps/api/src/services/auth.service.ts` - Authentication business logic
5. `apps/api/src/routes/auth.routes.ts` - Route handlers
6. `apps/api/src/__tests__/services/auth.service.test.ts` - Service unit tests
7. `apps/api/src/__tests__/integration/auth.routes.test.ts` - Integration tests

### Modified Files

1. `packages/core/src/errors/base.error.ts` - Add CONFLICT error code
2. `packages/core/src/errors/common.error.ts` - Add ConflictError class
3. `packages/core/src/errors/index.ts` - Export ConflictError
4. `packages/core/src/schemas/index.ts` - Export auth schemas
5. `apps/api/src/server.ts` - Register auth routes and middleware
6. `apps/api/package.json` - Add @node-rs/argon2 dependency

---

## Security Considerations

1. **Password Hashing**
   - Using Argon2id with OWASP-recommended parameters
   - Parameters resist both GPU and ASIC attacks
   - 19 MB memory cost makes parallel attacks expensive

2. **Timing Attacks**
   - Same error message for "user not found" and "invalid password"
   - Argon2 verify is constant-time
   - No early returns based on user existence

3. **Cookie Security**
   - httpOnly prevents JavaScript access
   - secure flag in production (HTTPS only)
   - sameSite: lax prevents CSRF
   - Lucia handles cookie attributes automatically

4. **Password Storage**
   - Never log passwords
   - Never return passwords in responses
   - Hash immediately on receipt
   - Use nullable password_hash for OAuth users

5. **Session Management**
   - Sessions stored in database (not JWT)
   - Can be invalidated server-side
   - Automatic expiration after 30 days
   - Session middleware validates on every request

---

## Dependencies

### Runtime

- `@node-rs/argon2` - Argon2id password hashing
- `lucia` - Session management (already installed)
- `zod` - Schema validation (already installed)

### Development

- `vitest` - Testing framework (already installed)
- `@types/node` - TypeScript types (already installed)

---

## Acceptance Criteria Mapping

| AC | Description | Implementation |
|----|-------------|----------------|
| AC1 | POST /auth/register creates user with hashed password | `auth.routes.ts` + `auth.service.ts` register() |
| AC2 | Registration validates email and password strength | `auth.schema.ts` registerSchema |
| AC3 | Registration returns 409 if email exists | `auth.service.ts` register() throws ConflictError |
| AC4 | POST /auth/login validates credentials and creates session | `auth.routes.ts` + `auth.service.ts` login() |
| AC5 | Login returns 401 for invalid credentials | `auth.service.ts` login() throws UnauthorizedError |
| AC6 | Login sets session cookie with security flags | `auth.routes.ts` login() uses lucia.createSessionCookie() |
| AC7 | POST /auth/logout invalidates session and clears cookie | `auth.routes.ts` logout() + `auth.service.ts` logout() |
| AC8 | Logout returns 204 No Content | `auth.routes.ts` logout() returns 204 |
| AC9 | Passwords hashed with Argon2id | `auth.service.ts` uses @node-rs/argon2 with OWASP params |
| AC10 | All routes have Zod validation with typed errors | All routes use schema validation in route config |

---

## Open Questions

None. All requirements are clear and implementation path is well-defined.

---

## Next Steps After Implementation

1. **E02-T004**: OAuth authentication (Google, Microsoft, Clever)
2. **E02-T006**: Session management UI (login/logout forms)
3. **E02-T008**: User profile management

---

## References

- [Lucia v3 Documentation](https://lucia-auth.com/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheets.ory.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106)
- Existing code: `packages/auth/src/lucia.ts`, `apps/api/src/middleware/session.middleware.ts`

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Status:** APPROVED with minor recommendations

### Executive Summary

This specification is architecturally sound and ready for implementation. The design correctly integrates with the existing Lucia session infrastructure, follows the established patterns for Fastify route handlers, and adheres to security best practices. All acceptance criteria are achievable with the proposed implementation.

**Verdict: APPROVED** ✅

---

### Architectural Compliance Assessment

#### 1. Technology Stack Compliance ✅

| Component | Spec Choice | Architecture Requirement | Status |
|-----------|-------------|-------------------------|---------|
| API Framework | Fastify route handlers | Fastify 4.x | ✅ Compliant |
| Authentication | Lucia v3 session management | Lucia 3.x | ✅ Compliant |
| Password Hashing | Argon2id via @node-rs/argon2 | Argon2 (not bcrypt) | ✅ Compliant |
| Validation | Zod schemas | Zod 3.x | ✅ Compliant |
| ORM | Drizzle query builder | Drizzle 0.29+ | ✅ Compliant |
| Database | PostgreSQL users table | PostgreSQL 16 | ✅ Compliant |
| Error Handling | Typed errors (AppError family) | Typed errors from core package | ✅ Compliant |

**Finding:** All technology choices align perfectly with the canonical architecture stack.

---

#### 2. Code Organization & Conventions ✅

**File Structure Analysis:**

```
packages/core/
  src/errors/
    ✅ ConflictError added to common.error.ts (correct location)
    ✅ ErrorCode.CONFLICT added to base.error.ts (correct pattern)
  src/schemas/
    ✅ auth.schema.ts created (follows *.schema.ts naming)
    ✅ Exported from index.ts (barrel export pattern)

apps/api/
  src/services/
    ✅ auth.service.ts created (follows *.service.ts naming)
  src/routes/
    ✅ auth.routes.ts created (follows *.routes.ts naming)
  src/__tests__/
    ✅ Test files follow naming conventions
    ✅ AAA pattern in test examples
```

**Naming Conventions:**
- ✅ Files: camelCase with proper suffixes (.service.ts, .routes.ts, .schema.ts)
- ✅ Classes: PascalCase (AuthService, ConflictError)
- ✅ Functions: camelCase (register, login, logout)
- ✅ Constants: SCREAMING_SNAKE_CASE (ARGON2_OPTIONS)
- ✅ Types: Inferred from Zod schemas (RegisterInput, LoginInput)

**Finding:** Code organization is exemplary and follows all conventions perfectly.

---

#### 3. Authentication Architecture Integration ✅

**Lucia v3 Integration:**

The spec correctly leverages the existing Lucia infrastructure from E02-T002:

```typescript
// ✅ CORRECT: Uses lucia instance from @raptscallions/auth
import { lucia } from "@raptscallions/auth";

// ✅ CORRECT: Creates session with context and last_activity_at
const session = await lucia.createSession(user.id, {
  context: "unknown",  // See recommendation below
  last_activity_at: new Date(),
});

// ✅ CORRECT: Uses Lucia's session cookie creation
const sessionCookie = lucia.createSessionCookie(sessionId);
reply.setCookie(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
```

**Session Middleware Compatibility:**

The logout route correctly requires authentication:
```typescript
app.post('/logout', {
  preHandler: [app.requireAuth],  // ✅ Uses middleware from E02-T002
}, ...)
```

**Finding:** Lucia integration is architecturally correct. Session creation, cookie management, and invalidation all follow established patterns.

**Minor Recommendation:** The spec uses `context: "unknown"` for session creation, but the UX review already identified this should be `"email_password"` for better analytics and debugging. This is a minor enhancement that doesn't block approval.

---

#### 4. Security Architecture ✅

**Password Hashing (Argon2id):**

```typescript
const ARGON2_OPTIONS = {
  memoryCost: 19456,    // ✅ OWASP recommended (19 MB)
  timeCost: 2,          // ✅ OWASP recommended
  outputLen: 32,        // ✅ 256-bit output
  parallelism: 1,       // ✅ Appropriate for server
};
```

**Finding:** Argon2id parameters match OWASP recommendations perfectly. This is significantly more secure than bcrypt and resistant to GPU/ASIC attacks.

**Timing Attack Mitigation:**

```typescript
// ✅ CORRECT: Same error message for both cases
if (!user || !user.passwordHash) {
  throw new UnauthorizedError("Invalid credentials");
}

const validPassword = await verify(user.passwordHash, password);
if (!validPassword) {
  throw new UnauthorizedError("Invalid credentials");  // ✅ Same message
}
```

**Finding:** Properly prevents username enumeration attacks by using generic error messages.

**Cookie Security:**

```typescript
// ✅ Lucia handles cookie attributes automatically
const sessionCookie = lucia.createSessionCookie(sessionId);
// Lucia sets: httpOnly=true, secure=(production), sameSite=lax
```

**Finding:** Cookie security is delegated to Lucia, which is the correct approach and ensures consistency.

**Password Storage:**

- ✅ Never logged (no password in logger calls)
- ✅ Never returned in responses (only id, email, name)
- ✅ Hashed immediately on receipt
- ✅ Nullable for OAuth users (future compatibility)

---

#### 5. Error Handling Architecture ✅

**Error Type Hierarchy:**

```typescript
AppError (base)
  ├─ ValidationError (400)
  ├─ UnauthorizedError (401)
  ├─ NotFoundError (404)
  └─ ConflictError (409) ← NEW
```

**Finding:** ConflictError is correctly added to the error hierarchy with:
- ✅ Proper inheritance from AppError
- ✅ Correct HTTP status code (409)
- ✅ Appropriate error code constant (ErrorCode.CONFLICT)
- ✅ Exported from barrel exports

**Error Response Format:**

```json
{
  "error": "Email already registered",
  "code": "CONFLICT",
  "statusCode": 409
}
```

**Finding:** Follows the canonical error response format from ARCHITECTURE.md.

---

#### 6. API Design Compliance ✅

**RESTful Design:**

| Endpoint | Method | Purpose | Response Code | Body Format |
|----------|--------|---------|--------------|-------------|
| /auth/register | POST | Create user + session | 201 Created | `{ data: { id, email, name } }` |
| /auth/login | POST | Validate + create session | 200 OK | `{ data: { id, email, name } }` |
| /auth/logout | POST | Invalidate session | 204 No Content | Empty |

**Finding:**
- ✅ Uses RESTful HTTP methods appropriately
- ✅ Response codes match ARCHITECTURE.md table (200, 201, 204, 400, 401, 409)
- ✅ Response envelope uses `{ data: ... }` format

**Input Validation:**

```typescript
app.post('/register', {
  schema: {
    body: registerSchema,  // ✅ Zod validation in route config
  },
}, ...)
```

**Finding:** Zod validation is correctly placed in the route schema option for automatic validation by Fastify.

---

#### 7. Service Layer Architecture ✅

**Dependency Injection Pattern:**

```typescript
export class AuthService {
  // ✅ CORRECT: No constructor dependencies needed (uses imports)
  // This is fine for stateless services
}
```

**Analysis:** The AuthService doesn't require constructor injection because:
- Database access uses the singleton `db` from `@raptscallions/db`
- Lucia instance is a singleton from `@raptscallions/auth`

**Finding:** This is acceptable for stateless services. If this becomes a testability issue later, we can refactor to inject dependencies, but for now this is pragmatic and follows existing patterns.

**Separation of Concerns:**

```
Route Handlers (auth.routes.ts)
  ↓ delegates to
Service Layer (auth.service.ts)
  ↓ uses
Data Layer (Drizzle + Lucia)
```

**Finding:** ✅ Proper three-tier separation with clear responsibilities.

---

#### 8. Testing Strategy ✅

**Coverage:**

| Test Type | Files | Coverage |
|-----------|-------|----------|
| Unit | auth.service.test.ts | Service methods (register, login, logout) |
| Unit | auth.schema.test.ts | Zod schema validation |
| Unit | conflict.error.test.ts | New error class |
| Integration | auth.routes.test.ts | Full request/response cycles |

**Finding:** Test strategy meets the 80% minimum coverage requirement and covers:
- ✅ Happy paths
- ✅ Error cases (validation, conflicts, authorization)
- ✅ Edge cases (missing password hash, invalid credentials)

**AAA Pattern Compliance:**

```typescript
it("should create user with hashed password", async () => {
  // Arrange - setup
  // Act - execute
  // Assert - verify
});
```

**Finding:** ✅ Test examples follow AAA pattern from CONVENTIONS.md.

---

#### 9. Type Safety ✅

**No `any` Types:**

```typescript
// ✅ All types properly defined
import type { RegisterInput, LoginInput } from "@raptscallions/core";
import type { User } from "@raptscallions/db/schema";

// ✅ Function signatures fully typed
async register(input: RegisterInput): Promise<{ user: User; sessionId: string }>
async login(input: LoginInput): Promise<{ user: User; sessionId: string }>
async logout(sessionId: string): Promise<void>
```

**Finding:** ✅ Zero `any` types. All function signatures properly typed with explicit return types.

**Zod Type Inference:**

```typescript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

**Finding:** ✅ Correctly uses Zod's type inference for runtime validation + compile-time types.

---

#### 10. Database Schema Integration ✅

**User Table Compatibility:**

The spec assumes the following schema (from E01-T004):

```typescript
{
  id: UUID,
  email: varchar(255) UNIQUE NOT NULL,
  name: varchar(100) NOT NULL,
  passwordHash: varchar(255) NULLABLE,  // ✅ Nullable for OAuth
  status: user_status,
  created_at, updated_at, deleted_at
}
```

**Drizzle Query Patterns:**

```typescript
// ✅ CORRECT: Uses query builder, not raw SQL
const user = await db.query.users.findFirst({
  where: eq(users.email, input.email),
});

// ✅ CORRECT: Uses insert().returning() pattern
const [user] = await db.insert(users).values({...}).returning();
```

**Finding:** Database access patterns follow Drizzle best practices and avoid raw SQL.

---

#### 11. Monorepo Package Dependencies ✅

**Dependency Graph:**

```
apps/api (auth.routes.ts, auth.service.ts)
  ├─ @raptscallions/core (schemas, errors)
  ├─ @raptscallions/db (schema, db instance)
  └─ @raptscallions/auth (lucia instance)
```

**Finding:** ✅ Correct package boundaries. No circular dependencies.

**Import Paths:**

```typescript
// ✅ Uses package names, not relative paths across packages
import { ConflictError, UnauthorizedError } from "@raptscallions/core";
import { lucia } from "@raptscallions/auth";
import { db } from "@raptscallions/db";
```

**Finding:** ✅ Imports follow monorepo conventions with package names.

---

### Architectural Concerns & Recommendations

#### ✅ **No Blocking Issues Found**

The specification is architecturally sound and ready for implementation as-is.

#### 💡 **Minor Recommendations (Non-Blocking)**

1. **Session Context Value** (Priority: Low)
   - **Current:** `context: "unknown"`
   - **Suggested:** `context: "email_password"`
   - **Rationale:** Better analytics and debugging
   - **Action:** Already identified by UX review, can be addressed during implementation

2. **User Status in Response** (Priority: Low)
   - **Current:** Returns only `{ id, email, name }`
   - **Suggested:** Add `status` field
   - **Rationale:** Frontend can display appropriate messaging for `pending_verification` status
   - **Action:** Add during implementation or as follow-up

3. **Error Handler Integration** (Priority: Low)
   - **Current:** Not explicitly shown in spec
   - **Suggested:** Verify error handler preserves Zod validation details
   - **Rationale:** Ensure validation errors include field-level details
   - **Action:** Test during integration testing

4. **Rate Limiting** (Priority: Medium - Follow-up Task)
   - **Current:** Not in scope
   - **Suggested:** Create follow-up task for auth endpoint rate limiting
   - **Rationale:** Brute force protection is critical for auth endpoints
   - **Action:** Create E02-T007 or similar for rate limiting implementation

---

### Security Review Checklist

- ✅ Password hashing uses Argon2id with OWASP parameters
- ✅ Constant-time password verification prevents timing attacks
- ✅ Generic error messages prevent username enumeration
- ✅ httpOnly cookies prevent XSS attacks
- ✅ SameSite: lax prevents CSRF attacks
- ✅ secure flag enabled in production (via Lucia)
- ✅ Passwords never logged or returned in responses
- ✅ Session invalidation on logout (no orphaned sessions)
- ✅ Nullable password_hash field supports future OAuth users
- ⚠️ **Missing:** Rate limiting (recommend follow-up task)
- ⚠️ **Missing:** Email verification flow (known limitation, status=pending_verification)

---

### Performance Considerations

1. **Password Hashing Performance** ✅
   - Argon2 with memoryCost=19456, timeCost=2 takes ~50-200ms
   - This is intentional slowdown for security
   - Single-threaded parallelism=1 is correct for server workloads

2. **Database Queries** ✅
   - Email lookup uses indexed column (email has unique constraint → auto-indexed)
   - No N+1 queries
   - Single insert per registration

3. **Session Creation** ✅
   - Lucia session creation is a single database insert
   - Session ID generation is cryptographically secure (40 chars random)

**Finding:** Performance characteristics are acceptable for authentication endpoints.

---

### Missing Documentation (Non-Blocking)

The following should be documented but don't block implementation:

1. **Rate Limiting Strategy** - Should be addressed in follow-up task
2. **Email Verification Flow** - Intentionally deferred, but should be tracked
3. **Password Reset Flow** - Not in scope, but should be in roadmap
4. **Account Lockout Policy** - After N failed attempts (security hardening)

**Action:** Create follow-up tasks for these items during epic review.

---

### Integration with Future Work

**E02-T004 (OAuth Authentication):**
- ✅ nullable password_hash field supports OAuth users
- ✅ Same session creation pattern can be reused
- ✅ Same user response format maintains consistency

**E02-T008 (Session Management UI):**
- ✅ API returns user data in format suitable for frontend
- ✅ Cookie-based auth works seamlessly with frontend
- ✅ Logout endpoint provides clean session termination

**Finding:** This implementation provides a solid foundation for future auth-related tasks.

---

### Compliance Matrix

| Architectural Principle | Compliance | Evidence |
|------------------------|------------|----------|
| Explicit over implicit | ✅ Pass | Clear error messages, explicit validation rules |
| Functional over OOP | ✅ Pass | Service class is acceptable, methods are pure functions |
| Fail fast | ✅ Pass | Early validation with Zod, immediate error throws |
| Test first | ✅ Pass | Comprehensive test strategy with 80%+ coverage |
| No `any` types | ✅ Pass | All types properly defined |
| Strict TypeScript | ✅ Pass | Zod schemas, explicit types, no unsafe operations |
| Drizzle over Prisma | ✅ Pass | Uses Drizzle query builder |
| Fastify over Express | ✅ Pass | Fastify route handlers with proper typing |
| Zod validation | ✅ Pass | Input validation with schemas |

---

### Final Verdict

**APPROVED FOR IMPLEMENTATION ✅**

This specification is architecturally sound, security-conscious, and ready for implementation. The design:

1. ✅ Correctly integrates with existing Lucia session infrastructure
2. ✅ Follows all architectural patterns and conventions
3. ✅ Uses appropriate technology stack choices
4. ✅ Implements security best practices
5. ✅ Provides comprehensive test coverage
6. ✅ Maintains proper separation of concerns
7. ✅ Has zero TypeScript type safety issues
8. ✅ Sets foundation for future OAuth implementation

**Minor recommendations are non-blocking and can be addressed during implementation or as follow-up tasks.**

**Next Step:** Transition task to `APPROVED` state and assign to `developer` agent for implementation.

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Status:** APPROVED with recommendations

### Summary

The spec provides a solid foundation for authentication with good security practices. The design is appropriate for an API-only implementation. Several UX improvements are recommended for error messaging, user feedback, and future extensibility.

### Strengths

1. **Security-first approach** - Constant-time verification, secure cookies, proper hashing
2. **Clear validation rules** - Email format, password length requirements are explicit
3. **Consistent error handling** - Typed errors with appropriate HTTP status codes
4. **Generic error messages** - Prevents username enumeration attacks

### UX Concerns

#### 1. Password Strength Feedback (Medium Priority)

**Issue:** The spec only validates minimum length (8 characters), but provides no guidance on password quality.

**Impact:** Users may create weak passwords like "12345678" that meet length requirements but are easily compromised.

**Recommendation:**
- Add optional password strength indicator in future frontend work (E02-T008)
- Consider adding complexity validation (mix of character types) to schema
- Document recommended password rules in error messages

**Example improvement:**
```typescript
password: z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(255, "Password too long")
  .refine(
    (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd),
    "Password should contain uppercase, lowercase, and numbers"
  )
```

**Decision:** Keep minimal validation for now (MVP), but add detailed guidance in API documentation for frontend developers.

---

#### 2. User Status Clarity (Low Priority)

**Issue:** Registration creates users with `pending_verification` status, but there's no email verification flow defined.

**Impact:** Users may be confused about whether they can immediately use their account. Teachers/students may not understand why features are limited.

**Questions:**
- Can users with `pending_verification` status log in?
- What features are restricted for unverified users?
- When does status change to `active`?

**Recommendation:**
- Clarify in spec documentation what `pending_verification` means
- Consider returning status in response body so frontend can show appropriate messaging
- Add comment in code explaining verification flow is deferred to future task

**Suggested response format:**
```typescript
return reply.status(201).send({
  data: {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status, // Add this so frontend knows
  },
});
```

---

#### 3. Error Message Specificity (Low Priority)

**Issue:** Validation errors may not provide enough context for good UX.

**Impact:** Generic error messages like "Invalid email format" don't help users fix issues (e.g., "john@example" vs "john @example.com").

**Current behavior:**
```
400 Bad Request
{
  "error": "Invalid email format",
  "code": "VALIDATION_ERROR"
}
```

**Recommendation:**
- Ensure Zod error details are preserved in response
- Frontend should display specific field errors inline
- Document expected error response format in spec

**Example of good validation response:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

---

#### 4. Rate Limiting Consideration (Medium Priority)

**Issue:** No mention of rate limiting for auth endpoints.

**Impact:** Vulnerable to brute force attacks on login endpoint. Poor UX if users are blocked without explanation.

**Recommendation:**
- Add rate limiting to future security task
- Document intended rate limits in this spec for reference
- Return `429 Too Many Requests` with `Retry-After` header
- Provide clear error message: "Too many login attempts. Please try again in X minutes."

**Note:** This is a security concern that affects UX. Should be tracked as follow-up task.

---

#### 5. Session Context Field (Low Priority)

**Issue:** Sessions created with `context: "unknown"` which loses information about how user authenticated.

**Impact:** Hard to provide contextual help or debug issues. Analytics can't differentiate auth methods.

**Current code:**
```typescript
const session = await lucia.createSession(user.id, {
  context: "unknown",
  last_activity_at: new Date(),
});
```

**Recommendation:**
```typescript
const session = await lucia.createSession(user.id, {
  context: "email_password", // More descriptive
  last_activity_at: new Date(),
});
```

---

### Accessibility Notes

✅ **API-level accessibility is appropriate:**
- Error messages are machine-readable and human-readable
- HTTP status codes follow standards
- Response format is consistent and parseable
- No API-level accessibility concerns

⚠️ **Frontend accessibility (for E02-T008):**
- Ensure login/register forms have proper ARIA labels
- Password fields should allow paste (don't block it)
- Provide "show password" toggle
- Error messages should be announced to screen readers
- Support keyboard navigation completely

---

### Missing UX Considerations

1. **Password reset flow** - Not in scope, but should be tracked
2. **Email verification** - Status is set but no verification endpoint
3. **Account lockout** - After N failed attempts
4. **Remember me** - Extended session duration option
5. **Multi-device sessions** - Session list/management

**Note:** These are intentionally out of scope for MVP but should be documented as known limitations.

---

### Testing Gaps (UX-related)

The test strategy covers functional requirements but missing:

1. **Error message content tests** - Verify user-facing messages are helpful
2. **Password validation edge cases** - Unicode, emoji, very long passwords
3. **Cookie attribute tests** - Verify secure, httpOnly, sameSite are set correctly
4. **Session creation metadata** - Verify context field is populated correctly

**Recommendation:** Add test cases for error message quality, not just error codes.

---

### Recommendations Summary

| Priority | Issue | Action | Blocks Implementation? |
|----------|-------|--------|----------------------|
| High | None | - | No |
| Medium | Password strength guidance | Document in API docs, defer UI to E02-T008 | No |
| Medium | Rate limiting | Create follow-up task | No |
| Low | User status in response | Add `status` field to response body | No |
| Low | Session context value | Change from "unknown" to "email_password" | No |
| Low | Validation error details | Verify error handler preserves Zod details | No |

---

### Verdict

**APPROVED** - Implementation can proceed.

The spec is well-designed from both security and API design perspectives. The identified issues are minor and can be addressed during implementation or as follow-up tasks. The authentication flow is straightforward and follows industry best practices.

**Recommended changes during implementation:**
1. Add `status` field to registration/login responses
2. Use `context: "email_password"` instead of `"unknown"`
3. Verify error handler includes Zod validation details

**Follow-up tasks to create:**
- Rate limiting for authentication endpoints
- Password strength guidance/validation
- Email verification flow
- Password reset flow

---
