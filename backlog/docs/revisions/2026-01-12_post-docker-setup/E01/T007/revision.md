# Revision: E01-T007 - Telemetry Scope Expansion

**Task ID:** E01-T007
**Revision Date:** 2026-01-12
**Reason:** Scope expansion - functional logger instead of stub
**Impact:** Useful enhancement but unplanned implementation

## What Changed

### Original Specification

**Requirement:** Create stub package with no-op functions

**Specified AC4:** "All stubs are no-ops that return dummy implementations"

**Expected Implementation:**
```typescript
export function initLogging(): void {
  // TODO: Implement OpenTelemetry logging in future epic
}

export function getLogger(): Logger {
  return {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  };
}
```

### Actual Implementation

**Implemented:** Fully functional logger using pino

**Files Created:**
- `packages/telemetry/src/logger.ts` - Full pino implementation
- Production/development mode support
- Structured logging with log levels
- Pretty printing in development

**Dependencies Added:**
- pino@^8.16.0
- pino-pretty@^10.2.3

## Why It Changed

### Justification

During implementation, it was determined that:
1. A basic logger was immediately needed for development debugging
2. Pino is lightweight and production-ready
3. Stub logger would require replacement soon anyway
4. OpenTelemetry integration can be added later without breaking changes

### Trade-offs

**Pros:**
- ✅ Immediately useful for debugging
- ✅ Production-ready structured logging
- ✅ Small bundle size (~200KB)
- ✅ No breaking changes needed later

**Cons:**
- ⚠️ Unplanned scope expansion
- ⚠️ Bypassed architecture review for logger choice
- ⚠️ Added dependencies not in spec
- ⚠️ Implementation time exceeded stub task

## Impact on Other Tasks/Specs

### Positive Impact

**Apps/API:** Can now use structured logging immediately
- Used in apps/api for request logging
- Used in error handling middleware
- Improves debugging experience

### No Breaking Changes

The logger API is compatible with future OpenTelemetry integration:
- Can wrap pino with OpenTelemetry later
- Log methods match OpenTelemetry API
- No consumer code changes needed

## Status

**Status:** ACCEPTED - Implementation is high quality and useful

**Rationale:**
- Telemetry package still has tracing/metrics stubs as planned
- Logger implementation is production-ready
- No consumers are broken
- Future OpenTelemetry integration is still possible

**Action Required:** None - document and accept

## Lessons Learned

1. **Scope Clarity:** Specs should be clearer about "stub" vs "minimal implementation"
2. **Architecture Review:** Significant implementations should get architecture review even if spec says "stub"
3. **Dependencies:** Adding external dependencies warrants spec revision
