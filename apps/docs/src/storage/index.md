---
title: Storage
description: File storage abstraction layer with pluggable backends
---

# Storage

The `@raptscallions/storage` package provides a pluggable file storage system that abstracts away backend-specific implementations. It supports local filesystem, S3-compatible services, Azure Blob, Google Cloud Storage, and Aliyun OSS out of the box, with extensibility for custom backends.

## Key Features

- **Backend Abstraction** — Single interface (`IStorageBackend`) for all storage operations
- **Plugin Registry** — Register backends by string identifier at runtime
- **Configuration Validation** — Zod-based validation with lazy loading for backend-specific settings
- **Lazy Instantiation** — Backends created on-demand with singleton caching
- **Typed Errors** — Domain-specific errors with HTTP status codes

## Local Development

The Docker Compose development environment includes MinIO, an S3-compatible object storage service. This enables realistic S3 storage testing without cloud credentials:

```bash
# Start all services including MinIO
docker compose up -d

# Access MinIO console at http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

See [S3-Compatible Backend](/storage/patterns/s3-backend#local-development-with-minio) for configuration details.

## Quick Start

```typescript
import { registerBackend, getBackend } from "@raptscallions/storage";
import { LocalStorageBackend } from "./backends/local.js";

// Register backend at startup
registerBackend("local", () => new LocalStorageBackend("/uploads"));

// Use backend anywhere in your app
const storage = getBackend("local");
await storage.upload({
  key: "documents/report.pdf",
  body: fileBuffer,
  contentType: "application/pdf",
});
```

## Documentation

### Concepts

Core ideas and mental models for the storage system:

- [Backend Interface](/storage/concepts/backend-interface) — The `IStorageBackend` contract and supporting types
- [Configuration](/storage/concepts/configuration) — Environment variables and backend-specific settings

### Patterns

Reusable implementation patterns:

- [S3-Compatible Backend](/storage/patterns/s3-backend) — Using the S3StorageBackend for AWS S3, MinIO, and other S3-compatible services
- [Production S3 Setup](/storage/patterns/production-s3-setup) — Complete guide to configuring S3 storage for production deployment
- [Custom Backends](/storage/patterns/custom-backends) — How to implement your own storage backend

### Troubleshooting

- Coming soon

## Related Pages

**Related Documentation:**
- [File Storage Schema](/database/concepts/file-storage-schema) — Database schema for file metadata and quotas

**Implementation:**
- [E05-T003d: Production S3 credentials and validation](/backlog/completed/E05/E05-T003d.md) ([spec](/backlog/docs/specs/E05/E05-T003d-spec.md))
- [E05-T003c: MinIO integration tests](/backlog/completed/E05/E05-T003c.md) ([spec](/backlog/docs/specs/E05/E05-T003c-spec.md))
- [E05-T003a: S3-compatible storage backend implementation](/backlog/completed/E05/E05-T003a.md) ([spec](/backlog/docs/specs/E05/E05-T003a-spec.md))
- [E05-T003b: MinIO Docker Compose integration](/backlog/completed/E05/E05-T003b.md) ([spec](/backlog/docs/specs/E05/E05-T003b-spec.md))
- [E05-T002a: Storage backend interface and plugin system](/backlog/completed/E05/E05-T002a.md) ([spec](/backlog/docs/specs/E05/E05-T002a-spec.md))
- [E05-T002b: Storage configuration system](/backlog/tasks/E05/E05-T002b.md) ([spec](/backlog/docs/specs/E05/E05-T002b-spec.md))
- [E05-T001: Files and storage limits schema](/backlog/completed/E05/E05-T001.md) ([spec](/backlog/docs/specs/E05/E05-T001-spec.md))
