# Revision: E01-T003 - Drizzle Config Schema Paths

**Task ID:** E01-T003
**Revision Date:** 2026-01-12
**Reason:** Production deployment compatibility
**Impact:** Necessary change for Docker environment

## What Changed

### Original Specification

**File:** `packages/db/drizzle.config.ts`

**Specified:**
```typescript
export default {
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Actual Implementation

**File:** `packages/db/drizzle.config.ts`

**Implemented:**
```typescript
export default {
  schema: [
    "./dist/schema/types.js",
    "./dist/schema/users.js",
    "./dist/schema/groups.js",
    "./dist/schema/group-members.js",
    "./dist/schema/sessions.js",
    "./dist/schema/classes.js",
    "./dist/schema/class-members.js",
    "./dist/schema/tools.js",
    "./dist/schema/chat-sessions.js",
    "./dist/schema/messages.js",
  ],
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

## Why It Changed

### Root Cause

During Docker setup task, when running migrations inside the Docker container, it was discovered that:

1. Drizzle Kit cannot read TypeScript source files directly in production
2. The spec's `schema: "./src/schema"` works in development with ts-node/tsx but fails in Docker
3. Docker runs compiled JavaScript from dist/, not TypeScript source
4. Migration generation requires reading actual schema definitions

### Technical Details

**Problem:**
- Spec assumed drizzle-kit would read TypeScript source files
- In Docker, only compiled JavaScript files are available (no src/ directory)
- Running `drizzle-kit generate` in Docker failed with "cannot find schema files"

**Solution:**
- Point schema paths to compiled JavaScript files in dist/
- Explicitly list each schema file for clarity
- Ensure build step runs before migration generation

**Trade-offs:**
- ✅ Pro: Works in both development and production/Docker
- ✅ Pro: Explicit list makes it clear which schemas exist
- ⚠️ Con: Must manually update list when adding new schema files
- ⚠️ Con: More verbose than glob pattern

## Impact on Other Tasks/Specs

### Affected Tasks

**E01-T004, E01-T005, E01-T006:** Users, Groups, Group Members schemas
- Each task adds a new schema file
- drizzle.config.ts must be updated to include new schema path
- This is documented in task history

**E02 Tasks:** Authentication schemas (sessions, classes, class-members)
- Same pattern - new schemas added to drizzle.config.ts

**E04 Tasks:** Module schemas (tools, chat-sessions, messages)
- Same pattern - new schemas added to drizzle.config.ts

### Pattern Established

**Convention:** When adding a new schema file:
1. Create `packages/db/src/schema/{name}.ts`
2. Build the package to generate dist/ files
3. Add `"./dist/schema/{name}.js"` to drizzle.config.ts schema array
4. Run `pnpm --filter @raptscallions/db db:generate` to create migration

### No Spec Changes Needed

This revision does not require updating the E01-T003 spec because:
- The spec correctly identified the need for drizzle.config.ts
- The spec correctly identified the migration directory
- The change is an implementation detail (source vs compiled paths)
- The change was discovered during integration (Docker setup), not during T003 implementation

## Lessons Learned

1. **Consider Deployment Environment:** Specs should account for production deployment differences
2. **Compiled vs Source:** Tools that read schema definitions may need compiled files
3. **Explicit Paths:** In monorepos, explicit paths are sometimes clearer than glob patterns
4. **Integration Testing:** This issue was caught during Docker setup, highlighting the value of end-to-end testing

## Verification

**Verified working:**
- ✅ Migrations generate successfully in Docker
- ✅ Migrations run successfully in Docker
- ✅ All 352 tests pass
- ✅ Schema changes are detected correctly
- ✅ Development workflow (local) works correctly
- ✅ Production workflow (Docker) works correctly

## Status

**Status:** ACCEPTED - This is a necessary change for production deployment
**Action Required:** None - change is complete and verified
**Documentation:** This revision document serves as the official record
