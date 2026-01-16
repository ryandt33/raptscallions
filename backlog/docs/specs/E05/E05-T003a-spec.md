# Implementation Spec: E05-T003a

## Selected Approach

**Approach C: Hybrid - Class Backend with Injected S3Client**

This approach creates an `S3StorageBackend` class that implements `IStorageBackend` but receives the AWS SDK `S3Client` as a constructor dependency rather than creating it internally. A separate factory function handles client creation and configuration.

## Rationale

1. **Best testability**: Unit tests can inject a mock `S3Client` directly without module mocking (`vi.mock` is unreliable with Fastify per CONVENTIONS.md)

2. **Clear separation of concerns**: Factory handles config/client creation, class handles S3 operations. Each can be tested independently.

3. **Follows established patterns**: Uses class structure like `OpenRouterClient` in `packages/ai/src/client.ts` but adds dependency injection for improved testability.

4. **Explicit dependencies**: The class constructor documents exactly what it needs (`S3Client`, bucket name, config options), making the code self-documenting.

5. **Flexible factory**: The factory can be registered with `registerBackend` and handles all initialization, while the class remains focused on operations.

## File Structure

```
packages/storage/src/
├── backends/
│   ├── s3.backend.ts       # S3StorageBackend class
│   └── index.ts            # Re-export and registration
└── __tests__/
    └── s3.backend.test.ts  # Unit tests with mocked S3Client
```

## Interface Contracts

### S3StorageBackend Class

```typescript
interface S3StorageBackendOptions {
  /** Default signed URL expiration in seconds (from config) */
  signedUrlExpiration?: number;
}

class S3StorageBackend implements IStorageBackend {
  constructor(
    client: S3Client,
    bucket: string,
    options?: S3StorageBackendOptions
  );

  upload(params: UploadParams): Promise<UploadResult>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl>;
}
```

### Factory Function

```typescript
/**
 * Create an S3StorageBackend instance using configuration from environment.
 * This is what gets registered with registerBackend("s3", createS3Backend).
 */
function createS3Backend(): S3StorageBackend;
```

## Implementation Details

### S3Client Configuration

The factory creates the `S3Client` with these options:

```typescript
const client = new S3Client({
  endpoint: config.STORAGE_S3_ENDPOINT,      // Optional for MinIO
  region: config.STORAGE_S3_REGION,          // Required
  credentials: {
    accessKeyId: config.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: config.STORAGE_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: !!config.STORAGE_S3_ENDPOINT, // Enable for MinIO/custom endpoints
});
```

### Method Implementations

| Method | AWS SDK Command | Error Handling |
|--------|-----------------|----------------|
| `upload` | `PutObjectCommand` | Wrap errors in `StorageError` |
| `download` | `GetObjectCommand` | `NoSuchKey` → `FileNotFoundError`, others → `StorageError` |
| `delete` | `DeleteObjectCommand` | Silently succeed on `NoSuchKey` (idempotent), others → `StorageError` |
| `exists` | `HeadObjectCommand` | Return `false` on `NotFound`, others → `StorageError` |
| `getSignedUrl` | `getSignedUrl` from `@aws-sdk/s3-request-presigner` | Wrap errors in `StorageError` |

### Error Handling

Convert AWS SDK errors to storage errors:

```typescript
private handleError(error: unknown, key: string): never {
  if (error instanceof Error) {
    // Check for "NoSuchKey" error code
    if ('name' in error && error.name === 'NoSuchKey') {
      throw new FileNotFoundError(key);
    }

    // Check for "NotFound" (HeadObject uses this)
    if ('name' in error && error.name === 'NotFound') {
      throw new FileNotFoundError(key);
    }

    // Network/connection errors
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')) {
      throw new StorageError(
        `Storage service unavailable: ${error.message}`,
        { key, originalError: error.message }
      );
    }

    // Credential errors (don't expose keys)
    if (error.name === 'CredentialsProviderError' ||
        error.name === 'InvalidAccessKeyId' ||
        error.name === 'SignatureDoesNotMatch') {
      throw new StorageError(
        'Storage authentication failed',
        { key }
      );
    }

    // Generic S3 error
    throw new StorageError(
      `Storage operation failed: ${error.message}`,
      { key, originalError: error.message }
    );
  }

  throw new StorageError('Unknown storage error', { key });
}
```

### Streaming Support

For `upload`:
- Accept `Buffer | Readable` body
- Pass directly to `PutObjectCommand` (AWS SDK handles both)
- Require `contentLength` when body is a stream

For `download`:
- Return `response.Body` as `Readable` (it's already a stream)
- Throw `FileNotFoundError` if body is undefined

### Signed URL Generation

```typescript
async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl> {
  const expiresIn = options?.expiresIn ?? this.defaultExpiration;

  const command = options?.method === 'PUT'
    ? new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options?.contentType,
      })
    : new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

  const url = await getSignedUrl(this.client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return { url, expiresAt };
}
```

**Note**: Signed URL generation does NOT check if the object exists. This is standard S3 behavior - the signed URL is valid regardless of whether the object exists. Errors occur when the URL is used, not when it's generated.

## Constraints & Boundaries

### Must Do

- Implement all 5 `IStorageBackend` methods
- Use `@aws-sdk/client-s3` for S3 operations
- Use `@aws-sdk/s3-request-presigner` for signed URLs
- Support both `Buffer` and `Readable` stream uploads
- Convert S3 errors to typed storage errors
- Enable `forcePathStyle` when custom endpoint is provided (MinIO compatibility)
- Default signed URL expiration to config value (`STORAGE_SIGNED_URL_EXPIRATION_SECONDS`)

### Must Not Do

- Create integration tests (deferred to E05-T003c)
- Implement multipart uploads (future enhancement)
- Implement server-side encryption configuration (future enhancement)
- Handle other cloud providers (Azure, GCS - future epic)
- Modify the existing storage package exports (registration is external concern)

### Performance Requirements

- Upload/download should add minimal overhead (<5% of transfer time)
- Use streaming throughout - never buffer entire files in memory
- Single S3Client instance reused for all operations

## Dependencies

### New Dependencies to Add

```json
{
  "@aws-sdk/client-s3": "^3.700.0",
  "@aws-sdk/s3-request-presigner": "^3.700.0"
}
```

### Internal Dependencies

- `packages/storage/src/types.ts` - `IStorageBackend`, `UploadParams`, etc.
- `packages/storage/src/errors.ts` - `StorageError`, `FileNotFoundError`
- `packages/storage/src/config.ts` - `getBackendConfig`, `S3Config`, `storageConfig`
- `packages/storage/src/registry.ts` - `registerBackend`

## Test Strategy

### Unit Tests (This Task)

Test the `S3StorageBackend` class with a mocked `S3Client`:

```typescript
// Create mock S3Client
const mockS3Client = {
  send: vi.fn(),
};

// Inject mock into class
const backend = new S3StorageBackend(
  mockS3Client as unknown as S3Client,
  'test-bucket',
  { signedUrlExpiration: 900 }
);
```

**Test Cases:**

1. **upload**
   - Uploads file with Buffer body
   - Uploads file with Readable stream body
   - Sets correct ContentType
   - Includes metadata when provided
   - Throws StorageError on S3 failure
   - Returns key and etag

2. **download**
   - Returns readable stream on success
   - Throws FileNotFoundError on NoSuchKey
   - Throws StorageError on other S3 failures

3. **delete**
   - Completes successfully on existing object
   - Completes successfully on non-existent object (idempotent)
   - Throws StorageError on other S3 failures

4. **exists**
   - Returns true when object exists
   - Returns false when object doesn't exist
   - Throws StorageError on other S3 failures

5. **getSignedUrl**
   - Generates GET URL by default
   - Generates PUT URL when method specified
   - Uses default expiration from config
   - Uses custom expiration when provided
   - Includes ContentType for PUT URLs
   - Returns URL and expiresAt timestamp

6. **Error handling**
   - Converts NoSuchKey to FileNotFoundError
   - Converts NotFound to FileNotFoundError
   - Converts credential errors without exposing secrets
   - Converts network errors with context
   - Wraps unknown errors in StorageError

### Integration Tests (E05-T003c)

Will test against real MinIO instance - not in scope for this task.

## Open Questions Resolution

| Question | Resolution |
|----------|------------|
| Self-registration vs separate initialization? | **Separate file** - `backends/index.ts` handles registration on import. This keeps the backend class focused on operations and allows selective registration. |
| AWS SDK version constraints? | **Latest v3** - Use `^3.700.0` to ensure compatibility with modern features. No existing constraints in pnpm-lock.yaml. |
| Server-side encryption? | **Defer** - Out of scope per task definition. Can be added as an option later without breaking changes. |
| Signed URL for non-existent objects? | **Allow it** - Standard S3 behavior. Don't add an `exists()` check before generating URLs. Document that errors occur on URL use, not generation. |

## Implementation Sequence

1. **Add dependencies** - Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

2. **Create S3StorageBackend class** (`backends/s3.backend.ts`)
   - Constructor accepting S3Client, bucket, options
   - Implement upload, download, delete, exists, getSignedUrl
   - Implement handleError for error conversion

3. **Create factory function** (in same file or separate `s3.factory.ts`)
   - Read configuration from `getBackendConfig<S3Config>()`
   - Create S3Client with proper options
   - Return new S3StorageBackend instance

4. **Create backends index** (`backends/index.ts`)
   - Export S3StorageBackend class
   - Export createS3Backend factory
   - Function to register with backend registry

5. **Write unit tests** (`__tests__/s3.backend.test.ts`)
   - Test all methods with mocked S3Client
   - Test error handling paths
   - Use AAA pattern per CONVENTIONS.md

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1: Implements IStorageBackend | Class declaration: `class S3StorageBackend implements IStorageBackend` |
| AC2: Upload with content types | `PutObjectCommand` with `ContentType` from `UploadParams` |
| AC3: Download from S3 | `GetObjectCommand`, return `response.Body` as `Readable` |
| AC4: Delete from S3 | `DeleteObjectCommand` |
| AC5: Existence checks | `HeadObjectCommand`, return true/false based on response |
| AC6: Signed URLs with expiration | `getSignedUrl` with configurable `expiresIn` |
| AC7: Organized path structure | Not enforced by backend - key generation is caller's responsibility |
| AC8: MinIO forcePathStyle | `forcePathStyle: !!config.STORAGE_S3_ENDPOINT` in S3Client config |
| AC9: Clear error messages | `handleError` method converts errors with context |
| AC10: Graceful missing object | NoSuchKey/NotFound → `FileNotFoundError`, delete returns silently |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| AWS SDK v3 breaking changes | Pin to specific major version range (`^3.700.0`) |
| Mock S3Client type mismatches | Use `as unknown as S3Client` with partial mock, verify all used methods are mocked |
| Stream handling edge cases | Test with both Buffer and Readable, ensure no memory leaks |
| Error code changes between S3/MinIO | Test error handling with multiple error scenarios, use error name not code |

## Reviewer Notes

This spec follows the analyst recommendation for Approach C. Key architectural decisions:

1. **Dependency Injection over Internal Creation**: The class receives S3Client rather than creating it. This enables straightforward unit testing without `vi.mock`.

2. **Factory Pattern**: The `createS3Backend` factory handles all configuration reading and client creation, keeping the backend class focused on operations.

3. **Error Handling Strategy**: Errors are caught and converted at each method boundary rather than using a global handler. This provides better context in error messages.

4. **Signed URL Behavior**: Following standard S3 behavior, signed URLs are generated without existence checks. This is intentional and documented.
