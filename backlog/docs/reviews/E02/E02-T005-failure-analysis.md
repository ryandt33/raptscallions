# Integration Failure Analysis: E02-T005

## Summary
Integration tests failed because the permission middleware is not registered in the API server, preventing any permission checks from working in the real runtime environment.

## Root Cause
**Category:** Implementation

## Evidence

### What Tests Expected
The unit tests correctly expected:
1. Permission middleware to be available as a Fastify plugin
2. `request.ability` to be populated on all requests
3. `app.requirePermission()` decorator to be available
4. `app.checkResourcePermission()` helper to be available
5. `app.getGroupPaths()` helper to be available

All unit tests pass (136/136 in auth package) because they:
- Import and register the middleware in test setup
- Mock Fastify instances
- Test the middleware in isolation

### What Actually Happened
When the integration tests ran against the real API server:
1. API server starts successfully ✅
2. Health endpoint responds ✅
3. Docker services are healthy ✅
4. **BUT** permission middleware is NOT registered in server bootstrap
5. None of the permission decorators are available
6. `request.ability` is undefined on all requests
7. Cannot test any acceptance criteria against real infrastructure

**Evidence from `apps/api/src/server.ts` (lines 40-47):**
```typescript
// Register request logger
await app.register(requestLogger);

// Register session middleware (validates and attaches session to request)
await app.register(sessionMiddleware);

// Register auth middleware (provides requireAuth decorator)
await app.register(authMiddleware);

// ❌ MISSING: await app.register(permissionMiddleware);
```

### Key Discrepancy
**Unit Tests:** Work perfectly in isolation with mocked Fastify instances that manually register the middleware.

**Integration Tests:** Fail because the real API server at `apps/api/src/server.ts` never registers the permission middleware, so it's not available at runtime.

## Resolution Path
**Next State:** IMPLEMENTING

### Required Changes

The implementation is missing a critical integration step. The middleware package is correctly implemented, but it was never wired into the API server.

#### File: `apps/api/src/server.ts`

**Change 1: Add import**
```diff
 import { sessionMiddleware } from "./middleware/session.middleware.js";
 import { authMiddleware } from "./middleware/auth.middleware.js";
+import { permissionMiddleware } from "@raptscallions/auth";
 import { healthRoutes } from "./routes/health.routes.js";
```

**Change 2: Register middleware after auth middleware**
```diff
 // Register session middleware (validates and attaches session to request)
 await app.register(sessionMiddleware);

 // Register auth middleware (provides requireAuth decorator)
 await app.register(authMiddleware);

+// Register permission middleware (builds abilities and provides permission checks)
+await app.register(permissionMiddleware);

 // Register routes
 await app.register(healthRoutes);
```

**Location:** After line 47, before route registration (line 49-51)

**Rationale:** Permission middleware depends on session and auth middleware running first to populate `request.user`. It must run before routes so that permission decorators are available to route handlers.

## Why This Happened

### Root Cause Analysis

1. **Task Scope Gap:** The task specification focused on implementing the permission middleware package but did not explicitly require integration into the API server as an acceptance criterion.

2. **No Integration AC:** Looking at the 10 acceptance criteria (task lines 46-56), none mention:
   - "Middleware must be registered in API server bootstrap"
   - "At least one route must demonstrate permission checks working"
   - "Integration tests must pass against running API"

3. **Unit Tests Passed:** All 136 unit tests passed because they register the middleware in test setup. This gave false confidence that the feature was complete.

4. **No Protected Routes Yet:** The current API only has health and basic auth routes. There are no routes that require permissions, so the missing middleware didn't cause visible runtime errors during development.

5. **Integration Testing Caught It:** The QA agent correctly identified this gap when running integration tests against the real Docker stack. The API started successfully but couldn't execute any permission checks.

### Implementation is Incomplete, Not Wrong

The implemented code is **correct**:
- ✅ `packages/auth/src/abilities.ts` - Properly uses `createMongoAbility` with `$in` operators
- ✅ `packages/auth/src/permissions.ts` - Correctly uses `subject()` helper in resource checks
- ✅ All exports are correct
- ✅ All unit tests pass (136/136)
- ✅ TypeScript types are properly augmented
- ✅ Follows all architectural patterns

The code just wasn't **integrated** into the running API server.

## Additional Notes

### Quick Fix
This is a straightforward fix requiring 3 lines of code (1 import, 2 registration lines). The middleware is production-ready and battle-tested by unit tests.

### Verification Steps After Fix
1. Restart API server
2. Verify `request.ability` is defined (add temporary logging)
3. Create a test route that uses `requirePermission('read', 'User')`
4. Make authenticated request and verify permission check works
5. Re-run integration tests - all acceptance criteria should pass

### Lessons Learned
1. **Integration ACs Needed:** Future task specs should explicitly include:
   - "Middleware is registered in API server"
   - "At least one example route uses the middleware"
   - "Integration tests pass against Docker stack"

2. **CI Should Run Integration Tests:** The current CI only runs unit tests. Adding integration test step would have caught this before QA review.

3. **QA Process Working:** This demonstrates the value of the QA process - unit tests passed but integration revealed the missing piece.

---

**Analysis completed by:** investigate-failure agent
**Date:** 2026-01-12
**Next State:** IMPLEMENTING
**Estimated Fix Time:** 5 minutes (3 lines of code + verification)
