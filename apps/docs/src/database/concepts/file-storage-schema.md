---
title: File Storage Schema
description: Database schema for file metadata tracking and storage quota management
related_code:
  - packages/db/src/schema/files.ts
  - packages/db/src/schema/user-storage-limits.ts
  - packages/db/src/migrations/0012_create_files_storage.sql
  - packages/core/src/schemas/storage.schema.ts
implements_task: E05-T001
last_verified: 2026-01-15
---

# File Storage Schema

RaptScallions implements a flexible file storage system with metadata tracking, multi-backend support, and a three-tier storage quota system. This guide explains the database schema design and how the storage limit resolution works.

## Overview

The file storage system consists of two main tables:

- **files** — Tracks uploaded file metadata (name, size, location, ownership)
- **user_storage_limits** — Stores per-user quota overrides and usage tracking

Together, these enable:
- File uploads with metadata tracking
- Multi-backend storage (S3-compatible, local filesystem)
- Soft delete with cleanup workflow
- Three-tier storage limit system (system → role → user)
- Usage quota enforcement

## Files Table

### Schema Structure

The `files` table tracks all uploaded file metadata without depending on E03 entities (classes, assignments, tools). This decoupling allows file infrastructure to be used early in the platform lifecycle.

```typescript
// packages/db/src/schema/files.ts
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
    storageKeyUnique: unique("files_storage_key_unique").on(table.storageKey),
    uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
    groupIdIdx: index("files_group_id_idx").on(table.groupId),
    purposeIdx: index("files_purpose_idx").on(table.purpose),
    statusIdx: index("files_status_idx").on(table.status),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
  })
);
```

### Key Design Decisions

**Purpose field over entity FK**

The `purpose` field (varchar) categorizes files without foreign keys to E03 entities:

```typescript
purpose: varchar("purpose", { length: 50 }).notNull().default("general")
```

Valid purposes:
- `general` — Default category for uncategorized files
- `avatar` — User profile pictures
- `attachment` — Future: assignment attachments
- `export` — Future: exported reports/data

When E03 entities are implemented, association tables (like `assignment_attachments`) will link files to specific entities while the `purpose` field provides high-level categorization.

**Multi-backend storage support**

Files track which storage backend stores the actual file data:

```typescript
export const storageBackendEnum = pgEnum("storage_backend", ["s3", "local"]);
```

- `s3` — S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2)
- `local` — Local filesystem (development/testing only)

The `storageKey` contains the backend-specific path/key to the file data.

**Soft delete workflow**

Files use status-based soft delete instead of immediate deletion:

```typescript
export const fileStatusEnum = pgEnum("file_status", ["active", "soft_deleted"]);
```

Workflow:
1. `status='active'` — File is accessible
2. `status='soft_deleted'`, `deleted_at` set — Marked for deletion (user can restore within 30 days)
3. Background job (30 days later) — Hard deletes from storage backend and database

### Foreign Key Behaviors

**CASCADE on uploaded_by**

When a user is deleted, all their uploaded files are deleted:

```typescript
uploadedBy: uuid("uploaded_by")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" })
```

This prevents orphaned files from cluttering storage.

**SET NULL on group_id**

When a group is hard-deleted, files remain accessible to the uploader:

```typescript
groupId: uuid("group_id")
  .references(() => groups.id, { onDelete: "set null" })
```

Groups use soft delete (`deleted_at`), so hard deletes are rare. This behavior is defensive.

### Common Query Patterns

**Get active files for a user**

```typescript
const userFiles = await db.query.files.findMany({
  where: and(
    eq(files.uploadedBy, userId),
    eq(files.status, "active")
  ),
  orderBy: desc(files.createdAt)
});
```

**Get files by purpose**

```typescript
const avatars = await db.query.files.findMany({
  where: and(
    eq(files.purpose, "avatar"),
    eq(files.status, "active")
  )
});
```

**Soft delete a file**

```typescript
await db.update(files)
  .set({
    status: "soft_deleted",
    deletedAt: new Date()
  })
  .where(eq(files.id, fileId));
```

## User Storage Limits Table

### Schema Structure

The `user_storage_limits` table enables the third tier of the three-tier storage limit system. It tracks per-user quota overrides and current usage.

```typescript
// packages/db/src/schema/user-storage-limits.ts
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
    userIdUnique: unique("user_storage_limits_user_id_unique").on(table.userId),
  })
);
```

### Nullable Override Semantics

Limit fields are nullable with specific meaning:

```typescript
maxFileSizeBytes: bigint("max_file_size_bytes", { mode: "number" })  // NULL = inherit
storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" })  // NULL = inherit
```

- `NULL` — Inherit from role-based limit or system default
- Non-NULL value — Override the inherited limit for this user

This allows partial overrides:
- Set `maxFileSizeBytes` but leave `storageQuotaBytes` as NULL → only file size is overridden
- Set `storageQuotaBytes` to 0 → disable uploads for this user
- Set both to NULL → remove all overrides, inherit fully

### Usage Tracking

The `used_bytes` field tracks current storage consumption:

```typescript
usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0)
```

**CHECK constraint in migration:**

```sql
"used_bytes" bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0)
```

This prevents negative values from bugs in accounting logic. The service layer updates this atomically when files are uploaded or deleted.

### Audit Trail

Admin actions are tracked for accountability:

```typescript
setBy: uuid("set_by")
  .references(() => users.id, { onDelete: "set null" })
reason: varchar("reason", { length: 500 })
```

**SET NULL on set_by:**

If the admin who set the limit is deleted, the limit remains in effect. Only the "who" reference is lost.

Example audit trail:
```json
{
  "userId": "user-123",
  "storageQuotaBytes": 10737418240,  // 10 GB
  "setBy": "admin-456",
  "reason": "Power user - needs extra storage for course materials"
}
```

### Common Query Patterns

**Get user's storage limits**

```typescript
const limits = await db.query.userStorageLimits.findFirst({
  where: eq(userStorageLimits.userId, userId)
});
```

**Set user override**

```typescript
await db.insert(userStorageLimits)
  .values({
    userId,
    maxFileSizeBytes: 52428800,  // 50 MB
    storageQuotaBytes: 5368709120,  // 5 GB
    setBy: adminId,
    reason: "Teacher account - needs larger upload limits"
  })
  .onConflictDoUpdate({
    target: userStorageLimits.userId,
    set: {
      maxFileSizeBytes: 52428800,
      storageQuotaBytes: 5368709120,
      setBy: adminId,
      reason: "Teacher account - needs larger upload limits",
      updatedAt: new Date()
    }
  });
```

**Check if user is over quota**

```typescript
const limits = await db.query.userStorageLimits.findFirst({
  where: eq(userStorageLimits.userId, userId)
});

const effectiveQuota = limits?.storageQuotaBytes ?? defaultQuota;
const isOverQuota = limits ? limits.usedBytes >= effectiveQuota : false;
```

## Three-Tier Storage Limit System

The platform resolves storage limits in three tiers:

1. **System defaults** — Environment variables (fallback)
2. **Role-based limits** — Group settings JSONB (`groups.settings.storageLimits`)
3. **User overrides** — User storage limits table (highest priority)

### Resolution Algorithm

The service layer resolves limits in this order:

```typescript
async function resolveStorageLimits(userId: string): Promise<StorageLimits> {
  // 1. Get user's role and group
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { memberships: { with: { group: true } } }
  });

  if (!user) throw new NotFoundError("User", userId);

  const primaryGroup = user.memberships[0]?.group;
  const userRole = user.memberships[0]?.role;

  // 2. Start with system defaults
  let maxFileSizeBytes = parseInt(process.env.DEFAULT_MAX_FILE_SIZE_BYTES || "10485760");
  let storageQuotaBytes = parseInt(process.env.DEFAULT_STORAGE_QUOTA_BYTES || "1073741824");

  // 3. Apply role-based limits if available
  if (primaryGroup?.settings?.storageLimits?.[userRole]) {
    const roleLimits = primaryGroup.settings.storageLimits[userRole];
    maxFileSizeBytes = roleLimits.maxFileSizeBytes ?? maxFileSizeBytes;
    storageQuotaBytes = roleLimits.storageQuotaBytes ?? storageQuotaBytes;
  }

  // 4. Apply user-specific overrides if available
  const userLimits = await db.query.userStorageLimits.findFirst({
    where: eq(userStorageLimits.userId, userId)
  });

  if (userLimits) {
    maxFileSizeBytes = userLimits.maxFileSizeBytes ?? maxFileSizeBytes;
    storageQuotaBytes = userLimits.storageQuotaBytes ?? storageQuotaBytes;
  }

  return { maxFileSizeBytes, storageQuotaBytes };
}
```

### Role-Based Limits (Tier 2)

Role-based limits are stored in the `groups.settings` JSONB field:

```json
{
  "storageLimits": {
    "teacher": {
      "maxFileSizeBytes": 52428800,      // 50 MB
      "storageQuotaBytes": 5368709120     // 5 GB
    },
    "student": {
      "maxFileSizeBytes": 10485760,      // 10 MB
      "storageQuotaBytes": 1073741824    // 1 GB
    }
  }
}
```

**Zod validation:**

```typescript
// packages/core/src/schemas/storage.schema.ts
export const roleStorageLimitsSchema = z.record(
  z.string(),
  z.object({
    maxFileSizeBytes: z.number().int().nonnegative().optional(),
    storageQuotaBytes: z.number().int().nonnegative().optional(),
  })
);
```

### Example Resolution Scenarios

**Scenario 1: System defaults only**

- User has no group or role
- No user override exists
- Result: System defaults (10 MB max file, 1 GB quota)

**Scenario 2: Role-based limits**

- User is `teacher` in a group
- Group settings: `teacher` → 50 MB max file, 5 GB quota
- No user override
- Result: Role limits (50 MB, 5 GB)

**Scenario 3: Partial user override**

- User is `student` in a group
- Group settings: `student` → 10 MB, 1 GB
- User override: `maxFileSizeBytes = 52428800`, `storageQuotaBytes = NULL`
- Result: 50 MB max file (override), 1 GB quota (inherited from role)

**Scenario 4: Full user override**

- User is `student` in a group
- Group settings: `student` → 10 MB, 1 GB
- User override: `maxFileSizeBytes = 104857600`, `storageQuotaBytes = 10737418240`
- Result: 100 MB max file (override), 10 GB quota (override)

## Migration History

### Migration 0012: Create Files and Storage

This migration creates both tables, enums, indexes, and constraints:

```sql
-- Create enums
CREATE TYPE "public"."file_status" AS ENUM('active', 'soft_deleted');
CREATE TYPE "public"."storage_backend" AS ENUM('s3', 'local');

-- Create tables
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
);

CREATE TABLE "user_storage_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "max_file_size_bytes" bigint,
  "storage_quota_bytes" bigint,
  "used_bytes" bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  "set_by" uuid,
  "reason" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key constraints:**

- `files_storage_key_unique` — Prevents storage key collisions
- `user_storage_limits_user_id_unique` — One record per user
- `CHECK (used_bytes >= 0)` — Prevents negative usage values

**Indexes for query patterns:**

- `files_uploaded_by_idx` — Get files by user
- `files_group_id_idx` — Get files by group
- `files_purpose_idx` — Filter by purpose
- `files_status_idx` — Filter active vs soft-deleted
- `files_deleted_at_idx` — Query soft-deleted files

**Triggers:**

Both tables use the `update_updated_at_column()` function from migration 0009 to automatically update `updated_at` on row modifications.

## Related Pages

**Related Documentation:**
- [Database Schema Overview](/database/)

**Implementation:**
- [E05-T001: Files and storage limits schemas](/backlog/tasks/E05/E05-T001.md) ([spec](/backlog/docs/specs/E05/E05-T001-spec.md), [code review](/backlog/docs/reviews/E05/E05-T001-code-review.md), [QA report](/backlog/docs/reviews/E05/E05-T001-qa-report.md))

**Source Files:**
- [files.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/db/src/schema/files.ts) — Files table schema
- [user-storage-limits.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/db/src/schema/user-storage-limits.ts) — Storage limits table schema
- [storage.schema.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/core/src/schemas/storage.schema.ts) — Zod validation schemas
- [0012_create_files_storage.sql](https://github.com/ryandt33/raptscallions/blob/main/packages/db/src/migrations/0012_create_files_storage.sql) — Migration file
