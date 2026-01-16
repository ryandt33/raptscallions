---
id: "E05"
title: "File Storage Infrastructure"
description: "Multi-backend file storage with S3/MinIO default, three-tier limits, quota tracking, and secure downloads"
status: "planned"
priority: 3
estimated_weeks: 2
depends_on_epics: ["E01", "E02"]
---

# Epic E05: File Storage Infrastructure

## Goals

Build a standalone, production-ready file storage system that can be used by any part of the application. This epic focuses purely on file infrastructure - uploading, downloading, storing, and managing files with proper limits and quotas. Entity associations (avatars, attachments) will be added in a later epic once core entities are defined.

The system provides:
- **Pluggable backends** - S3/MinIO default with local filesystem for development
- **Three-tier limits** - System defaults → role-based → user overrides
- **Quota tracking** - Per-user storage quotas with atomic updates
- **Secure access** - CASL permissions and signed URLs for direct downloads
- **Lifecycle management** - Soft deletes with background cleanup

## Success Criteria

- [ ] Files stored in pluggable backend (default: S3-compatible MinIO)
- [ ] Three-tier limit system: system defaults → group role limits → user overrides
- [ ] Per-file size limits enforced at upload time
- [ ] Per-user storage quotas tracked and enforced
- [ ] CASL permissions protect file access (owner, group admins, system admins)
- [ ] Signed URLs generated for secure downloads (avoid API proxy)
- [ ] Background jobs clean up soft-deleted files (30+ days old)
- [ ] Local filesystem backend available for development/testing
- [ ] MinIO service integrated into docker-compose for local S3 testing
- [ ] 80%+ test coverage for storage service and API routes

## Tasks

| ID        | Title                                              | Priority | Depends On                | Status |
| --------- | -------------------------------------------------- | -------- | ------------------------- | ------ |
| E05-T001  | Files and storage limits schemas                   | critical | -                         | ✅ done |
| E05-T002  | Storage backend abstraction and configuration      | critical | -                         | ✅ done (split) |
| E05-T002a | Storage backend interface and plugin registry      | critical | -                         | ✅ done |
| E05-T002b | Storage configuration system with validation       | critical | E05-T002a                 | ✅ done |
| E05-T003  | S3/MinIO storage implementation (PARENT - SPLIT)   | critical | E05-T002                  | split |
| E05-T003a | S3-compatible storage backend implementation       | critical | E05-T002a, E05-T002b      | todo |
| E05-T003b | MinIO Docker Compose integration                   | high     | -                         | todo |
| E05-T003c | S3 backend integration tests with MinIO            | high     | E05-T003a, E05-T003b      | todo |
| E05-T003d | Production S3 credentials and validation           | high     | E05-T003a, E05-T003c      | todo |
| E05-T004  | Local filesystem storage implementation            | high     | E05-T002a, E05-T002b      | todo |
| E05-T005  | File service with three-tier limits and quotas     | critical | E05-T001, E05-T003a       | todo |
| E05-T006  | File upload API routes                             | critical | E05-T005                  | todo |
| E05-T007  | File download and management API routes            | high     | E05-T005                  | todo |
| E05-T008  | Integration tests and cleanup jobs                 | high     | E05-T005, E05-T006        | todo |

## Out of Scope

- **Entity associations** - Avatars for users/groups/classes, assignment attachments (deferred to epic after E03)
- **Cloud storage implementations** - Azure, GCS, Aliyun (can be added incrementally later)
- Frontend file upload UI components
- Image processing (thumbnails, resizing, format conversion)
- Virus scanning integration
- CDN integration for file serving
- File versioning (multiple versions of same file)
- Bulk operations (batch upload, zip download)
- File preview in browser (PDF, images, videos)
- Group-level quota pools (shared storage limits)
- Public file sharing links with expiry

## Risks

| Risk                             | Impact | Mitigation                                             |
| -------------------------------- | ------ | ------------------------------------------------------ |
| Limit resolution complexity      | Medium | Clear precedence rules; comprehensive tests            |
| Quota race conditions            | High   | Database transactions with atomic updates              |
| S3 SDK compatibility issues      | Medium | Use official AWS SDK v3; test with MinIO              |
| Storage backend failures         | High   | Retry logic with exponential backoff; error handling   |
| Large file memory usage          | High   | Stream files directly to storage (avoid buffering)     |
| Admin override abuse             | Medium | Audit trail (set_by, reason); alerts for large changes |
| Orphaned files accumulating      | Medium | Daily cleanup job; weekly reconciliation               |
| MIME type validation bypass      | Low    | Validate both client and server; magic number check    |

## Notes

### Architecture Decisions

**Storage Backend Strategy:**
- Pluggable adapter pattern allows swapping backends without code changes
- S3-compatible default (MinIO for self-hosted, AWS/DigitalOcean/Backblaze for cloud)
- All backends implement common `IStorageBackend` interface
- Local filesystem backend for development and testing without cloud dependencies

**Three-Tier Limit System:**
```
System Defaults (env vars)
    ↓
Role-Based Limits (group settings JSONB)
    ↓
User-Specific Overrides (user_storage_limits table)
```

Priority: User override → Role limit → System default

**Limit Types:**
- `max_file_size_bytes`: Maximum size for individual file upload
- `storage_quota_bytes`: Total storage across all user's files

**Example Scenarios:**
1. **System defaults**: 10MB/file, 1GB total
2. **School overrides teacher role**: 50MB/file, 5GB total
3. **Admin gives user override**: 100MB/file, 10GB total
4. **Result**: User gets 100MB/file, 10GB total

**Quota Tracking:**
- Checked BEFORE upload (fail fast if exceeded)
- Updated AFTER successful upload (atomic transaction)
- Decremented when file soft-deleted
- Reconciled weekly via background job

**File Lifecycle:**
1. Upload → Active (status='active')
2. Soft Delete → status='soft_deleted', deleted_at set
3. Cleanup Job (30 days) → Hard delete from storage + database

**Signed URLs:**
- Generated for 15-minute expiration (configurable)
- Avoids proxying large files through Node.js API
- Permission check happens once at URL generation
- Works with all S3-compatible backends

**CASL Integration:**
- Every file operation checks permissions
- Permissions: owner (full access), group admin (manage group files), system admin (all files)
- Files track `uploaded_by` (user) and optionally `group_id` for permission scoping

**Decoupled Design:**
- Files table includes `purpose` field (e.g., 'general', 'avatar', 'attachment') for categorization
- No foreign keys to entities that don't exist yet (classes, assignments, tools)
- Entity associations will be added via migrations when E03 entities are defined
- This allows file infrastructure to be used immediately for any purpose

### Docker Compose Integration

MinIO service for development:
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports:
    - "9000:9000"  # API
    - "9001:9001"  # Console
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  volumes:
    - minio_data:/data
```

### Environment Variables

```bash
# Storage Configuration
STORAGE_BACKEND=s3  # 'local', 's3'

# System Default Limits
DEFAULT_MAX_FILE_SIZE_BYTES=10485760      # 10MB
DEFAULT_STORAGE_QUOTA_BYTES=1073741824    # 1GB

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=raptscallions-files
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true  # Required for MinIO

# Local Storage
LOCAL_STORAGE_PATH=./storage/uploads

# Signed URLs
SIGNED_URL_EXPIRES_SECONDS=900  # 15 minutes

# Cleanup Job
FILE_RETENTION_DAYS=30  # Days before soft-deleted files are permanently removed
```

### Database Schema Highlights

**files table:**
- storage_key, storage_backend (multi-backend support)
- purpose (varchar): categorizes file without FK dependencies
- uploaded_by (FK users), group_id (FK groups, optional)
- status ('active', 'soft_deleted')
- Indexes on uploaded_by, group_id, purpose, status

**user_storage_limits table:**
- max_file_size_bytes, storage_quota_bytes (user overrides)
- used_bytes (quota tracking)
- set_by, reason (audit trail)

**groups.settings JSONB:**
```json
{
  "storageLimits": {
    "teacher": {
      "maxFileSizeBytes": 52428800,
      "storageQuotaBytes": 5368709120
    },
    "student": {
      "maxFileSizeBytes": 10485760,
      "storageQuotaBytes": 1073741824
    }
  }
}
```

All entities follow existing Drizzle patterns: UUID PKs, timestamps, soft deletes, relations, proper indexes.
