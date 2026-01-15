---
id: "E05"
title: "File Storage & Attachment Management"
description: "Multi-backend file storage with S3/MinIO default, three-tier limits (default/role/user), CASL permissions, and quota tracking"
status: "planned"
priority: 4
estimated_weeks: 3
depends_on_epics: ["E01", "E02", "E03"]
---

# Epic E05: File Storage & Attachment Management

## Goals

Implement a flexible, production-ready file storage system that supports multiple cloud backends (S3, Azure, GCS, Aliyun) with MinIO as the self-hosted default, enforces three-tier storage limits (system defaults → role-based → user-specific overrides), integrates CASL permissions for file access control, tracks per-user storage quotas, and provides secure signed URLs for direct downloads.

## Success Criteria

- [ ] Files stored in pluggable backend (default: S3-compatible MinIO)
- [ ] Three-tier limit system: system defaults → group role limits → user overrides
- [ ] Per-file size limits enforced by default, role, and user level
- [ ] Per-user storage quotas tracked and enforced
- [ ] CASL permissions protect file access (owner, group admins, system admins)
- [ ] Signed URLs generated for secure downloads (avoid API proxy)
- [ ] Avatar support for users, groups, and classes
- [ ] Attachment support for assignments and submissions
- [ ] Background jobs clean up soft-deleted files (30+ days old)
- [ ] Multi-backend compatibility verified (S3, local, cloud providers)
- [ ] 80%+ test coverage for storage service and API routes

## Tasks

| ID       | Title                                              | Priority | Depends On |
| -------- | -------------------------------------------------- | -------- | ---------- |
| E05-T001 | Files and storage limits schemas                   | critical | -          |
| E05-T002 | Storage backend abstraction and configuration      | critical | -          |
| E05-T003 | S3/MinIO storage implementation                    | critical | E05-T002   |
| E05-T004 | Local filesystem storage implementation            | high     | E05-T002   |
| E05-T005 | Cloud storage implementations (Azure, GCS, Aliyun) | medium   | E05-T002   |
| E05-T006 | File service with three-tier limits and quotas     | critical | E05-T001, E05-T003 |
| E05-T007 | File upload API routes                             | critical | E05-T006   |
| E05-T008 | File download and limit management API routes      | high     | E05-T006   |
| E05-T009 | Avatar and attachment associations                 | high     | E05-T001, E05-T007 |
| E05-T010 | Integration tests and cleanup jobs                 | high     | E05-T006, E05-T007 |

## Out of Scope

- Frontend file upload UI components (covered in E06: Frontend Foundation)
- Image processing (thumbnails, resizing, format conversion)
- Virus scanning integration
- CDN integration for file serving
- File versioning (multiple versions of same file)
- Bulk operations (batch upload, zip download)
- File preview in browser (PDF, images, videos)
- Group-level quota pools (shared storage limits)
- OneRoster file sync
- Public file sharing links with expiry
- At-rest encryption beyond storage backend defaults
- Collaborative document editing

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
1. **System defaults**: 10MB/file, 1GB total (teacher role)
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
- File inherits permissions from parent entity (assignment, class, group)

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
STORAGE_BACKEND=s3  # 'local', 's3', 'azure', 'gcs', 'aliyun'

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
```

### Database Schema Highlights

**files table:**
- storage_key, storage_backend (multi-backend support)
- entity_type, entity_id (polymorphic associations)
- status ('active', 'soft_deleted')
- Indexes on uploaded_by, group_id, entity

**user_storage_limits table:**
- max_file_size_bytes, storage_quota_bytes (user overrides)
- used_bytes (quota tracking)
- set_by, reason (audit trail)

**groups.settings JSONB:**
```json
{
  "limits": {
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
