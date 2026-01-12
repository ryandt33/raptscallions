# Implementation Plan: E02-T008 Type Safety Fixes

## Overview

Address two minor TypeScript hygiene issues identified in code review.

## SF-1: Fix Type Assertion in auth.guards.test.ts

**File:** `apps/api/src/__tests__/integration/auth.guards.test.ts`
**Line:** 173

**Current:**
```typescript
await app.register(sessionMiddleware, {
  sessionService: mockSessionService as any,
});
```

**Fix:** Import `SessionServiceLike` and use proper type assertion:
```typescript
import { sessionMiddleware, type SessionServiceLike } from "../../middleware/session.middleware.js";

// ... later at line 173:
await app.register(sessionMiddleware, {
  sessionService: mockSessionService as SessionServiceLike,
});
```

## SF-2: Add Explicit Types to oauth.routes.test.ts Mocks

**File:** `apps/api/src/__tests__/integration/oauth.routes.test.ts`

The `mockDb` and `mockLucia` declarations at lines 104-123 already have explicit types. The issue is that they're declared inside `beforeAll` instead of using `vi.hoisted()` like the other test files.

However, this is intentional for `oauth.routes.test.ts` because it uses `vi.doMock()` (dynamic mocking) instead of `vi.mock()` (static hoisting). The current approach is correct for this file's mocking strategy.

**Action:** No change needed for SF-2. The typing is already explicit and the different pattern is justified by the use of `vi.doMock()`.

## Summary

| Fix | File | Change |
|-----|------|--------|
| SF-1 | auth.guards.test.ts | Import `SessionServiceLike`, replace `as any` with `as SessionServiceLike` |
| SF-2 | oauth.routes.test.ts | No change needed (already properly typed) |

## Verification

After fix, run:
```bash
pnpm --filter @raptscallions/api test
pnpm typecheck
```

All 255 API tests should pass and typecheck should be clean.
