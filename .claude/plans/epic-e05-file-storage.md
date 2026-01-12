# Epic E05: File Storage & Attachment Management - Implementation Plan

**Status:** Draft - Awaiting Approval
**Created:** 2026-01-13
**Epic Priority:** 4
**Estimated Duration:** 2-3 weeks
**Depends On:** E01 (Database), E02 (Auth & Permissions), E03 (Core Entities)

---

## Executive Summary

This plan designs a comprehensive file storage system for Raptscallions that:
- Supports multiple cloud backends (S3, Azure, GCS, Aliyun) with S3-compatible MinIO as default
- Implements three-tier limit system: default → role-based → user-specific overrides
- Integrates CASL permissions for file-level access control
- Tracks storage quotas at per-user level with atomic updates
- Provides secure signed URLs for direct downloads (avoiding API proxy)
- Handles avatars, assignment attachments, and student submissions

**User Requirements Incorporated:**
✅ Multi-backend support (local, S3, Azure, GCS, Aliyun)
✅ Default backend: S3-compatible (MinIO for self-hosted)
✅ CASL permission integration
✅ Per-file limits + per-user quotas
✅ **User-level overrides for storage quotas** (NEW)
✅ **File size limits by default, role, AND user** (NEW)

---

## Architecture Overview

### Three-Tier Limit System

```
DEFAULT LIMITS (system-wide)
    ↓
ROLE-BASED LIMITS (teacher, student)
    ↓
USER-SPECIFIC OVERRIDES (individual exceptions)
```

**Implementation Strategy:**
1. **Default Limits** - Stored in environment variables/config
2. **Role Limits** - Stored in JSONB column `group_settings.limits`
3. **User Overrides** - Stored in new `user_storage_limits` table

**Limit Types:**
- `max_file_size` - Maximum size per individual file upload
- `storage_quota` - Total storage across all files

---

## Database Schema Extensions

### 1. Files Table (E05-T001)

```typescript
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageBackend: varchar('storage_backend', { length: 50 }).notNull().default('s3'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').references(() => groups.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 50 }), // 'avatar', 'message_attachment', 'submission'
  entityId: uuid('entity_id'),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'soft_deleted'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### 2. User Storage Limits Table (NEW - for user-level overrides)

```typescript
export const userStorageLimits = pgTable('user_storage_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // User-specific overrides (NULL = use role/default)
  maxFileSizeBytes: bigint('max_file_size_bytes', { mode: 'number' }), // Per-file limit override
  storageQuotaBytes: bigint('storage_quota_bytes', { mode: 'number' }), // Total quota override

  // Usage tracking
  usedBytes: bigint('used_bytes', { mode: 'number' }).notNull().default(0),

  // Audit
  setBy: uuid('set_by').references(() => users.id), // Admin who set the override
  reason: text('reason'), // Why was override applied?
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 3. Group Settings Extension (for role-based limits)

```typescript
// Add to existing groups.settings JSONB field:
{
  "limits": {
    "teacher": {
      "maxFileSizeBytes": 52428800,    // 50MB
      "storageQuotaBytes": 5368709120   // 5GB
    },
    "student": {
      "maxFileSizeBytes": 10485760,     // 10MB
      "storageQuotaBytes": 1073741824   // 1GB
    }
  }
}
```

---

## Limit Resolution Logic

```typescript
// apps/api/src/services/file-limits.service.ts

export class FileLimitsService {
  /**
   * Resolve effective limits for a user by checking:
   * 1. User-specific overrides (highest priority)
   * 2. Role-based group limits
   * 3. System defaults (fallback)
   */
  async getEffectiveLimits(userId: string): Promise<UserLimits> {
    // 1. Check user-specific overrides
    const userOverride = await db.query.userStorageLimits.findFirst({
      where: eq(userStorageLimits.userId, userId),
    });

    if (userOverride?.maxFileSizeBytes && userOverride?.storageQuotaBytes) {
      return {
        maxFileSizeBytes: userOverride.maxFileSizeBytes,
        storageQuotaBytes: userOverride.storageQuotaBytes,
        usedBytes: userOverride.usedBytes,
        source: 'user_override',
      };
    }

    // 2. Check role-based group limits
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        groupMembers: {
          with: { group: true },
          orderBy: (gm, { desc }) => [desc(gm.createdAt)],
          limit: 1, // Primary group
        },
      },
    });

    if (user?.groupMembers[0]) {
      const group = user.groupMembers[0].group;
      const role = user.groupMembers[0].role;
      const groupLimits = group.settings?.limits?.[role];

      if (groupLimits) {
        return {
          maxFileSizeBytes: userOverride?.maxFileSizeBytes ?? groupLimits.maxFileSizeBytes,
          storageQuotaBytes: userOverride?.storageQuotaBytes ?? groupLimits.storageQuotaBytes,
          usedBytes: userOverride?.usedBytes ?? 0,
          source: 'role_based',
        };
      }
    }

    // 3. Fallback to system defaults
    return {
      maxFileSizeBytes: storageConfig.DEFAULT_MAX_FILE_SIZE_BYTES,
      storageQuotaBytes: storageConfig.DEFAULT_STORAGE_QUOTA_BYTES,
      usedBytes: userOverride?.usedBytes ?? 0,
      source: 'system_default',
    };
  }

  /**
   * Admin-only: Set user-specific limit override
   */
  async setUserOverride(
    userId: string,
    limits: { maxFileSizeBytes?: number; storageQuotaBytes?: number },
    setBy: string,
    reason?: string
  ): Promise<void> {
    await db
      .insert(userStorageLimits)
      .values({
        userId,
        maxFileSizeBytes: limits.maxFileSizeBytes,
        storageQuotaBytes: limits.storageQuotaBytes,
        setBy,
        reason,
      })
      .onConflictDoUpdate({
        target: userStorageLimits.userId,
        set: {
          maxFileSizeBytes: limits.maxFileSizeBytes,
          storageQuotaBytes: limits.storageQuotaBytes,
          setBy,
          reason,
          updatedAt: new Date(),
        },
      });
  }
}
```

---

## File Upload Flow with Multi-Tier Limits

```typescript
// apps/api/src/services/file.service.ts

async uploadFile(params: UploadFileParams): Promise<File> {
  const limits = await fileLimitsService.getEffectiveLimits(params.userId);

  // 1. Check file size against user's effective limit
  if (params.buffer.length > limits.maxFileSizeBytes) {
    throw new ValidationError(
      `File size (${formatBytes(params.buffer.length)}) exceeds your limit of ${formatBytes(limits.maxFileSizeBytes)}`,
      {
        fileSize: params.buffer.length,
        limit: limits.maxFileSizeBytes,
        limitSource: limits.source,
      }
    );
  }

  // 2. Check storage quota
  if (limits.usedBytes + params.buffer.length > limits.storageQuotaBytes) {
    throw new QuotaExceededError(
      `Storage quota exceeded. Used: ${formatBytes(limits.usedBytes)}, Limit: ${formatBytes(limits.storageQuotaBytes)}`,
      {
        usedBytes: limits.usedBytes,
        quotaBytes: limits.storageQuotaBytes,
        additionalBytes: params.buffer.length,
        limitSource: limits.source,
      }
    );
  }

  // 3. Upload to storage backend
  const { storageKey } = await this.storage.upload(params);

  // 4. Transaction: create file record + update quota
  return await db.transaction(async (tx) => {
    const [file] = await tx.insert(files).values({
      name: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
      storageKey,
      storageBackend: this.storage.backendName,
      uploadedBy: params.userId,
      groupId: params.groupId,
      entityType: params.entityType,
      entityId: params.entityId,
    }).returning();

    // Update user's quota tracking
    await tx
      .insert(userStorageLimits)
      .values({
        userId: params.userId,
        usedBytes: params.buffer.length,
      })
      .onConflictDoUpdate({
        target: userStorageLimits.userId,
        set: {
          usedBytes: sql`${userStorageLimits.usedBytes} + ${params.buffer.length}`,
          updatedAt: new Date(),
        },
      });

    return file;
  });
}
```

---

## Environment Variables

```bash
# Storage Configuration
STORAGE_BACKEND=s3  # 'local', 's3', 'azure', 'gcs', 'aliyun'

# Default Limits (System-wide fallback)
DEFAULT_MAX_FILE_SIZE_BYTES=10485760      # 10MB
DEFAULT_STORAGE_QUOTA_BYTES=1073741824    # 1GB

# S3/MinIO Configuration
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=raptscallions-files
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true

# Local Storage (Development)
LOCAL_STORAGE_PATH=./storage/uploads

# Signed URL Expiration
SIGNED_URL_EXPIRES_SECONDS=900  # 15 minutes

# Azure Blob Storage (Optional)
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_ACCESS_KEY=
AZURE_STORAGE_CONTAINER=

# Google Cloud Storage (Optional)
GCS_BUCKET=
GCS_PROJECT_ID=
GCS_KEY_FILE=

# Aliyun OSS (Optional)
ALIYUN_REGION=
ALIYUN_BUCKET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
```

---

## API Routes (Extended)

### New Admin Routes for Limit Management

```typescript
// PATCH /admin/users/:userId/limits
// Set user-specific storage limit overrides (admin only)
app.patch<{
  Params: { userId: string };
  Body: { maxFileSizeBytes?: number; storageQuotaBytes?: number; reason?: string }
}>(
  '/admin/users/:userId/limits',
  { preHandler: [app.authenticate, app.requireRole('system_admin')] },
  async (request, reply) => {
    await fileLimitsService.setUserOverride(
      request.params.userId,
      {
        maxFileSizeBytes: request.body.maxFileSizeBytes,
        storageQuotaBytes: request.body.storageQuotaBytes,
      },
      request.user!.id,
      request.body.reason
    );
    return reply.status(204).send();
  }
);

// GET /admin/users/:userId/limits
// Get user's effective limits and source
app.get<{ Params: { userId: string } }>(
  '/admin/users/:userId/limits',
  { preHandler: [app.authenticate, app.requireRole('system_admin')] },
  async (request, reply) => {
    const limits = await fileLimitsService.getEffectiveLimits(request.params.userId);
    return reply.send({ data: limits });
  }
);

// PATCH /admin/groups/:groupId/limits
// Set role-based limits for a group (group_admin or system_admin)
app.patch<{
  Params: { groupId: string };
  Body: {
    teacher?: { maxFileSizeBytes?: number; storageQuotaBytes?: number };
    student?: { maxFileSizeBytes?: number; storageQuotaBytes?: number };
  };
}>(
  '/admin/groups/:groupId/limits',
  { preHandler: [app.authenticate, app.requirePermission('manage', 'Group')] },
  async (request, reply) => {
    await groupService.updateSettings(request.params.groupId, {
      limits: request.body,
    });
    return reply.status(204).send();
  }
);
```

### User-Facing Routes

```typescript
// GET /users/me/limits
// Get current user's effective limits
app.get(
  '/users/me/limits',
  { preHandler: [app.authenticate] },
  async (request, reply) => {
    const limits = await fileLimitsService.getEffectiveLimits(request.user!.id);
    return reply.send({ data: limits });
  }
);
```

---

## Task Breakdown (Updated)

### E05-T001: Files and storage limits schemas (UPDATED)

**NEW Acceptance Criteria:**
- [ ] AC11: `user_storage_limits` table with user-specific overrides (max_file_size_bytes, storage_quota_bytes)
- [ ] AC12: Columns: set_by (FK users), reason (text) for audit trail
- [ ] AC13: Add `limits` JSONB to groups.settings for role-based limits
- [ ] AC14: Migration includes trigger to auto-update user_storage_limits.used_bytes
- [ ] AC15: Tests verify three-tier limit resolution (user → role → default)

### E05-T006: File service and quota tracking (UPDATED)

**NEW Acceptance Criteria:**
- [ ] AC11: FileLimitsService with getEffectiveLimits(userId) method
- [ ] AC12: Limit resolution follows priority: user override → role → default
- [ ] AC13: setUserOverride() method for admin limit management
- [ ] AC14: Upload validates against user's effective max_file_size_bytes
- [ ] AC15: Upload validates against user's effective storage_quota_bytes
- [ ] AC16: Error messages include limit source ("user override", "role-based", "system default")

### E05-T008: File download and management API routes (UPDATED)

**NEW Acceptance Criteria:**
- [ ] AC11: GET /users/me/limits returns effective limits with source
- [ ] AC12: PATCH /admin/users/:userId/limits sets user overrides (admin only)
- [ ] AC13: GET /admin/users/:userId/limits gets user's effective limits (admin only)
- [ ] AC14: PATCH /admin/groups/:groupId/limits sets role-based limits
- [ ] AC15: Tests verify limit override permissions (only system_admin can set user overrides)

### E05-T011: Limit management UI mockups (NEW TASK - Out of Epic Scope)

**Description:** Design mockups for admin interfaces to manage user overrides and group role limits.
**Note:** Implementation deferred to frontend epic E06.

---

## CASL Permission Rules (Extended)

```typescript
// packages/auth/src/abilities.ts

// File permissions
can('read', 'File', { uploadedBy: user.id }); // Owner
can('delete', 'File', { uploadedBy: user.id }); // Owner
can(['read', 'delete'], 'File', { groupId: { $in: userGroupIds } }); // Group admin

// Limit management permissions
if (user.role === 'system_admin') {
  can('manage', 'UserLimits'); // System admins can set user overrides
  can('manage', 'GroupLimits'); // System admins can set group role limits
}

if (user.role === 'group_admin') {
  can('manage', 'GroupLimits', { groupId: { $in: adminGroupIds } }); // Group admins can set their group's role limits
}
```

---

## Testing Strategy (Extended)

### New Test Cases for Limit System

```typescript
describe('File Upload with Three-Tier Limits', () => {
  it('should use system default when no overrides exist', async () => {
    const limits = await fileLimitsService.getEffectiveLimits('user-123');
    expect(limits.source).toBe('system_default');
    expect(limits.maxFileSizeBytes).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
  });

  it('should use role-based limit from group settings', async () => {
    await createGroupWithLimits({
      teacher: { maxFileSizeBytes: 50 * MB, storageQuotaBytes: 5 * GB },
    });
    const limits = await fileLimitsService.getEffectiveLimits('teacher-user-123');
    expect(limits.source).toBe('role_based');
    expect(limits.maxFileSizeBytes).toBe(50 * MB);
  });

  it('should use user-specific override when set', async () => {
    await fileLimitsService.setUserOverride('user-123', {
      maxFileSizeBytes: 100 * MB,
      storageQuotaBytes: 10 * GB,
    }, 'admin-123', 'Special project needs');

    const limits = await fileLimitsService.getEffectiveLimits('user-123');
    expect(limits.source).toBe('user_override');
    expect(limits.maxFileSizeBytes).toBe(100 * MB);
  });

  it('should reject file exceeding user-specific limit', async () => {
    await fileLimitsService.setUserOverride('user-123', {
      maxFileSizeBytes: 5 * MB,
    }, 'admin-123');

    await expect(
      fileService.uploadFile({
        userId: 'user-123',
        buffer: Buffer.alloc(10 * MB),
        filename: 'large.pdf',
        mimeType: 'application/pdf',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should allow admin to set user override', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user-123/limits',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        maxFileSizeBytes: 100 * MB,
        reason: 'Graduate student research project',
      },
    });
    expect(response.statusCode).toBe(204);
  });

  it('should forbid non-admin from setting user override', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/admin/users/user-123/limits',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: { maxFileSizeBytes: 100 * MB },
    });
    expect(response.statusCode).toBe(403);
  });
});
```

---

## Migration Files (Updated)

### 0010_create_files_and_limits.sql

```sql
-- Create files table
CREATE TABLE "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "storage_backend" varchar(50) NOT NULL DEFAULT 's3',
  "uploaded_by" uuid NOT NULL,
  "group_id" uuid,
  "entity_type" varchar(50),
  "entity_id" uuid,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "files_uploaded_by_users_id_fk"
    FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "files_group_id_groups_id_fk"
    FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade
);

CREATE INDEX "files_uploaded_by_idx" ON "files" ("uploaded_by");
CREATE INDEX "files_group_id_idx" ON "files" ("group_id");
CREATE INDEX "files_entity_idx" ON "files" ("entity_type", "entity_id");
CREATE INDEX "files_status_idx" ON "files" ("status");

-- Create user storage limits table (for user-specific overrides)
CREATE TABLE "user_storage_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "max_file_size_bytes" bigint,
  "storage_quota_bytes" bigint,
  "used_bytes" bigint NOT NULL DEFAULT 0,
  "set_by" uuid,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_storage_limits_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "user_storage_limits_set_by_users_id_fk"
    FOREIGN KEY ("set_by") REFERENCES "public"."users"("id") ON DELETE set null
);

CREATE INDEX "user_storage_limits_user_id_idx" ON "user_storage_limits" ("user_id");

-- Trigger to auto-update updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_storage_limits_updated_at
  BEFORE UPDATE ON user_storage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Implementation Sequence (Updated)

1. **Day 1:** Database schema with three-tier limits support (E05-T001)
2. **Day 2:** Storage abstraction and S3/MinIO backend (E05-T002, E05-T003)
3. **Day 3:** FileLimitsService with three-tier resolution (E05-T006 - Part 1)
4. **Day 4:** FileService with limit enforcement (E05-T006 - Part 2)
5. **Day 5:** Upload API with multipart handling (E05-T007)
6. **Day 6:** Admin routes for limit management (E05-T008 - Part 1)
7. **Day 7:** User-facing routes and avatar associations (E05-T008 - Part 2, E05-T009)
8. **Day 8-9:** Local storage and cloud storage implementations (E05-T004, E05-T005)
9. **Day 10-11:** Integration tests and cleanup jobs (E05-T010)
10. **Day 12-13:** Documentation and final testing

**Total:** 13-15 working days (2.5-3 weeks)

---

## Verification Checklist

Before marking Epic E05 as complete, verify:

- [ ] User can upload file within their limit (default, role, or override)
- [ ] User cannot upload file exceeding their effective max_file_size
- [ ] User cannot upload when storage quota exceeded
- [ ] System admin can set user-specific overrides via API
- [ ] Group admin can set role-based limits for their group
- [ ] User can view their effective limits via GET /users/me/limits
- [ ] Limit source is correctly reported (user_override, role_based, system_default)
- [ ] File download requires proper CASL permissions
- [ ] Soft-deleted files are excluded from quota calculations
- [ ] Background jobs clean up orphaned files after 30 days
- [ ] Multi-backend compatibility verified (S3, local)
- [ ] All tests pass with 80%+ coverage
- [ ] Documentation updated in ARCHITECTURE.md and CONVENTIONS.md
- [ ] Environment variables documented in .env.example

---

## Documentation Requirements

### ARCHITECTURE.md Updates

Add new section:

```markdown
## File Storage & Attachments

### Storage Backends

Raptscallions supports multiple storage backends via a pluggable interface:

- **S3-compatible** (default): AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2
- **Local filesystem**: For development and single-server deployments
- **Azure Blob Storage**: For Azure-native deployments
- **Google Cloud Storage**: For GCP deployments
- **Aliyun OSS**: For Alibaba Cloud deployments

### Three-Tier Limit System

Storage limits are enforced at three levels (in priority order):

1. **User-specific overrides**: Set by system admins for individual users
2. **Role-based group limits**: Set by group admins for teacher/student roles
3. **System defaults**: Fallback limits from environment configuration

Example hierarchy:
- System default: 10MB/file, 1GB total
- School sets teacher role: 50MB/file, 5GB total
- Admin gives specific user override: 100MB/file, 10GB total
- Result: User gets 100MB/file, 10GB total

### Quota Tracking

User storage quotas are tracked atomically using database transactions:
- Checked before upload (fail fast if quota exceeded)
- Incremented after successful upload
- Decremented after file deletion
- Reconciled weekly via background job
```

---

## Risk Assessment (Updated)

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Limit resolution complexity** | Medium | Clear precedence rules; comprehensive tests; admin UI shows effective limits |
| **Quota race conditions** | High | Database transactions with atomic increments; pessimistic locking if needed |
| **Admin override abuse** | Medium | Audit trail (set_by, reason columns); alerts for large overrides |
| **Role-based limits not applied** | Medium | Fallback to system defaults; reconciliation job to detect inconsistencies |

---

## Out of Scope (Confirmed)

1. Frontend UI for limit management (deferred to E06)
2. Bulk limit updates (future enhancement)
3. Temporary limit increases (e.g., "boost for 1 week") - future feature
4. Group-level quota pools (where teachers share a pool) - Phase 3
5. Automatic limit adjustments based on usage patterns - ML/future

---

## Critical Files for Implementation

1. **packages/db/src/schema/user-storage-limits.ts** - New schema for user overrides
2. **apps/api/src/services/file-limits.service.ts** - Three-tier limit resolution
3. **packages/db/src/migrations/0010_create_files_and_limits.sql** - Database migration
4. **apps/api/src/services/file.service.ts** - File upload with limit enforcement
5. **apps/api/src/routes/admin/limits.routes.ts** - Admin routes for limit management

---

**Status:** Ready for user approval and implementation.
