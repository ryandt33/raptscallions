# E05-T003c Implementation Spec: S3 Backend Integration Tests with MinIO

## Summary

Create integration tests that verify the S3 storage backend works correctly with a real MinIO instance. Tests will run in a Docker Compose environment, covering the complete file lifecycle (upload, download, delete) and signed URL functionality.

## Selected Approach: Single-File Integration Test Suite with Docker-Aware Setup

### Rationale

This approach creates a single integration test file (`s3.backend.integration.test.ts`) that:

1. **Uses real MinIO via Docker Compose** - Tests run against the existing MinIO service from E05-T003b
2. **Follows existing patterns** - Similar structure to `packages/db/src/__tests__/integration/migration-workflow.test.ts`
3. **Environment-aware execution** - Skips gracefully when MinIO is unavailable (CI without Docker)
4. **Lifecycle hook cleanup** - Uses `afterEach`/`afterAll` for guaranteed cleanup even on test failure

### Alternatives Considered

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Testcontainers** | Automatic container management, isolated per test | Heavy dependency, slow startup, overkill for single MinIO | Rejected - existing Docker Compose is sufficient |
| **In-memory S3 mock** | Fast, no Docker needed | Not true integration test, misses real S3 API quirks | Rejected - defeats purpose of integration testing |
| **Separate test Docker Compose** | Complete isolation | Maintenance burden, duplicate configuration | Rejected - existing MinIO service is already configured |

## Implementation Details

### File Structure

```
packages/storage/src/__tests__/
├── s3.backend.test.ts                  # Existing unit tests (mocked)
├── integration/
│   └── s3.backend.integration.test.ts  # New integration tests (real MinIO)
└── helpers/
    └── minio-test-utils.ts             # Helper for connection/cleanup (optional)
```

### Test File Structure

```typescript
// packages/storage/src/__tests__/integration/s3.backend.integration.test.ts

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { S3StorageBackend, createS3Backend } from '../../backends/s3.backend.js';
import { FileNotFoundError, StorageError } from '../../errors.js';
import type { UploadParams } from '../../types.js';

// Test configuration - matches docker-compose.yml MinIO service
const MINIO_ENDPOINT = process.env.STORAGE_S3_ENDPOINT || 'http://localhost:9000';
const MINIO_BUCKET = process.env.STORAGE_S3_BUCKET || 'raptscallions-files';
const MINIO_ACCESS_KEY = process.env.STORAGE_S3_ACCESS_KEY_ID || 'minioadmin';
const MINIO_SECRET_KEY = process.env.STORAGE_S3_SECRET_ACCESS_KEY || 'minioadmin';

describe('S3StorageBackend Integration Tests', () => {
  let backend: S3StorageBackend;
  const testKeys: string[] = []; // Track keys for cleanup

  // Helper to generate unique test keys
  const createTestKey = (name: string) => {
    const key = `integration-test/${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`;
    testKeys.push(key);
    return key;
  };

  // Helper to check MinIO availability
  const isMinioAvailable = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${MINIO_ENDPOINT}/minio/health/live`);
      return response.ok;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    const available = await isMinioAvailable();
    if (!available) {
      console.warn('MinIO not available at', MINIO_ENDPOINT);
      console.warn('Start with: docker compose up minio minio-init');
    }
  });

  beforeEach(() => {
    // Create fresh backend for each test
    // Uses environment variables or defaults matching docker-compose
    backend = createTestBackend();
  });

  afterEach(async () => {
    // Clean up any test files created
    for (const key of testKeys) {
      try {
        await backend.delete(key);
      } catch {
        // Ignore cleanup errors
      }
    }
    testKeys.length = 0;
  });

  // ... test implementations below
});
```

### Core Test Scenarios

#### 1. Complete Lifecycle Test (AC2)

```typescript
describe('complete file lifecycle', () => {
  it('should upload, download, verify content, and delete file', async () => {
    // Skip if MinIO not available
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange
    const key = createTestKey('lifecycle-test.txt');
    const content = 'Hello, MinIO integration test!';
    const params: UploadParams = {
      key,
      body: Buffer.from(content),
      contentType: 'text/plain',
    };

    // Act - Upload
    const uploadResult = await backend.upload(params);
    expect(uploadResult.key).toBe(key);
    expect(uploadResult.etag).toBeDefined();

    // Act - Verify exists
    const existsAfterUpload = await backend.exists(key);
    expect(existsAfterUpload).toBe(true);

    // Act - Download
    const downloadStream = await backend.download(key);
    const downloadedContent = await streamToString(downloadStream);
    expect(downloadedContent).toBe(content);

    // Act - Delete
    await backend.delete(key);

    // Assert - No longer exists
    const existsAfterDelete = await backend.exists(key);
    expect(existsAfterDelete).toBe(false);
  });
});
```

#### 2. Signed URL Test (AC3)

```typescript
describe('signed URL functionality', () => {
  it('should generate URL that allows direct file access', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange - Upload file first
    const key = createTestKey('signed-url-test.txt');
    const content = 'Content for signed URL test';
    await backend.upload({
      key,
      body: Buffer.from(content),
      contentType: 'text/plain',
    });

    // Act - Get signed URL
    const { url, expiresAt } = await backend.getSignedUrl(key);

    // Assert - URL is valid and expiration is in future
    expect(url).toContain(key);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Act - Fetch content directly using signed URL
    const response = await fetch(url);
    const fetchedContent = await response.text();

    // Assert - Content matches
    expect(response.ok).toBe(true);
    expect(fetchedContent).toBe(content);
  });

  it('should generate PUT URL for direct upload', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange
    const key = createTestKey('signed-put-test.txt');
    const content = 'Uploaded via signed URL';

    // Act - Get signed PUT URL
    const { url } = await backend.getSignedUrl(key, {
      method: 'PUT',
      contentType: 'text/plain',
    });

    // Act - Upload directly via signed URL
    const putResponse = await fetch(url, {
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': 'text/plain' },
    });

    // Assert - Upload succeeded
    expect(putResponse.ok).toBe(true);

    // Assert - File exists and content matches
    const downloadStream = await backend.download(key);
    const downloadedContent = await streamToString(downloadStream);
    expect(downloadedContent).toBe(content);
  });
});
```

#### 3. Error Handling Test (AC4)

```typescript
describe('error handling', () => {
  it('should throw FileNotFoundError for non-existent object download', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange
    const nonExistentKey = 'integration-test/does-not-exist-12345.txt';

    // Act & Assert
    await expect(backend.download(nonExistentKey)).rejects.toThrow(FileNotFoundError);
  });

  it('should return false for exists check on non-existent object', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange
    const nonExistentKey = 'integration-test/does-not-exist-67890.txt';

    // Act
    const exists = await backend.exists(nonExistentKey);

    // Assert
    expect(exists).toBe(false);
  });

  it('should not throw when deleting non-existent object (idempotent)', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange
    const nonExistentKey = 'integration-test/never-existed.txt';

    // Act & Assert - Should not throw
    await expect(backend.delete(nonExistentKey)).resolves.toBeUndefined();
  });
});
```

#### 4. Storage Key Format Test (AC5)

```typescript
describe('storage key format', () => {
  it('should preserve path structure in keys', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange - Use hierarchical key like production would
    const key = createTestKey('org123/2024/01/document.pdf');
    const content = 'PDF content simulation';

    // Act
    const result = await backend.upload({
      key,
      body: Buffer.from(content),
      contentType: 'application/pdf',
    });

    // Assert - Key is preserved exactly
    expect(result.key).toBe(key);
    expect(result.key).toContain('org123');
    expect(result.key).toContain('2024/01');
    expect(result.key).toContain('document.pdf');
  });

  it('should handle special characters in keys', async () => {
    if (!await isMinioAvailable()) {
      console.warn('Skipping - MinIO not available');
      return;
    }

    // Arrange - Key with spaces and special chars
    const key = createTestKey('uploads/My Document (v2).pdf');
    const content = 'Special character test';

    // Act
    await backend.upload({
      key,
      body: Buffer.from(content),
      contentType: 'application/pdf',
    });

    // Assert - Can download with same key
    const stream = await backend.download(key);
    const downloaded = await streamToString(stream);
    expect(downloaded).toBe(content);
  });
});
```

### Helper Functions

```typescript
// Helper to convert Readable stream to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Helper to create backend with test configuration
function createTestBackend(): S3StorageBackend {
  const { S3Client } = await import('@aws-sdk/client-s3');

  const client = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: 'us-east-1',
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
  });

  return new S3StorageBackend(client, MINIO_BUCKET, {
    signedUrlExpiration: 900,
  });
}
```

### Package.json Script Addition

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --exclude='**/*.integration.test.ts'",
    "test:integration": "vitest run --include='**/*.integration.test.ts'",
    "test:watch": "vitest"
  }
}
```

### CI/CD Support (AC7)

For GitHub Actions, integration tests require MinIO to be running:

```yaml
# Example CI job snippet (informational - not creating this file)
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      minio:
        image: minio/minio
        ports:
          - 9000:9000
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        options: --health-cmd="curl -f http://localhost:9000/minio/health/live"
    steps:
      - uses: actions/checkout@v4
      - name: Create bucket
        run: |
          docker run --network host minio/mc \
            alias set myminio http://localhost:9000 minioadmin minioadmin && \
            mc mb --ignore-existing myminio/raptscallions-files
      - name: Run integration tests
        run: pnpm test:integration
        env:
          STORAGE_S3_ENDPOINT: http://localhost:9000
```

## Constraints

1. **MinIO Required** - Tests skip gracefully when MinIO is unavailable
2. **Unique Test Keys** - Each test uses timestamped unique keys to avoid conflicts
3. **Guaranteed Cleanup** - `afterEach` cleans up all test files even on failure
4. **Timeout** - Individual tests should complete in <30 seconds (set via Vitest config if needed)
5. **No Production Credentials** - Uses only local MinIO credentials from docker-compose

## Acceptance Criteria Mapping

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC1 | Tests run against real MinIO | Uses docker-compose MinIO on localhost:9000 |
| AC2 | Complete lifecycle test | `describe('complete file lifecycle')` covers upload→download→verify→delete |
| AC3 | Signed URL test | `describe('signed URL functionality')` with fetch verification |
| AC4 | Error handling test | `describe('error handling')` with FileNotFoundError assertions |
| AC5 | Storage key format verified | `describe('storage key format')` with hierarchical paths |
| AC6 | Tests clean up | `afterEach` cleanup with tracked `testKeys` array |
| AC7 | CI/CD compatible | Environment-aware with graceful skip pattern |
| AC8 | 80%+ coverage | Integration tests plus existing unit tests should exceed threshold |

## Out of Scope

- Performance/load testing
- Concurrent upload stress testing
- Testing with actual AWS S3 (uses MinIO only)
- CI workflow file creation (that's a separate infrastructure task)

## Dependencies

- **E05-T003a** - S3StorageBackend implementation (completed)
- **E05-T003b** - MinIO Docker Compose (completed)

## Test Commands

```bash
# Run all storage tests (unit + integration)
pnpm --filter @raptscallions/storage test

# Run only unit tests (fast, no Docker needed)
pnpm --filter @raptscallions/storage test:unit

# Run only integration tests (requires MinIO running)
docker compose up -d minio minio-init
pnpm --filter @raptscallions/storage test:integration
```
