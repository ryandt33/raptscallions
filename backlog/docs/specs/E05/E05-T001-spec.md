# Implementation Spec: E05-T001

## Overview

Define database schemas for file storage infrastructure: a `files` table to track uploaded files and a `user_storage_limits` table for per-user quota overrides. This task establishes the foundational data layer for file management with the three-tier limit system (system defaults, role-based limits, user overrides) without dependencies on E03 entities.

## Approach

Follow existing Drizzle ORM patterns established in the codebase: UUID primary keys, snake_case column names, standard timestamps with triggers for `updated_at`, soft deletes via `deleted_at`, and explicit index definitions. The schema intentionally avoids foreign keys to E03 entities (classes, assignments, tools) by using a `purpose` varchar field for categorization. Zod schemas will provide runtime validation for the storage limits configuration structure in `groups.settings`.

Key design decisions:
- **Purpose field over entity FK**: Uses varchar `purpose` (e.g., 'general', 'avatar', 'attachment') to categorize files without requiring FKs to entities that may not exist
- **Storage backend tracking**: Each file records which backend it's stored in (s3, local) to support multi-backend deployments
- **Nullable override fields**: `user_storage_limits` uses nullable fields where NULL means "inherit from role/system"
- **Audit trail**: User overrides track `set_by` and `reason` for accountability

## Files to Create

| File | Purpose |
| ---- | ------- |
| `packages/db/src/schema/files.ts` | Drizzle schema for `files` table with enum, relations, and type exports |
| `packages/db/src/schema/user-storage-limits.ts` | Drizzle schema for `user_storage_limits` table with relations and type exports |
| `packages/db/src/migrations/0012_create_files_storage.sql` | Migration creating both tables, enums, indexes, constraints, and triggers |
| `packages/core/src/schemas/storage.schema.ts` | Zod schemas for storage limits configuration and file metadata validation |
| `packages/core/src/__tests__/schemas/storage.schema.test.ts` | Unit tests for Zod schema validation |

## Files to Modify

| File | Changes |
| ---- | ------- |
| `packages/db/src/schema/index.ts` | Add barrel exports for new files and user-storage-limits schemas |
| `packages/core/src/schemas/index.ts` | Add barrel exports for new storage schemas |

## Dependencies

- Requires: None (this task has no dependencies)
- New packages: None (uses existing Drizzle and Zod)

## Test Strategy

### Unit Tests

> **Note for KB documentation:** Drizzle schema unit tests (verifying table names, column names, type inference) were intentionally omitted. These are enforced by TypeScript at compile time and by PostgreSQL at runtime — testing them adds no value. Only Zod validation schemas need unit tests because they contain actual runtime logic. This decision should be documented in the KB under testing guidance.

**Zod Schema Tests (`storage.schema.test.ts`)**:
- Verify `storageLimitsSchema` validates role-based limits structure
- Verify validation rejects negative byte values
- Verify validation rejects non-integer byte values
- Verify validation allows missing roles (partial configuration)
- Verify `groupStorageSettingsSchema` validates full settings structure
- Verify `fileMetadataSchema` validates file upload metadata

### Integration Tests

Not applicable for this schema-only task. Integration tests will be added in E05-T005 (service layer) and E05-T008 (integration tests).

## Acceptance Criteria Breakdown

### Files Table (AC1-AC8)

**AC1: Files table stores core metadata: name, MIME type, size in bytes, storage location key**
- Add columns: `original_name` (varchar 255), `mime_type` (varchar 100), `size_bytes` (bigint), `storage_key` (varchar 500)
- All columns NOT NULL except where specified

**AC2: Files track which storage backend they're stored in (s3, local, etc.)**
- Add column: `storage_backend` using `storageBackendEnum` ('s3', 'local')
- NOT NULL, defaults to 's3'

**AC3: Files track which user uploaded them (required) and optionally which group they belong to**
- Add column: `uploaded_by` (uuid) FK to users(id) with CASCADE delete, NOT NULL
- Add column: `group_id` (uuid) FK to groups(id) with CASCADE delete, nullable
- Index both columns

**AC4: Files have a `purpose` field to categorize usage without requiring FK dependencies**
- Add column: `purpose` (varchar 50), NOT NULL, default 'general'
- Example values: 'general', 'avatar', 'attachment', 'export'
- Indexed for filtering queries

**AC5: Files support soft delete with status tracking (active, soft_deleted)**
- Add column: `status` using `fileStatusEnum` ('active', 'soft_deleted')
- NOT NULL, default 'active'
- Index for filtering active files

**AC6: Storage key is unique across all files**
- Add unique constraint on `storage_key` column
- Prevents key collisions across backends

**AC7: Proper indexes for common query patterns (by user, by group, by purpose, by status)**
- Index: `files_uploaded_by_idx` on (uploaded_by)
- Index: `files_group_id_idx` on (group_id)
- Index: `files_purpose_idx` on (purpose)
- Index: `files_status_idx` on (status)

**AC8: Standard timestamps (created_at, updated_at with trigger, deleted_at for soft delete)**
- Add columns: `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now()), `deleted_at` (timestamptz nullable)
- Create trigger `update_files_updated_at` using existing `update_updated_at_column()` function
- Index `deleted_at` for soft delete queries

### User Storage Limits Table (AC9-AC14)

**AC9: Tracks per-user storage limit overrides (max file size, total quota)**
- Add columns: `max_file_size_bytes` (bigint nullable), `storage_quota_bytes` (bigint nullable)
- NULL means inherit from role/system default

**AC10: Limit fields are nullable - NULL means inherit from role/system default**
- Both `max_file_size_bytes` and `storage_quota_bytes` are nullable
- Service layer will implement inheritance logic (not in this task)

**AC11: Tracks current usage (used_bytes) for quota enforcement**
- Add column: `used_bytes` (bigint) NOT NULL, default 0
- Will be updated atomically by file service (E05-T005)

**AC12: Includes audit trail: who set the override (set_by) and why (reason)**
- Add column: `set_by` (uuid) FK to users(id) with SET NULL on delete, nullable
- Add column: `reason` (varchar 500) nullable
- SET NULL preserves limit record even if admin is deleted

**AC13: One record per user (unique constraint on user_id)**
- Add unique constraint on `user_id` column
- Ensures single source of truth for user overrides

**AC14: Proper foreign key relationships to users table**
- Add column: `user_id` (uuid) FK to users(id) with CASCADE delete, NOT NULL
- CASCADE ensures cleanup when user is deleted

### Group Settings Extension (AC15-AC16)

**AC15: Document the structure for role-based limits in groups.settings JSONB**
- No migration needed (groups.settings is already JSONB)
- Document expected structure in Zod schema comments

**AC16: Zod schema validates storage limits configuration structure**
- Create `storageLimitsSchema` for individual limit object
- Create `roleStorageLimitsSchema` for role-keyed limits map
- Create `groupStorageSettingsSchema` for full settings structure

### Migration & Types (AC17-AC19)

**AC17: Migration creates both tables with proper constraints and indexes**
- Single migration file: `0012_create_files_storage.sql`
- Creates enums, tables, indexes, constraints, triggers
- Uses statement breakpoints for Drizzle compatibility

**AC18: TypeScript types exported for use in services**
- Export from schema files: `File`, `NewFile`, `UserStorageLimit`, `NewUserStorageLimit`
- Export enums: `fileStatusEnum`, `storageBackendEnum`
- Export from core: Zod-inferred types for storage limits

**AC19: Tests verify schema constraints work correctly**
- Unit tests verify type inference
- Unit tests verify schema structure
- Unit tests verify Zod validation rules

## Detailed Schema Definitions

### files Table Schema

```typescript
// packages/db/src/schema/files.ts

import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  bigint,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { groups } from "./groups.js";

/**
 * File status enum for soft delete lifecycle.
 * - active: File is available for download
 * - soft_deleted: File is marked for deletion (cleanup after 30 days)
 */
export const fileStatusEnum = pgEnum("file_status", [
  "active",
  "soft_deleted",
]);

/**
 * Storage backend enum for multi-backend support.
 * - s3: S3-compatible storage (AWS, MinIO, DigitalOcean Spaces, etc.)
 * - local: Local filesystem storage (development/testing)
 */
export const storageBackendEnum = pgEnum("storage_backend", [
  "s3",
  "local",
]);

/**
 * Files table - tracks uploaded file metadata.
 *
 * Files are decoupled from specific entities (classes, assignments) via
 * the purpose field. This allows file infrastructure to be used before
 * E03 entities are defined. Entity associations will be added later
 * via separate tables (e.g., user_avatars, assignment_attachments).
 *
 * Soft delete workflow:
 * 1. status='active' - Normal state, file accessible
 * 2. status='soft_deleted', deleted_at set - Marked for deletion
 * 3. Background job (30 days) - Hard deletes from storage and database
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // File metadata
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

    // Storage location
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    storageBackend: storageBackendEnum("storage_backend").notNull().default("s3"),

    // Ownership and scoping
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "set null" }),

    // Categorization (avoids FK to non-existent entities)
    purpose: varchar("purpose", { length: 50 }).notNull().default("general"),

    // Soft delete
    status: fileStatusEnum("status").notNull().default("active"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // Unique constraint for storage key
    storageKeyUnique: unique("files_storage_key_unique").on(table.storageKey),

    // Query pattern indexes
    uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
    groupIdIdx: index("files_group_id_idx").on(table.groupId),
    purposeIdx: index("files_purpose_idx").on(table.purpose),
    statusIdx: index("files_status_idx").on(table.status),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
  })
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// Relations
export const filesRelations = relations(files, ({ one }) => ({
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [files.groupId],
    references: [groups.id],
  }),
}));
```

### user_storage_limits Table Schema

```typescript
// packages/db/src/schema/user-storage-limits.ts

import {
  pgTable,
  uuid,
  bigint,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

/**
 * User storage limits table - per-user quota overrides.
 *
 * This table enables the third tier of the three-tier limit system:
 * 1. System defaults (environment variables)
 * 2. Role-based limits (groups.settings JSONB)
 * 3. User-specific overrides (this table)
 *
 * NULL values mean "inherit from role or system default".
 * Non-NULL values override the inherited limit.
 *
 * Audit trail tracks who set the override and why, enabling
 * accountability for admin actions.
 */
export const userStorageLimits = pgTable(
  "user_storage_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User reference (one record per user)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Limit overrides (NULL = inherit)
    maxFileSizeBytes: bigint("max_file_size_bytes", { mode: "number" }),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }),

    // Current usage tracking
    usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),

    // Audit trail
    setBy: uuid("set_by")
      .references(() => users.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 500 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // One record per user
    userIdUnique: unique("user_storage_limits_user_id_unique").on(table.userId),
  })
);

export type UserStorageLimit = typeof userStorageLimits.$inferSelect;
export type NewUserStorageLimit = typeof userStorageLimits.$inferInsert;

// Relations
export const userStorageLimitsRelations = relations(userStorageLimits, ({ one }) => ({
  user: one(users, {
    fields: [userStorageLimits.userId],
    references: [users.id],
  }),
  setter: one(users, {
    fields: [userStorageLimits.setBy],
    references: [users.id],
    relationName: "limitsSetBy",
  }),
}));
```

### Zod Storage Schemas

```typescript
// packages/core/src/schemas/storage.schema.ts

import { z } from "zod";

/**
 * Schema for individual storage limit values.
 * All values must be non-negative integers.
 */
export const storageLimitValuesSchema = z.object({
  /** Maximum file size in bytes (e.g., 10485760 for 10MB) */
  maxFileSizeBytes: z.number().int().nonnegative().optional(),
  /** Total storage quota in bytes (e.g., 1073741824 for 1GB) */
  storageQuotaBytes: z.number().int().nonnegative().optional(),
});

/**
 * Schema for role-based storage limits within a group's settings.
 * Keys are role names (teacher, student, etc.), values are limit configs.
 *
 * Example:
 * ```json
 * {
 *   "teacher": { "maxFileSizeBytes": 52428800, "storageQuotaBytes": 5368709120 },
 *   "student": { "maxFileSizeBytes": 10485760, "storageQuotaBytes": 1073741824 }
 * }
 * ```
 */
export const roleStorageLimitsSchema = z.record(
  z.string(),
  storageLimitValuesSchema
);

/**
 * Schema for storage-related fields within groups.settings JSONB.
 * Used to validate and type-check group settings related to file storage.
 */
export const groupStorageSettingsSchema = z.object({
  /** Role-based storage limits for this group */
  storageLimits: roleStorageLimitsSchema.optional(),
});

/**
 * Schema for file metadata during upload validation.
 * Used by upload API routes to validate incoming file metadata.
 */
export const fileUploadMetadataSchema = z.object({
  /** Original filename from client */
  originalName: z.string().min(1).max(255),
  /** MIME type from client (will be validated server-side) */
  mimeType: z.string().min(1).max(100),
  /** File size in bytes */
  sizeBytes: z.number().int().positive(),
  /** Purpose/category for the file */
  purpose: z.string().min(1).max(50).default("general"),
  /** Optional group to associate file with */
  groupId: z.string().uuid().optional(),
});

/**
 * Schema for user storage limit override input.
 * Used when admins set user-specific limits.
 */
export const setUserStorageLimitSchema = z.object({
  /** User to set limits for */
  userId: z.string().uuid(),
  /** Maximum file size override (null to inherit) */
  maxFileSizeBytes: z.number().int().nonnegative().nullable().optional(),
  /** Storage quota override (null to inherit) */
  storageQuotaBytes: z.number().int().nonnegative().nullable().optional(),
  /** Reason for the override (audit trail) */
  reason: z.string().max(500).optional(),
});

// Type exports
export type StorageLimitValues = z.infer<typeof storageLimitValuesSchema>;
export type RoleStorageLimits = z.infer<typeof roleStorageLimitsSchema>;
export type GroupStorageSettings = z.infer<typeof groupStorageSettingsSchema>;
export type FileUploadMetadata = z.infer<typeof fileUploadMetadataSchema>;
export type SetUserStorageLimit = z.infer<typeof setUserStorageLimitSchema>;
```

### Migration SQL

```sql
-- Migration: 0012_create_files_storage.sql
-- Creates files table and user_storage_limits table for file storage infrastructure

-- Create file_status enum
CREATE TYPE "public"."file_status" AS ENUM('active', 'soft_deleted');--> statement-breakpoint

-- Create storage_backend enum
CREATE TYPE "public"."storage_backend" AS ENUM('s3', 'local');--> statement-breakpoint

-- Create files table
CREATE TABLE "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "original_name" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "storage_backend" "storage_backend" NOT NULL DEFAULT 's3',
  "uploaded_by" uuid NOT NULL,
  "group_id" uuid,
  "purpose" varchar(50) NOT NULL DEFAULT 'general',
  "status" "file_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

-- Create user_storage_limits table
CREATE TABLE "user_storage_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "max_file_size_bytes" bigint,
  "storage_quota_bytes" bigint,
  "used_bytes" bigint NOT NULL DEFAULT 0,
  "set_by" uuid,
  "reason" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Foreign key constraints for files table
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "files" ADD CONSTRAINT "files_group_id_groups_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Foreign key constraints for user_storage_limits table
ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_set_by_users_id_fk"
  FOREIGN KEY ("set_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Unique constraints
ALTER TABLE "files" ADD CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key");--> statement-breakpoint

ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_user_id_unique" UNIQUE("user_id");--> statement-breakpoint

-- Indexes for files table
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_group_id_idx" ON "files" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "files_purpose_idx" ON "files" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at");--> statement-breakpoint

-- Triggers for updated_at (reuse existing function from 0009)
-- Note: update_updated_at_column() function already exists from migration 0009
DROP TRIGGER IF EXISTS update_files_updated_at ON files;--> statement-breakpoint
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS update_user_storage_limits_updated_at ON user_storage_limits;--> statement-breakpoint
CREATE TRIGGER update_user_storage_limits_updated_at
  BEFORE UPDATE ON user_storage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Edge Cases

1. **Storage key collisions**: The unique constraint on `storage_key` prevents collisions. If a collision attempt occurs, the database will reject the insert with a constraint violation that the service layer must handle gracefully.

2. **User deletion with files**: CASCADE delete on `uploaded_by` will delete all files when a user is deleted. This is intentional - orphaned files would clutter storage. The cleanup job handles removing actual storage backend files.

3. **Group deletion with files**: CASCADE delete on `group_id` will only null the `group_id` field since it's nullable. Files remain accessible to the uploader even if the group is deleted.

4. **Admin deletion with limits set**: SET NULL on `set_by` preserves the limit record even if the admin who set it is deleted. The limit remains in effect; only the audit trail reference is lost.

5. **Very large files**: Using `bigint` for `size_bytes` supports files up to ~9 exabytes (2^63-1 bytes), which is more than sufficient for any practical file size.

6. **Empty purpose field**: Default value 'general' ensures purpose is never empty. Validation at the API layer should enforce non-empty strings for explicit categorization.

7. **Concurrent usage updates**: `used_bytes` will be updated atomically in transactions by the file service (E05-T005). This schema only defines the field; concurrency handling is a service concern.

8. **Mixed NULL/non-NULL limits**: When `max_file_size_bytes` is set but `storage_quota_bytes` is NULL (or vice versa), the service layer must handle partial overrides correctly by inheriting only the unset values.

## Open Questions

*To be resolved during code review.*

### Q1: Should `used_bytes` have a CHECK constraint for `>= 0`?

**Recommendation: Yes, add it.**

Rationale:
- Negative bytes is nonsensical and indicates a bug in the accounting logic
- A CHECK constraint catches these bugs at the database level before they corrupt data
- The cost is negligible (checked on INSERT/UPDATE)
- If accounting ever goes negative, we *want* the operation to fail loudly rather than silently storing invalid state

Counter-argument: Could argue "let the app handle it" but defensive database constraints are cheap insurance.

---

### Q2: Should there be a composite index on `(uploaded_by, status)`?

**Recommendation: Not yet - premature optimization.**

Rationale:
- We already have an index on `uploaded_by` alone
- The primary query pattern is likely "get all files for user" not "get pending files for user"
- If we later find ourselves frequently querying `WHERE uploaded_by = ? AND status = ?`, we can add it then
- Indexes have write overhead and maintenance cost

Counter-argument: If the file list UI will filter by status, might be worth it. But wait for evidence.

---

### Q3: Should `purpose` be an extensible enum instead of varchar?

**Recommendation: Keep varchar.**

Rationale:
- Purpose values will likely grow as features are added (chat attachments, profile images, assignment submissions, exports, etc.)
- PostgreSQL enums require migrations to add values
- A varchar with application-level validation (Zod) gives flexibility
- We can add a CHECK constraint with allowed values if we want DB-level enforcement later

Counter-argument: Enums provide better data integrity and storage efficiency. But the flexibility tradeoff favors varchar here.

---

### Q4: Should the migration be split into two files?

**Recommendation: Single file is fine.**

Rationale:
- Both tables are part of the same logical feature (file storage)
- They're being introduced together and have no dependencies between them
- Simpler to reason about as one unit
- If one fails, we want both to roll back anyway

Counter-argument: Could split if we wanted to deploy `files` table before limits. But they're designed as a cohesive unit.

---

## Architecture Review

**Reviewer**: architect
**Date**: 2026-01-15
**Result**: ✅ **APPROVED** with minor recommendations

### Summary

This spec is well-designed and aligns with the established architecture patterns. The schema follows Drizzle conventions, the three-tier storage limit system is elegantly designed, and the intentional decoupling from E03 entities is the right call for early infrastructure.

### Alignment with Architecture

| Aspect | Assessment |
|--------|------------|
| **Technology Stack** | ✅ Drizzle ORM, PostgreSQL, Zod - exactly as specified in ARCHITECTURE.md |
| **Schema Patterns** | ✅ UUID PKs, snake_case columns, timestamps, soft delete - matches existing tables |
| **File Organization** | ✅ Schema in `packages/db/src/schema/`, Zod in `packages/core/src/schemas/` |
| **Migration Naming** | ✅ `0012_create_files_storage.sql` follows `NNNN_description.sql` convention |
| **Type Exports** | ✅ `$inferSelect` and `$inferInsert` patterns match users.ts, tools.ts |
| **Testing Strategy** | ✅ Unit tests for schema structure and Zod validation |

### Design Decisions Review

**1. Purpose field as varchar vs enum** ✅ Approved
- The spec correctly chooses varchar over enum for purpose field
- Application-level validation via Zod gives flexibility as features grow
- Matches the "explicit over implicit" principle without sacrificing safety

**2. CASCADE delete on uploaded_by** ✅ Approved
- Consistent with tools.created_by cascade behavior
- Orphan files would be problematic to manage
- Worker job for storage backend cleanup is the right architectural pattern

**3. Nullable group_id FK behavior** ✅ Clarified
- Groups use soft delete (`deleted_at`), so FK cascade behavior rarely triggers
- For defensive correctness, use `onDelete: "set null"` — files survive if group is ever hard-deleted
- **Resolution**: Change from CASCADE to SET NULL in schema and migration

**4. Three-tier limit system** ✅ Approved
- Elegant design: system → role → user override
- NULL semantics for inheritance is clean
- Storing role limits in groups.settings JSONB is appropriate (no new table needed)

**5. Audit trail with SET NULL on set_by** ✅ Approved
- Preserves limit settings even if admin is deleted
- Only loses the "who" reference, which is acceptable

### Open Questions Resolution

**Q1: CHECK constraint for used_bytes >= 0**
- **Decision: Yes, add it**
- Defensive constraints catch bugs early; negligible performance cost

**Q2: Composite index on (uploaded_by, status)**
- **Decision: Defer**
- Wait for query patterns to emerge; avoid premature optimization

**Q3: Purpose as varchar vs enum**
- **Decision: Keep varchar**
- Already addressed in spec; flexibility trumps storage efficiency here

**Q4: Single vs split migration**
- **Decision: Single file**
- Tables are logically cohesive; single transaction for all-or-nothing

### Required Changes Before Implementation

1. **Update group_id FK to SET NULL**: ✅ Resolved
   - Change `onDelete: "cascade"` to `onDelete: "set null"` on `group_id` FK
   - Update migration SQL accordingly
   - Groups use soft delete, so this is defensive — files survive any hard delete scenario

### Recommendations (Non-blocking)

1. **Add CHECK constraint for used_bytes**: `CHECK (used_bytes >= 0)` in migration
2. **Consider file content hash**: Future-proofing for deduplication (can add later)
3. **Document storage_key format**: Add comment in schema about expected format (e.g., `{backend}/{uuid}/{filename}`)

### Files Verified for Consistency

- [users.ts](packages/db/src/schema/users.ts) - Type export patterns ✓
- [tools.ts](packages/db/src/schema/tools.ts) - FK cascade behavior ✓
- [groups.ts](packages/db/src/schema/groups.ts) - Settings JSONB pattern ✓
- [message-meta.schema.ts](packages/core/src/schemas/message-meta.schema.ts) - Zod schema patterns ✓
- [0009_add_tools_updated_at_trigger.sql](packages/db/src/migrations/0009_add_tools_updated_at_trigger.sql) - Trigger reuse ✓

### Conclusion

The spec demonstrates solid understanding of the codebase patterns and makes sensible architectural tradeoffs. The only issue requiring clarification is the CASCADE vs SET NULL behavior on `group_id`. Once that's clarified, the task is ready for implementation.

**Verdict**: ✅ APPROVED — Ready for implementation
