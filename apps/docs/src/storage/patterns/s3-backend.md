---
title: S3-Compatible Backend
description: Using the S3StorageBackend for AWS S3, MinIO, and other S3-compatible services
related_code:
  - packages/storage/src/backends/s3.backend.ts
  - packages/storage/src/backends/index.ts
implements_task: E05-T003a
last_verified: 2026-01-16
---

# S3-Compatible Backend

The `S3StorageBackend` provides storage support for AWS S3 and S3-compatible services like MinIO, DigitalOcean Spaces, and Backblaze B2. It implements the `IStorageBackend` interface using AWS SDK v3.

## Quick Start

```typescript
import { registerBackend, getBackend } from "@raptscallions/storage";
import { createS3Backend } from "@raptscallions/storage";

// Register the S3 backend factory at application startup
registerBackend("s3", createS3Backend);

// Use the backend anywhere in your application
const storage = getBackend("s3");

await storage.upload({
  key: "documents/report.pdf",
  body: fileBuffer,
  contentType: "application/pdf",
});
```

## Configuration

The S3 backend reads configuration from environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_BACKEND` | Yes | Set to `"s3"` to use S3 storage |
| `STORAGE_S3_BUCKET` | Yes | S3 bucket name |
| `STORAGE_S3_REGION` | Yes | AWS region (e.g., `us-east-1`) |
| `STORAGE_S3_ACCESS_KEY_ID` | Yes | AWS access key ID |
| `STORAGE_S3_SECRET_ACCESS_KEY` | Yes | AWS secret access key |
| `STORAGE_S3_ENDPOINT` | No | Custom endpoint for MinIO/other S3-compatible services |
| `STORAGE_SIGNED_URL_EXPIRATION_SECONDS` | No | Default signed URL expiration (default: 900) |

### AWS S3 Configuration

```bash
# .env for AWS S3
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### MinIO Configuration

For MinIO and other S3-compatible services, provide a custom endpoint:

```bash
# .env for MinIO
STORAGE_BACKEND=s3
STORAGE_S3_BUCKET=my-bucket
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=minioadmin
STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
STORAGE_S3_ENDPOINT=http://localhost:9000
```

::: tip Path-Style URLs
When `STORAGE_S3_ENDPOINT` is set, `forcePathStyle` is automatically enabled. This is required for MinIO and most S3-compatible services that don't support virtual-hosted style URLs.
:::

## Local Development with MinIO

The Docker Compose development environment includes MinIO pre-configured for local S3-compatible storage testing. No cloud credentials are required.

### Starting MinIO

```bash
# Start all services including MinIO
docker compose up -d

# Or start just MinIO for storage testing
docker compose up -d minio minio-init
```

The `minio-init` container automatically creates the `raptscallions-files` bucket on first startup.

### MinIO Console

Access the MinIO web console to browse files, manage buckets, and debug storage issues:

- **URL**: http://localhost:9001
- **Username**: minioadmin (or `MINIO_ROOT_USER` if set)
- **Password**: minioadmin (or `MINIO_ROOT_PASSWORD` if set)

### Configuration

When running the app outside Docker (`pnpm dev`), MinIO is accessed via localhost:

```bash
# .env for local development with MinIO
STORAGE_BACKEND=s3
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_BUCKET=raptscallions-files
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY_ID=minioadmin
STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
```

When running inside Docker Compose, the API container uses the internal Docker network:

```bash
# docker-compose.yml passes these automatically
STORAGE_S3_ENDPOINT=http://minio:9000
```

::: info Port Conflicts
If ports 9000 or 9001 are in use, override them in your `.env`:
```bash
MINIO_API_PORT=9002
MINIO_CONSOLE_PORT=9003
```
Then access MinIO at `http://localhost:9002` and the console at `http://localhost:9003`.
:::

### Related Implementation

- [E05-T003b: MinIO Docker Compose integration](/backlog/completed/E05/E05-T003b.md) ([spec](/backlog/docs/specs/E05/E05-T003b-spec.md))

## Operations

### Upload Files

```typescript
import { getBackend } from "@raptscallions/storage";

const storage = getBackend("s3");

// Upload a buffer
const result = await storage.upload({
  key: "uploads/document.pdf",
  body: Buffer.from(fileContent),
  contentType: "application/pdf",
});
console.log(result.key);  // "uploads/document.pdf"
console.log(result.etag); // '"abc123..."' (from S3)

// Upload with metadata
await storage.upload({
  key: "uploads/image.png",
  body: imageBuffer,
  contentType: "image/png",
  metadata: {
    "uploaded-by": "user-123",
    "original-name": "profile.png",
  },
});

// Upload a stream (provide contentLength for optimal performance)
import { createReadStream } from "fs";

await storage.upload({
  key: "uploads/large-file.zip",
  body: createReadStream("/path/to/file.zip"),
  contentType: "application/zip",
  contentLength: fileSizeInBytes,
});
```

### Download Files

```typescript
import { getBackend, FileNotFoundError } from "@raptscallions/storage";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

const storage = getBackend("s3");

try {
  // Get a readable stream
  const stream = await storage.download("uploads/document.pdf");

  // Pipe to file
  await pipeline(stream, createWriteStream("/tmp/document.pdf"));

  // Or pipe to HTTP response
  stream.pipe(response);
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log("File not found:", error.message);
  }
  throw error;
}
```

### Delete Files

```typescript
const storage = getBackend("s3");

// Delete is idempotent - no error for missing files
await storage.delete("uploads/old-file.pdf");
```

::: info Idempotent Delete
The `delete` operation is idempotent. Deleting a non-existent file succeeds silently without throwing an error. This matches S3's native behavior and simplifies cleanup operations.
:::

### Check File Existence

```typescript
const storage = getBackend("s3");

const exists = await storage.exists("uploads/document.pdf");
if (exists) {
  // File exists, proceed with download
}
```

### Generate Signed URLs

```typescript
const storage = getBackend("s3");

// GET URL for downloads (default)
const downloadUrl = await storage.getSignedUrl("uploads/document.pdf");
console.log(downloadUrl.url);       // "https://bucket.s3.region.amazonaws.com/..."
console.log(downloadUrl.expiresAt); // "2026-01-16T15:30:00.000Z"

// PUT URL for direct uploads
const uploadUrl = await storage.getSignedUrl("uploads/new-file.pdf", {
  method: "PUT",
  contentType: "application/pdf",
  expiresIn: 3600, // 1 hour
});

// Client can upload directly to S3 using the signed URL
```

::: warning No Existence Check
Signed URL generation does NOT verify that the object exists. This is standard S3 behavior. Errors occur when the URL is used, not when it's generated. This enables pre-signing URLs for files that will be uploaded.
:::

## Error Handling

The S3 backend converts AWS SDK errors to storage-specific errors:

| S3 Error | Storage Error | When |
|----------|---------------|------|
| `NoSuchKey`, `NotFound` | `FileNotFoundError` | Download or exists check for missing file |
| `ECONNREFUSED`, `ENOTFOUND` | `StorageError` (unavailable) | Network connectivity issues |
| `InvalidAccessKeyId`, `SignatureDoesNotMatch` | `StorageError` (authentication) | Invalid credentials |
| Other errors | `StorageError` (generic) | Any other S3 failures |

```typescript
import { getBackend, FileNotFoundError, StorageError } from "@raptscallions/storage";

const storage = getBackend("s3");

try {
  await storage.download("missing-file.pdf");
} catch (error) {
  if (error instanceof FileNotFoundError) {
    // File doesn't exist
    console.log("Not found:", error.key);
  } else if (error instanceof StorageError) {
    if (error.message.includes("unavailable")) {
      // Network/connectivity issue
      console.log("S3 is unreachable");
    } else if (error.message.includes("authentication")) {
      // Credential issue (credentials not exposed in error)
      console.log("Invalid S3 credentials");
    }
  }
}
```

::: tip Credential Security
Authentication errors are sanitized to prevent credential exposure in logs. The original AWS error message (which may contain key IDs) is replaced with a generic "Storage authentication failed" message.
:::

## Testing

The `S3StorageBackend` uses dependency injection for testability. Inject a mock S3Client directly without module mocking:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { S3StorageBackend } from "@raptscallions/storage";
import type { IStorageBackend } from "@raptscallions/storage";

describe("S3StorageBackend", () => {
  let backend: IStorageBackend;
  let mockS3Client: { send: ReturnType<typeof vi.fn> };
  let mockPresigner: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockS3Client = { send: vi.fn() };
    mockPresigner = vi.fn().mockResolvedValue("https://signed-url.example.com");

    backend = new S3StorageBackend(
      mockS3Client as any,
      "test-bucket",
      { signedUrlExpiration: 900, presigner: mockPresigner }
    );
  });

  it("should upload files", async () => {
    mockS3Client.send.mockResolvedValue({ ETag: '"abc123"' });

    const result = await backend.upload({
      key: "test/file.txt",
      body: Buffer.from("hello"),
      contentType: "text/plain",
    });

    expect(result.key).toBe("test/file.txt");
    expect(result.etag).toBe('"abc123"');
    expect(mockS3Client.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "test-bucket",
          Key: "test/file.txt",
        }),
      })
    );
  });

  it("should handle FileNotFoundError", async () => {
    const notFoundError = new Error("Not found");
    notFoundError.name = "NoSuchKey";
    mockS3Client.send.mockRejectedValue(notFoundError);

    await expect(backend.download("missing.txt"))
      .rejects.toThrow(FileNotFoundError);
  });
});
```

::: info DI Pattern
The `S3StorageBackend` constructor accepts an `S3Client` instance, enabling pure dependency injection testing. This follows the project convention of avoiding `vi.mock()` for better test reliability with Fastify.
:::

## Architecture

### Class Structure

```
S3StorageBackend
├── constructor(client, bucket, options?)
├── upload(params) → Promise<UploadResult>
├── download(key) → Promise<Readable>
├── delete(key) → Promise<void>
├── exists(key) → Promise<boolean>
├── getSignedUrl(key, options?) → Promise<SignedUrl>
├── [private] handleError(error, key) → never
└── [private] isNotFoundError(error) → boolean
```

### Factory Pattern

The `createS3Backend` factory reads environment configuration and creates a configured backend:

```typescript
// Factory handles all configuration
export function createS3Backend(): S3StorageBackend {
  const s3Config = getBackendConfig<S3Config>();

  const client = new S3Client({
    region: s3Config.STORAGE_S3_REGION,
    credentials: {
      accessKeyId: s3Config.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: s3Config.STORAGE_S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!s3Config.STORAGE_S3_ENDPOINT,
    endpoint: s3Config.STORAGE_S3_ENDPOINT || undefined,
  });

  return new S3StorageBackend(client, s3Config.STORAGE_S3_BUCKET, {
    signedUrlExpiration: storageConfig.STORAGE_SIGNED_URL_EXPIRATION_SECONDS,
  });
}
```

## Related Pages

**Related Documentation:**
- [Backend Interface](/storage/concepts/backend-interface) — The `IStorageBackend` contract
- [Configuration](/storage/concepts/configuration) — Storage environment variables
- [Custom Backends](/storage/patterns/custom-backends) — How to implement your own backend

**Implementation:**
- [E05-T003a: S3-compatible storage backend implementation](/backlog/tasks/E05/E05-T003a.md) ([spec](/backlog/docs/specs/E05/E05-T003a-spec.md), [code review](/backlog/docs/reviews/E05/E05-T003a-code-review.md), [QA report](/backlog/docs/reviews/E05/E05-T003a-qa-report.md))
- [E05-T003b: MinIO Docker Compose integration](/backlog/completed/E05/E05-T003b.md) ([spec](/backlog/docs/specs/E05/E05-T003b-spec.md))

**Source Files:**
- [s3.backend.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/backends/s3.backend.ts) — S3StorageBackend class and createS3Backend factory
- [backends/index.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/backends/index.ts) — Backend re-exports
