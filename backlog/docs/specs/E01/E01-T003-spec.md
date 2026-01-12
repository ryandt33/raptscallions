# Implementation Spec: E01-T003

## Overview

Set up the `@raptscallions/db` package with Drizzle ORM configured for PostgreSQL 16. This package will serve as the single source of truth for database schema definitions, provide a configured database client with connection pooling, and establish migration infrastructure. It includes a custom ltree type for hierarchical group data.

## Approach

The db package will serve as the database layer for the entire application:
- Drizzle ORM 0.29+ for type-safe database operations with SQL-like syntax
- PostgreSQL driver (postgres/porsager) for high-performance connections
- drizzle-kit for migration generation and management
- Custom type definitions for PostgreSQL-specific types (ltree)
- Connection pooling configured for production workloads

Following the project's strict TypeScript standards:
- Zero use of `any` type
- Explicit typing with `import type` for type-only imports
- Inferred types from Drizzle schema using `$inferSelect` and `$inferInsert`
- Snake_case for all table and column names

## Files to Create

| File | Purpose |
| --- | --- |
| `packages/db/src/client.ts` | Database client with connection pooling |
| `packages/db/src/schema/index.ts` | Barrel export for all schema definitions |
| `packages/db/src/schema/types.ts` | Custom PostgreSQL types (ltree) |
| `packages/db/src/migrations/.gitkeep` | Directory placeholder for migrations |
| `packages/db/drizzle.config.ts` | Drizzle Kit configuration for migrations |
| `packages/db/src/env.ts` | Environment variable validation for database config |

## Files to Modify

| File | Changes |
| --- | --- |
| `packages/db/package.json` | Add Drizzle ORM, postgres driver, drizzle-kit, dotenv dependencies; add db scripts |
| `packages/db/tsconfig.json` | Ensure proper paths for drizzle-kit compatibility |
| `packages/db/src/index.ts` | Export db client, schema types, and custom types |

## Dependencies

- Requires: E01-T001 (Monorepo structure)
- New packages:
  - `drizzle-orm@^0.29.0` - ORM
  - `drizzle-kit@^0.20.0` - Migration tooling
  - `postgres@^3.4.0` - PostgreSQL driver (porsager/postgres for better performance)
  - `dotenv@^16.3.0` - Environment variable loading

## Test Strategy

### Unit Tests

- Custom ltree type correctly formats data for PostgreSQL
- Environment validation catches missing DATABASE_URL
- Client exports are correctly typed

### Integration Tests

- Database connection can be established with valid DATABASE_URL
- Schema types infer correctly in TypeScript
- drizzle-kit generate command runs without errors (manual verification)

## Acceptance Criteria Breakdown

**AC1: Drizzle ORM 0.29+ installed with drizzle-kit**
- Add `"drizzle-orm": "^0.29.0"` to dependencies
- Add `"drizzle-kit": "^0.20.0"` to devDependencies
- Verify package installation succeeds
- Ensure compatible versions are used

**AC2: PostgreSQL driver (postgres or pg) installed**
- Add `"postgres": "^3.4.0"` to dependencies (using porsager/postgres for better performance)
- This is the recommended driver per task notes
- Alternative: can use `pg` if compatibility issues arise

**AC3: drizzle.config.ts configured for migrations**
- Create config file at `packages/db/drizzle.config.ts`
- Configure schema path: `./src/schema`
- Configure migrations output: `./src/migrations`
- Set dialect to `postgresql`
- Use DATABASE_URL environment variable for connection
- Configure verbose mode for debugging

**AC4: src/client.ts exports configured db client**
- Import postgres driver
- Create connection with DATABASE_URL
- Configure connection pooling with appropriate defaults
- Export typed `db` client instance
- Handle missing DATABASE_URL gracefully (for build-time)

**AC5: src/schema/ directory for table definitions**
- Create schema directory structure
- Create index.ts barrel export
- Create types.ts for custom PostgreSQL types
- Directory is ready for future table definitions

**AC6: src/schema/index.ts re-exports all schemas**
- Create barrel export file
- Export custom types from types.ts
- Pattern established for future schema additions

**AC7: src/migrations/ directory for SQL migrations**
- Create migrations directory
- Add .gitkeep to preserve directory in git
- drizzle-kit will generate migrations here

**AC8: Custom ltree type defined for PostgreSQL ltree extension**
- Use drizzle-orm's customType function
- Define dataType as "ltree"
- Export for use in schema definitions
- Follow example from task notes

**AC9: Package scripts: db:generate, db:migrate, db:push, db:studio**
- `db:generate` - Generate migrations from schema changes
- `db:migrate` - Apply pending migrations
- `db:push` - Push schema directly (development only)
- `db:studio` - Open Drizzle Studio for database inspection
- All scripts use drizzle-kit with proper config

**AC10: Environment variable DATABASE_URL used for connection**
- Use dotenv for local development
- Validate DATABASE_URL is present and valid URL format
- Use Zod schema for environment validation
- Provide clear error messages if missing

**AC11: Connection pooling configured appropriately**
- Configure max connections (default: 10 for typical cloud instances)
- Configure idle timeout (30 seconds)
- Configure connection timeout (2 seconds)
- Use sensible defaults that can be overridden via environment

## Edge Cases

- **Missing DATABASE_URL**: Build should succeed but client throws at runtime if used
- **Invalid DATABASE_URL format**: Throw clear validation error at startup
- **Connection failures**: Log meaningful error with connection details (not password)
- **Pool exhaustion**: Configure appropriate limits to prevent resource starvation
- **Development vs Production**: Different pool sizes and logging levels
- **ltree extension not installed**: Queries using ltree will fail - document requirement

## Open Questions

- [ ] Should we include a health check function to verify database connectivity?
- [ ] Do we need connection string parsing for SSL configuration in production?
- [ ] Should pool size be configurable via environment variables (DATABASE_POOL_MIN, DATABASE_POOL_MAX)?
- [ ] Should we include a seed script stub in this task or defer to a later task?

## Implementation Details

### Custom ltree Type

```typescript
// packages/db/src/schema/types.ts
import { customType } from "drizzle-orm/pg-core";

/**
 * Custom PostgreSQL ltree type for hierarchical data.
 * Used for group hierarchies (district.school.department).
 *
 * Requires PostgreSQL ltree extension:
 * CREATE EXTENSION IF NOT EXISTS ltree;
 */
export const ltree = customType<{ data: string }>({
  dataType() {
    return "ltree";
  },
});
```

### Database Client Configuration

```typescript
// packages/db/src/client.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection is created lazily to allow build-time imports
const connectionString = process.env.DATABASE_URL;

// Throw meaningful error if DATABASE_URL is missing at runtime
function getConnectionString(): string {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Please set it in your environment or .env file."
    );
  }
  return connectionString;
}

// Create postgres connection with pooling
// Pool settings follow recommendation: (cpu_cores * 2) + spindle_count
// Default of 10 works for typical cloud instances
const queryClient = postgres(getConnectionString(), {
  max: 10,                    // Maximum connections in pool
  idle_timeout: 30,           // Close idle connections after 30s
  connect_timeout: 2,         // Connection timeout in seconds
  prepare: false,             // Disable prepared statements for connection pooling
});

/**
 * Drizzle ORM database client.
 * Use this for all database operations.
 *
 * @example
 * import { db } from "@raptscallions/db";
 * import { users } from "@raptscallions/db/schema";
 *
 * const allUsers = await db.select().from(users);
 */
export const db = drizzle(queryClient, { schema });

// Export the raw postgres client for cases where direct access is needed
export { queryClient };
```

### Environment Validation

```typescript
// packages/db/src/env.ts
import { z } from "zod";

/**
 * Environment variable schema for database configuration.
 * Validates required variables at startup.
 */
export const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url({
    message: "DATABASE_URL must be a valid PostgreSQL connection URL",
  }),
  DATABASE_POOL_MIN: z.coerce.number().min(1).default(2),
  DATABASE_POOL_MAX: z.coerce.number().min(1).default(10),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;

/**
 * Validates database environment variables.
 * Call this at application startup to fail fast.
 */
export function validateDbEnv(): DbEnv {
  const result = dbEnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid database environment configuration:");
    console.error(result.error.format());
    throw new Error("Database environment validation failed");
  }
  return result.data;
}
```

### Drizzle Config

```typescript
// packages/db/drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for migrations");
}

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

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist *.tsbuildinfo",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### Schema Index Pattern

```typescript
// packages/db/src/schema/index.ts

// Export custom PostgreSQL types
export * from "./types";

// Future table exports will be added here as they are created:
// export * from "./users";
// export * from "./groups";
// export * from "./classes";
```

### Main Package Export

```typescript
// packages/db/src/index.ts

// Export database client
export { db, queryClient } from "./client";

// Export all schema definitions and types
export * from "./schema";

// Export environment validation utilities
export { validateDbEnv, dbEnvSchema, type DbEnv } from "./env";
```

### Package.json Updates

```json
{
  "name": "@raptscallions/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./schema": {
      "types": "./dist/schema/index.d.ts",
      "import": "./dist/schema/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist *.tsbuildinfo",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "dotenv": "^16.3.0",
    "drizzle-kit": "^0.20.0",
    "typescript": "^5.3.0"
  }
}
```

### tsconfig.json Adjustments

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["drizzle.config.ts"]
}
```

Note: `drizzle.config.ts` is excluded from the main build since it's only used by drizzle-kit CLI.

## Type Safety Considerations

### Inferred Types Pattern

When table schemas are added in future tasks, they should follow this pattern:

```typescript
// Example for future users table
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Inferred types - no any!
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Avoiding `any` in Database Operations

```typescript
// CORRECT: Use typed queries
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
});

// CORRECT: Use unknown with type guards for dynamic data
function parseSettings(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null) {
    return {};
  }
  return data as Record<string, unknown>;
}

// BANNED: Do not use any
// const result: any = await db.execute(sql`...`);
```

## Documentation Requirements

The following should be documented in code comments:

1. ltree extension requirement (CREATE EXTENSION IF NOT EXISTS ltree)
2. Connection pool sizing rationale
3. Environment variable requirements
4. Export patterns for schema additions

## Migration Notes

This task sets up the infrastructure but does NOT create the initial migration. The first actual table definitions and migration will be created in E01-T004 (if that task creates user tables) or subsequent tasks.

To create the first migration after adding tables:
```bash
pnpm --filter @raptscallions/db db:generate
pnpm --filter @raptscallions/db db:migrate
```

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** NOT_APPLICABLE

This task is backend infrastructure (Drizzle ORM and PostgreSQL schema setup) with no user-facing components. The task labels are `backend` and `database` with no `frontend` label, and the spec contains only database client configuration, schema definitions, migration tooling, and environment validation.

### Developer Experience Notes

While not user-facing, the spec shows good attention to developer experience:

- Clear error messages for missing `DATABASE_URL` (helps developers during setup)
- Environment validation with Zod provides actionable feedback
- Well-documented code patterns with JSDoc comments
- Sensible defaults for connection pooling
- Helpful inline comments explaining configuration choices

No UX review is required for this task. It may proceed to architecture review.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED

### Summary

The spec demonstrates excellent alignment with ARCHITECTURE.md and CONVENTIONS.md. It correctly implements Drizzle ORM with PostgreSQL, follows the established technology stack, and maintains strict TypeScript standards with zero use of `any` types.

### Checklist Results

- [x] Architecture Fit - Uses Drizzle ORM 0.29+, postgres driver, PostgreSQL 16, Zod validation per tech stack
- [x] Code Quality - File locations match conventions, proper naming, explicit types throughout
- [x] TypeScript Strictness - No `any` types, uses `unknown` appropriately, Zod for validation
- [x] Database - Custom ltree type correctly defined, snake_case naming, proper Drizzle patterns
- [x] Testing - Test strategy covers unit and integration tests appropriately
- [x] Dependencies - Correctly depends on E01-T001, new packages are justified
- [x] Security - Environment variable validation prevents credential exposure in errors

### Approved With Notes

1. **Zod Dependency Duplication**: The spec adds `zod` directly to `@raptscallions/db` despite it already being in `@raptscallions/core`. This is acceptable for package isolation (the db package's env validation is self-contained), but the developer should consider importing from `@raptscallions/core` if circular dependencies are not a concern. Not blocking.

2. **Test File Locations**: The spec mentions tests but doesn't specify exact paths. Per CONVENTIONS.md, tests should be in `packages/db/src/__tests__/` directory. The developer should follow this pattern:
   - `packages/db/src/__tests__/schema/types.test.ts` - ltree type tests
   - `packages/db/src/__tests__/env.test.ts` - Environment validation tests
   - `packages/db/src/__tests__/client.test.ts` - Client export type tests

3. **Open Questions Resolution**: The open questions in the spec are reasonable to defer:
   - Health check function: Defer to API server task (E01-T006)
   - SSL configuration: Can be added when production deployment is addressed
   - Configurable pool size via env: The spec already includes `DATABASE_POOL_MIN` and `DATABASE_POOL_MAX` in the env schema - ensure the client actually uses these values
   - Seed script: Defer to a later task

4. **Client Lazy Initialization**: The spec shows `getConnectionString()` called immediately at module load in the example code. Consider wrapping the entire queryClient creation in a lazy pattern to ensure builds succeed without DATABASE_URL. The spec mentions this requirement but the code example doesn't fully implement it.

### Suggestions

- Consider adding a `closeConnection()` export for graceful shutdown in tests and API server
- The `prepare: false` setting is correct for connection pooling (PgBouncer compatibility) but add a comment explaining this is for connection pooler compatibility
- Consider exporting a type for the database client: `export type Database = typeof db`
