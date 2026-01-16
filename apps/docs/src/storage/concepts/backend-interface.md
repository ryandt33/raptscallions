---
title: Backend Interface
description: The IStorageBackend contract, plugin registry, factory pattern, and error handling
related_code:
  - packages/storage/src/types.ts
  - packages/storage/src/registry.ts
  - packages/storage/src/factory.ts
  - packages/storage/src/errors.ts
  - packages/storage/src/index.ts
  - packages/storage/src/backends/s3.backend.ts
  - packages/storage/src/backends/index.ts
implements_task: E05-T002a
last_verified: 2026-01-16
---

# Backend Interface

All storage backends implement the `IStorageBackend` interface, which defines a consistent contract for file operations. The plugin registry enables runtime extensibility, while the factory provides lazy instantiation with singleton caching.

## IStorageBackend Interface

```typescript
// packages/storage/src/types.ts
interface IStorageBackend {
  upload(params: UploadParams): Promise<UploadResult>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl>;
}
```

### Supporting Types

```typescript
interface UploadParams {
  key: string;              // Unique storage key for the file
  body: Buffer | Readable;  // File content
  contentType: string;      // MIME type
  contentLength?: number;   // Required for stream uploads
  metadata?: Record<string, string>;  // Optional metadata
}

interface UploadResult {
  key: string;     // Storage key where file was stored
  etag?: string;   // Version identifier from backend
  url?: string;    // Public URL if applicable
}

interface SignedUrlOptions {
  expiresIn?: number;     // Seconds until expiration
  method?: "GET" | "PUT"; // HTTP method the URL is valid for
  contentType?: string;   // Content type for PUT URLs
}

interface SignedUrl {
  url: string;       // The signed URL
  expiresAt: string; // ISO 8601 expiration timestamp
}
```

## Plugin Registry

Backends register themselves with string identifiers, enabling runtime extensibility:

```typescript
import { registerBackend, getBackend } from "@raptscallions/storage";

// Register a local filesystem backend
registerBackend("local", () => new LocalStorageBackend("/uploads"));

// Register an S3-compatible backend
registerBackend("s3", () => new S3StorageBackend({
  bucket: "my-bucket",
  region: "us-east-1",
}));

// Register a custom backend
registerBackend("azure", () => new AzureBlobBackend({
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
}));
```

### Registry API

```typescript
// Register a backend factory
registerBackend<T extends IStorageBackend>(
  identifier: string,
  factory: BackendFactory<T>
): void

// Get registered factory (throws if not found)
getBackendFactory(identifier: string): BackendFactory

// Check if backend is registered
isBackendRegistered(identifier: string): boolean

// List all registered identifiers
getRegisteredBackends(): string[]

// Clear registry (for testing)
resetRegistry(): void
```

### Type-Safe Registration

TypeScript generics enforce that only valid `IStorageBackend` implementations can be registered:

```typescript
// This compiles - LocalStorageBackend implements IStorageBackend
registerBackend("local", () => new LocalStorageBackend("/uploads"));

// This fails at compile time - InvalidBackend doesn't implement interface
registerBackend("invalid", () => new InvalidBackend()); // TS error
```

### Idempotent Registration

Re-registering the same identifier overwrites the previous factory:

```typescript
registerBackend("s3", () => new S3StorageBackend({ bucket: "old-bucket" }));
registerBackend("s3", () => new S3StorageBackend({ bucket: "new-bucket" }));
// "s3" now uses new-bucket
```

This enables configuration changes without restart.

## Factory Pattern

The factory provides lazy instantiation with singleton caching:

```typescript
import { getBackend } from "@raptscallions/storage";

// First call: creates instance via registered factory
const storage = getBackend("s3");

// Subsequent calls: returns cached instance
const sameStorage = getBackend("s3");
console.log(storage === sameStorage); // true
```

### Factory API

```typescript
// Get or create backend instance (lazy, cached)
getBackend(identifier: string): IStorageBackend

// Check if instance is already cached
isBackendCached(identifier: string): boolean

// Clear instance cache (for testing)
resetFactory(): void

// Clear both registry and cache (convenience for tests)
resetAll(): void
```

### Benefits of Lazy Instantiation

1. **Startup performance** — Backends not created until first use
2. **Resource efficiency** — Only used backends are instantiated
3. **Configuration flexibility** — Register backends before or after first use
4. **Memory management** — Singleton pattern prevents duplicate instances

## Error Handling

The storage package provides domain-specific error classes:

| Error Class | HTTP Status | Use Case |
|-------------|-------------|----------|
| `StorageError` | 500 | Generic backend failures (network, permissions, service down) |
| `QuotaExceededError` | 403 | Storage quota would be exceeded |
| `FileNotFoundError` | 404 | File lookup fails (download, delete, exists) |
| `InvalidFileTypeError` | 400 | MIME type not in allowed list |
| `BackendNotRegisteredError` | 500 | Unknown backend identifier |
| `ConfigurationError` | 500 | Invalid or missing configuration |

### Error Examples

```typescript
import {
  StorageError,
  FileNotFoundError,
  QuotaExceededError,
  BackendNotRegisteredError,
} from "@raptscallions/storage";

// FileNotFoundError includes the storage key
throw new FileNotFoundError("uploads/missing.pdf");
// "File not found in storage: uploads/missing.pdf"

// QuotaExceededError includes usage details
throw new QuotaExceededError("Storage quota exceeded", {
  currentUsage: 1073741824,
  quotaLimit: 1073741824,
  requestedSize: 10485760,
});

// BackendNotRegisteredError lists available backends
throw new BackendNotRegisteredError("minio", ["local", "s3"]);
// "Storage backend not registered: "minio". Available backends: local, s3"
```

### Error Inheritance

All storage errors extend `AppError` from `@raptscallions/core`:

```typescript
import { AppError } from "@raptscallions/core";
import { FileNotFoundError } from "@raptscallions/storage";

const error = new FileNotFoundError("key");

error instanceof FileNotFoundError; // true
error instanceof AppError;          // true
error.statusCode;                   // 404
error.code;                         // "FILE_NOT_FOUND"
```

This ensures consistent error handling across the application.

## Usage Example

Complete example of registering and using a storage backend:

```typescript
import {
  registerBackend,
  getBackend,
  type IStorageBackend,
  type UploadParams,
  FileNotFoundError,
} from "@raptscallions/storage";
import { LocalStorageBackend } from "./backends/local.js";

// 1. Register backend at application startup
registerBackend("local", () => new LocalStorageBackend("/var/uploads"));

// 2. Use backend in service layer
async function uploadFile(params: UploadParams): Promise<string> {
  const storage = getBackend("local");
  const result = await storage.upload(params);
  return result.key;
}

async function downloadFile(key: string): Promise<Readable> {
  const storage = getBackend("local");

  if (!(await storage.exists(key))) {
    throw new FileNotFoundError(key);
  }

  return storage.download(key);
}

async function getPresignedUrl(key: string): Promise<string> {
  const storage = getBackend("local");
  const signed = await storage.getSignedUrl(key, {
    expiresIn: 3600, // 1 hour
    method: "GET",
  });
  return signed.url;
}
```

## Testing

Reset registry and cache between tests to ensure isolation:

```typescript
import {
  registerBackend,
  getBackend,
  resetAll,
} from "@raptscallions/storage";

describe("FileService", () => {
  beforeEach(() => {
    resetAll(); // Clear both registry and cache
    registerBackend("test", () => createMockBackend());
  });

  afterEach(() => {
    resetAll(); // Clean up after tests
  });

  it("should upload file", async () => {
    const storage = getBackend("test");
    // ... test implementation
  });
});
```

### Factory State Helpers

```typescript
import { isBackendRegistered, isBackendCached } from "@raptscallions/storage";

// Verify registration
expect(isBackendRegistered("local")).toBe(true);

// Verify lazy instantiation
expect(isBackendCached("local")).toBe(false);
const storage = getBackend("local");
expect(isBackendCached("local")).toBe(true);
```

## Related Pages

**Related Documentation:**
- [Configuration](/storage/concepts/configuration) — Environment variables and backend-specific settings
- [S3-Compatible Backend](/storage/patterns/s3-backend) — Using the S3StorageBackend for AWS S3, MinIO, and other S3-compatible services
- [Custom Backends](/storage/patterns/custom-backends) — How to implement your own storage backend
- [Error Handling](/api/patterns/error-handling) — Error handling patterns for API routes

**Implementation:**
- [E05-T003a: S3-compatible storage backend implementation](/backlog/tasks/E05/E05-T003a.md) ([spec](/backlog/docs/specs/E05/E05-T003a-spec.md), [code review](/backlog/docs/reviews/E05/E05-T003a-code-review.md), [QA report](/backlog/docs/reviews/E05/E05-T003a-qa-report.md))
- [E05-T002a: Storage backend interface and plugin system](/backlog/completed/E05/E05-T002a.md) ([spec](/backlog/docs/specs/E05/E05-T002a-spec.md), [code review](/backlog/docs/reviews/E05/E05-T002a-code-review.md), [QA report](/backlog/docs/reviews/E05/E05-T002a-qa-report.md))

**Source Files:**
- [types.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/types.ts) — Interface and type definitions
- [registry.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/registry.ts) — Plugin registration system
- [factory.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/factory.ts) — Lazy instantiation with caching
- [errors.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/errors.ts) — Domain-specific error classes
