# Code Review: E02-T001 - Fastify API Server Foundation

**Task:** E02-T001
**Reviewer:** reviewer (fresh-eyes code review)
**Date:** 2026-01-12
**Verdict:** ❌ **NEEDS REVISION**

---

## Executive Summary

The implementation demonstrates **strong architectural alignment** and excellent code quality overall. The Fastify server foundation is well-structured with proper error handling, request logging, and health checks. TypeScript compilation passes cleanly, and 101 of 103 tests pass.

However, there are **2 critical test failures** that must be addressed before merging:

1. **Config module lazy loading test fails** - Test expects config import to throw on invalid environment, but proxy pattern delays validation
2. **AppError discrimination test fails** - Error handler duck-typing logic incorrectly identifies AppError instances

Additionally, several **architectural recommendations** from the spec were not fully implemented, particularly around operational observability.

**Recommendation:** Return to `IMPLEMENTING` state to fix test failures and address Must Fix issues.

---

## Test Results

### Summary

```
Test Files:  2 failed | 4 passed (6 total)
Tests:       2 failed | 101 passed (103 total)
Duration:    960ms
```

### TypeScript Compilation
✅ **PASS** - Zero TypeScript errors with strict mode enabled

### Test Coverage
- **config.test.ts:** 16/17 passed (1 failure)
- **error-handler.test.ts:** 12/13 passed (1 failure)
- **health.routes.test.ts:** 19/19 passed ✅
- **request-logger.test.ts:** 11/11 passed ✅
- **integration/health.test.ts:** 26/26 passed ✅
- **server.test.ts:** 17/17 passed ✅

---

## Critical Issues (MUST FIX)

### Issue #1: Config Import Test Failure ⚠️ BLOCKING

**Location:** `apps/api/src/config.ts:17-51`, Test at `config.test.ts:212-220`

**Problem:**
Test expects config module to throw on import when environment is invalid, but the proxy-based lazy loading pattern delays validation until first property access:

```typescript
// Current implementation (config.ts)
export const config = new Proxy({} as Env, {
  get(_target, prop: string | symbol): unknown {
    const parsed = parseConfig(); // ← Validation happens here, not at import
    return parsed[prop as keyof Env];
  },
});
```

**Failing Test:**
```typescript
it("should throw on import when environment is invalid", async () => {
  delete process.env.DATABASE_URL;

  await expect(async () => {
    await import("../config.js"); // ← Doesn't throw!
  }).rejects.toThrow();
});
```

**Root Cause:**
The proxy pattern was likely added to enable test imports without valid environment variables, but it breaks the **fail-fast principle** mandated by the spec (AC8). The spec requires validation to happen "on startup (before server starts)" but the current implementation delays validation.

**Impact:** High - violates fail-fast requirement, could allow server to partially start with invalid config

**Recommendation:**
Choose one approach:

**Option A - Keep fail-fast (spec-compliant):**
```typescript
// Immediate validation
export const config = envSchema.parse(process.env);
```
Then fix test isolation by resetting module cache or mocking `process.env` before import.

**Option B - Keep lazy loading (test-friendly):**
Update the test to trigger validation:
```typescript
await expect(async () => {
  const { config } = await import("../config.js");
  config.DATABASE_URL; // Trigger proxy getter
}).rejects.toThrow();
```

**Recommended:** Option A - The spec explicitly requires fail-fast behavior. Tests should adapt to the production requirements, not vice versa.

---

### Issue #2: AppError Type Guard Logic Error ⚠️ BLOCKING

**Location:** `apps/api/src/middleware/error-handler.ts:8-18`

**Problem:**
The duck-typing type guard for AppError is overly permissive and incorrectly identifies mock objects as AppErrors:

```typescript
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
```

**Failing Test:**
```typescript
it("should correctly identify AppError subclasses", async () => {
  const appErrors = [
    new ValidationError("Test"),
    new NotFoundError("Resource", "id"),
    new UnauthorizedError(),
    new AppError("Generic", "CODE"),
  ];

  for (const error of appErrors) {
    errorHandler(error, mockRequest, mockReply);

    const statusCall = (mockReply.status as Mock).mock.calls[0]?.[0];
    expect(statusCall).not.toBe(500); // ← Fails! Returns 500 instead of error.statusCode
  }
});
```

**Root Cause:**
The duck-typing fallback is likely matching test mocks or other objects that happen to have `code` and `statusCode` properties. However, the test shows that real `AppError` instances are NOT being correctly identified, which suggests the `instanceof` check is failing in the test environment.

**Impact:** High - AppErrors will be treated as generic errors in production, losing error code context

**Recommendation:**
Simplify the type guard to rely primarily on `instanceof`:

```typescript
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

If duck-typing is truly needed for test compatibility (which seems questionable), add a discriminant property to AppError:

```typescript
// In @raptscallions/core
export class AppError extends Error {
  readonly __isAppError = true; // Discriminant
  // ...
}

// In error handler
function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
     error !== null &&
     "__isAppError" in error &&
     error.__isAppError === true)
  );
}
```

---

## Major Issues (SHOULD FIX)

### Issue #3: UX Recommendation Not Implemented - Readiness Error Details

**Location:** `apps/api/src/routes/health.routes.ts:17-36`
**Spec Reference:** UX Review Issue #2 (Must Fix)

**Problem:**
The `/ready` endpoint returns `{ database: 'error' }` with no details about WHY the check failed. The spec's UX review (marked as "Must Fix") recommended including error details in the response.

**Current Implementation:**
```typescript
const checks = {
  database: "error" as "ok" | "error",
};

try {
  await queryClient.unsafe("SELECT 1");
  checks.database = "ok";
} catch (error) {
  logger.error("Database readiness check failed", { error });
}

return reply.status(statusCode).send({
  ready,
  checks,
});
```

**UX Review Recommendation (Spec line 1192-1217):**
```typescript
const checks: {
  database: 'ok' | 'error';
  databaseError?: string;
} = {
  database: 'error',
};

try {
  await queryClient.unsafe('SELECT 1');
  checks.database = 'ok';
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  checks.databaseError = errorMessage;
  logger.error({ error }, 'Database readiness check failed');
}
```

**Impact:** Medium - operators debugging 503 responses must check logs instead of response body

**Rationale:**
When Kubernetes pods fail readiness checks, having the error in the response ("Connection refused" vs "Authentication failed" vs "Timeout") dramatically speeds up debugging.

---

### Issue #4: UX Recommendation Not Implemented - Startup Error Logging

**Location:** `apps/api/src/index.ts:51-56`
**Spec Reference:** UX Review Issue #1 (Must Fix)

**Problem:**
Config validation errors are not logged with the structured logger before exiting. The spec's UX review marked this as "Must Fix" for operational consistency.

**Current Implementation:**
```typescript
// Handle startup errors
try {
  void start();
} catch (error) {
  logger.fatal("Startup failed", { error });
  process.exit(1);
}
```

This only catches synchronous errors. Config validation errors thrown by the Proxy will not be caught here.

**UX Review Recommendation (Spec line 1141-1169):**
Add explicit config validation error handling with both structured logging AND console output:

```typescript
import { getLogger } from '@raptscallions/telemetry';
import { z } from 'zod';

const logger = getLogger('api:config');

try {
  const config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.fatal(
      {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      'Invalid environment configuration'
    );
    console.error('❌ Invalid environment configuration:');
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}
```

**Impact:** Medium - production debugging harder when deployments fail

---

### Issue #5: UX Recommendation Not Implemented - Shutdown Timeout

**Location:** `apps/api/src/index.ts:29-46`
**Spec Reference:** UX Review Issue #4 (Should Fix)

**Problem:**
Graceful shutdown waits indefinitely. If in-flight requests hang, the server never exits and Kubernetes sends SIGKILL after 30s.

**Current Implementation:**
```typescript
process.on(signal, () => {
  void (async () => {
    logger.info("Shutting down gracefully", { signal });

    try {
      await app.close(); // ← No timeout
      logger.info("Server closed");

      await queryClient.end(); // ← No timeout
      logger.info("Database connections closed");

      process.exit(0);
    } catch (error) {
      logger.error("Error during shutdown", { error });
      process.exit(1);
    }
  })();
});
```

**Recommended (Spec line 1274-1302):**
```typescript
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

process.on(signal, () => {
  void (async () => {
    logger.info({ signal }, 'Shutting down gracefully');

    const shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      await app.close();
      logger.info('Server closed');

      await queryClient.end();
      logger.info('Database connections closed');

      clearTimeout(shutdownTimer);
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  })();
});
```

**Impact:** Low-Medium - prevents zombie processes in production

---

## Minor Issues (NICE TO HAVE)

### Issue #6: Package Dependency Version Mismatch

**Location:** `apps/api/package.json:19`

**Observation:**
Spec specifies `@fastify/cors@^10.0.1` but implementation uses `@fastify/cors@^9.0.1`

**Impact:** Very Low - v9 is stable and functional, but deviates from spec

**Recommendation:** Update to v10 to match spec, or document reason for v9

---

### Issue #7: Logger Parameter Order Inconsistency

**Location:** Multiple files

**Observation:**
Some logger calls use `(message, context)` while others use `(context, message)`. The @raptscallions/telemetry package likely expects `(context, message)` based on structured logging conventions.

**Examples:**

```typescript
// apps/api/src/index.ts:17-20 (CORRECT)
logger.info("Server listening", {
  port: config.PORT,
  env: config.NODE_ENV,
});

// apps/api/src/middleware/request-logger.ts:8-12 (CORRECT)
logger.info("Request started", {
  requestId: request.id,
  method: request.method,
  url: request.url,
});
```

Actually, on closer inspection, the implementation is consistent with `(message, context)` order. This is fine as long as the telemetry package supports it.

**Impact:** None if telemetry package supports both signatures

---

## Code Quality Assessment

### ✅ Strengths

1. **Excellent TypeScript Usage**
   - Zero `any` types used
   - Proper type imports with `import type`
   - Correct Fastify type annotations (`FastifyPluginAsync`, `FastifyInstance`)
   - Clean interface-based typing

2. **Strong Architectural Alignment**
   - Follows Fastify patterns (not Express)
   - Correct use of `preHandler` approach (implied in structure)
   - Server factory pattern enables testability
   - Proper separation of concerns (routes, middleware, config)

3. **Comprehensive Test Coverage**
   - 103 tests covering all major functionality
   - Integration tests verify end-to-end behavior
   - Good use of AAA pattern (Arrange/Act/Assert)
   - Proper test isolation with beforeEach/afterEach

4. **Clean Code Structure**
   - Consistent file naming (`*.routes.ts`, `*.middleware.ts`)
   - Logical module organization
   - No code duplication
   - Clear, readable implementations

5. **Operational Observability**
   - Structured logging throughout
   - Request ID tracking
   - Separate health (`/health`) and readiness (`/ready`) endpoints
   - Response time measurement

6. **Security Considerations**
   - CORS properly configured with explicit origins
   - Generic error messages for unknown errors (no stack traces exposed)
   - Request ID for correlation without exposing internals

### ⚠️ Concerns

1. **Test Failures Block Merge** (See Issues #1, #2)
2. **Spec Recommendations Not Fully Implemented** (See Issues #3, #4, #5)
3. **Config Module Design Trade-off** - Lazy loading vs fail-fast (See Issue #1)

---

## Acceptance Criteria Verification

| AC | Description | Status | Notes |
|----|-------------|--------|-------|
| AC1 | apps/api package created with TypeScript and Fastify 4.x | ✅ PASS | Package structure correct, deps installed |
| AC2 | Server starts on PORT from environment (default 3000) | ✅ PASS | Config validation works, defaults correct |
| AC3 | Health check endpoint GET /health returns { status, timestamp } | ✅ PASS | 19/19 health route tests pass |
| AC4 | Readiness check endpoint GET /ready validates DB connection | ⚠️ PARTIAL | Works but missing error details (Issue #3) |
| AC5 | Global error handler formats errors as { error, code, details } | ❌ FAIL | Type guard bug (Issue #2), test fails |
| AC6 | Request logging middleware logs all requests | ✅ PASS | 11/11 request logger tests pass |
| AC7 | Graceful shutdown handler closes server and DB connections | ⚠️ PARTIAL | Works but no timeout enforcement (Issue #5) |
| AC8 | Environment variables validated with Zod schema on startup | ⚠️ PARTIAL | Works but test fails due to lazy loading (Issue #1) |
| AC9 | CORS middleware configured with allowed origins | ✅ PASS | Integration tests verify CORS behavior |
| AC10 | Server builds and starts without errors | ✅ PASS | TypeCheck passes, server starts successfully |

**Summary:** 5 full pass, 4 partial pass, 1 fail (AC5)

---

## Architectural Review Compliance

The spec included Architecture Review recommendations. Checking compliance:

### ✅ Implemented

1. **Error handler type signature fixed** (Spec Issue #1)
   - Implementation uses `Error | FastifyError` correctly (line 21)

2. **Database client import verified** (Spec Issue #2)
   - Uses `queryClient` from `@raptscallions/db` successfully
   - Integration tests confirm it works

### ❌ Not Implemented (from UX Review "Must Fix")

1. **Startup error logging** - Not implemented (Issue #4 above)
2. **Readiness check error detail** - Not implemented (Issue #3 above)

### ❌ Not Implemented (from UX Review "Should Fix")

1. **Shutdown timeout enforcement** - Not implemented (Issue #5 above)
2. **CORS debugging endpoint** - Not implemented (acceptable for MVP)
3. **Dev mode indicators** - Not implemented (acceptable for MVP)

---

## Performance Considerations

Based on test execution times:

- **Server startup:** ~100ms (well under 2s target) ✅
- **Health endpoint:** <10ms (estimated from test speed) ✅
- **Request logging overhead:** Minimal, tests run in 164ms total ✅
- **Type checking:** <2s for full package ✅

No performance concerns identified.

---

## Security Review

### ✅ Secure Patterns

1. **Error information disclosure** - Generic 500 errors don't expose internals
2. **CORS configuration** - Explicit origin list, no wildcard
3. **Input validation** - Zod schema validates all config
4. **Request tracking** - Request ID for auditing without exposing data

### ⚠️ Recommendations

1. **Consider rate limiting** - Out of scope (E02-T007 addresses this)
2. **Consider request size limits** - Not specified in spec, could add to server.ts
3. **Environment validation** - Ensure DATABASE_URL doesn't get logged (currently safe, logger only logs structured fields)

---

## Documentation Quality

### README/Comments
- ❌ No package-level README.md (acceptable for internal package)
- ✅ Code is self-documenting with clear names
- ✅ Minimal comments where logic is clear
- ✅ Type signatures serve as documentation

### Code Clarity
- ✅ Function names clearly describe purpose
- ✅ Variable names are descriptive
- ✅ File organization is intuitive
- ✅ No "clever" code that needs explanation

---

## Recommendations Summary

| Issue | Severity | Effort | Status Required |
|-------|----------|--------|-----------------|
| #1: Config test failure | Must Fix | 30min | Blocking |
| #2: AppError type guard bug | Must Fix | 15min | Blocking |
| #3: Readiness error details | Should Fix | 10min | Recommended |
| #4: Startup error logging | Should Fix | 15min | Recommended |
| #5: Shutdown timeout | Should Fix | 10min | Recommended |
| #6: CORS version mismatch | Nice to Have | 2min | Optional |

**Total effort to pass review:** ~45 minutes (Issues #1, #2)
**Total effort for full spec compliance:** ~80 minutes (Issues #1-5)

---

## Final Verdict

### ❌ **NEEDS REVISION**

**Rationale:**
While the implementation demonstrates excellent code quality and strong architectural alignment, **2 test failures block merge**:

1. Config module test expects fail-fast behavior but implementation uses lazy loading
2. AppError type guard incorrectly handles error discrimination

Additionally, **3 "Must Fix" UX recommendations** from the spec were not implemented:
- Readiness endpoint error details (Issue #3)
- Startup error logging (Issue #4)
- Shutdown timeout (Issue #5)

**Next Steps:**

1. **Fix test failures** (Issues #1, #2) - REQUIRED FOR MERGE
   - Resolve config lazy loading vs fail-fast trade-off
   - Fix AppError type guard logic

2. **Implement UX Must Fix items** (Issues #3, #4, #5) - STRONGLY RECOMMENDED
   - These were marked as "Must Fix" in the spec's UX review
   - Each requires <15 minutes of work
   - Significantly improves operational experience

3. **Re-run tests and verify all pass**

4. **Return to /review-code for second review**

---

## Code Examples - What Worked Well

### Excellent Error Handler Structure
```typescript
// apps/api/src/middleware/error-handler.ts:20-49
export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (isAppError(error)) {
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

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

**Why this is good:**
- Clear separation between known (AppError) and unknown errors
- Structured logging with context
- Doesn't expose internal details to clients
- Type-safe with proper Fastify types

### Clean Server Factory Pattern
```typescript
// apps/api/src/server.ts:8-32
export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  });

  await app.register(cors, { /* ... */ });
  await app.register(requestLogger);
  await app.register(healthRoutes);

  app.setErrorHandler(errorHandler);

  return app;
}
```

**Why this is good:**
- Testable without starting server
- Clear registration order
- Proper async handling
- Type-safe return value

---

## Conclusion

This is a **very strong foundation** with excellent code quality, comprehensive tests, and proper architectural patterns. The test failures are relatively minor issues that can be fixed quickly. Once Issues #1 and #2 are resolved (and ideally #3-5 as well), this implementation will be production-ready and provide an excellent base for the rest of the API development.

The developer clearly understands Fastify, TypeScript, and testing best practices. The main gap is in fully implementing the UX review recommendations from the spec.

---

**END OF CODE REVIEW**
