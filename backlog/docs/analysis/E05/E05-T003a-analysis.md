# Analysis: E05-T003a

## Problem Statement

RaptScallions needs an S3-compatible storage backend to serve as the production default for file storage. Schools and districts require reliable, scalable storage for student work, teacher materials, and assignment attachments. The backend must work with AWS S3, MinIO, DigitalOcean Spaces, and Backblaze B2 to support both cloud deployments and self-hosted environments without vendor lock-in.

## Context

### Related Code

- `packages/storage/src/types.ts:62-107` - IStorageBackend interface contract with upload, download, delete, exists, getSignedUrl methods
- `packages/storage/src/config.ts:56-71` - S3-specific Zod configuration schema (endpoint, region, bucket, access keys)
- `packages/storage/src/errors.ts:28-130` - Storage error classes including StorageError, FileNotFoundError
- `packages/storage/src/registry.ts:40-45` - registerBackend function for plugin registration
- `packages/storage/src/factory.ts:39-54` - getBackend factory for lazy instantiation
- `packages/ai/src/client.ts:32-302` - Reference pattern for external service client (error handling, constructor, singleton pattern)

### Existing Patterns

- **External service client pattern** in `packages/ai/src/client.ts:32-76` - Constructor with optional config, fallback to environment config, typed error handling
- **Error conversion pattern** in `packages/ai/src/client.ts:207-301` - handleError method converts SDK errors to typed application errors
- **Lazy singleton pattern** in `packages/ai/src/client.ts:306-315` - Proxy-based deferred instantiation
- **Config validation pattern** in `packages/storage/src/config.ts:151-196` - Zod schema validation with ConfigurationError on failure
- **Backend registration pattern** in `packages/storage/src/registry.ts:40-45` - Type-safe plugin registration

### Constraints from Task

- Must implement IStorageBackend interface from E05-T002a
- Must use configuration from E05-T002b (STORAGE_S3_* environment variables)
- Must work with MinIO using forcePathStyle (path-style URLs)
- Must work with AWS S3 (virtual-hosted style)
- Must support streaming for large files (avoid loading entire file in memory)
- Must distinguish between "object not found" and "service unavailable" errors
- Signed URL default expiration: 15 minutes
- Storage keys follow: groupId/year/month/uuid.ext
- Performance: minimal overhead (<5% of transfer time)
- Unit tests only - integration tests in E05-T003c

## Proposed Approaches

### Approach A: Class-Based Backend with Constructor Injection

**Summary:** Create an `S3StorageBackend` class that accepts configuration via constructor, following the OpenRouterClient pattern. The class instantiates the AWS SDK S3Client internally and exposes methods matching IStorageBackend.

**How it works:**
- Class constructor accepts optional S3Config object, falls back to storageConfig/getBackendConfig
- S3Client created once in constructor and reused for all operations
- Each IStorageBackend method wraps corresponding S3Command with error conversion
- Error handling converts AWS SDK errors to typed StorageError/FileNotFoundError
- Factory function registered with registerBackend creates instance

**Trade-offs:**

| Pros | Cons |
|------|------|
| Follows established OpenRouterClient pattern | Class-based, less functional |
| Constructor injection enables testing without mocking modules | Requires instantiation logic in factory |
| Single S3Client instance is efficient | Config validation duplicated if not careful |
| Clear separation of concerns | More boilerplate than functional approach |

**Follows pattern from:** `packages/ai/src/client.ts:32-76`

**Risks:**
- Constructor must handle both DI and fallback to config carefully
- Need to ensure S3Client is created lazily (only when backend is used)

### Approach B: Functional Module with Exported Functions

**Summary:** Create a functional module that exports createS3Backend factory function and individual operation functions. The S3Client is created lazily and cached at module level.

**How it works:**
- Module-level lazy S3Client instance (created on first use)
- `createS3Backend()` returns an object implementing IStorageBackend
- Each method is a standalone function that uses shared S3Client
- Config loaded lazily via storageConfig Proxy
- Error handling centralized in shared handleS3Error function

**Trade-offs:**

| Pros | Cons |
|------|------|
| More functional, less OOP | Module-level state harder to reset in tests |
| Simpler factory function | Less clear encapsulation |
| Functions can be tested individually | Shared client requires coordination |
| Aligns with project's "functional over OOP" principle | Deviates from OpenRouterClient pattern |

**Follows pattern from:** New pattern (functional approach)

**Risks:**
- Module-level singleton harder to mock in unit tests
- Need separate reset mechanism for test cleanup
- Config access timing could cause issues

### Approach C: Hybrid - Class Backend with Injected S3Client

**Summary:** Create a class that implements IStorageBackend but receives the S3Client as a constructor dependency rather than creating it internally. A separate factory function handles client creation.

**How it works:**
- `S3StorageBackend` class accepts S3Client instance and bucket name in constructor
- `createS3Backend()` factory reads config, creates S3Client, instantiates class
- Backend methods are pure - they just use the injected client
- Testing: inject mock S3Client directly, no module mocking needed
- Error conversion in each method or shared utility

**Trade-offs:**

| Pros | Cons |
|------|------|
| Best testability - inject mock client | Two-step creation (factory + class) |
| Clear dependency injection | More indirection |
| Class methods are simple wrappers | Factory must coordinate config and client |
| Easy to swap S3Client implementations | Slightly more complex API |

**Follows pattern from:** Dependency injection principles + class structure from `packages/ai/src/client.ts`

**Risks:**
- Factory function becomes more complex
- Need to ensure factory is what gets registered, not class directly

## Acceptance Criteria Mapping

| AC | Approach A | Approach B | Approach C |
|----|------------|------------|------------|
| AC1: Implements IStorageBackend | Class implements interface | Factory returns interface-shaped object | Class implements interface |
| AC2: Upload with content types | PutObjectCommand in upload() | upload() function wraps PutObjectCommand | upload() method wraps PutObjectCommand |
| AC3: Download from S3 | GetObjectCommand returns stream | download() function returns stream | download() method returns stream |
| AC4: Delete from S3 | DeleteObjectCommand in delete() | delete() function | delete() method |
| AC5: Existence checks | HeadObjectCommand in exists() | exists() function | exists() method |
| AC6: Signed URLs with expiration | @aws-sdk/s3-request-presigner | Same | Same |
| AC7: Organized path structure | generateKey() private method | generateKey() function | generateKey() method |
| AC8: MinIO forcePathStyle | S3Client config option | S3Client config option | S3Client config option |
| AC9: Clear error messages | handleError() method | handleS3Error() function | handleError() method or utility |
| AC10: Graceful missing object | Try-catch with error code check | Same | Same |

## Edge Cases

- **Empty bucket name**: All approaches - throw ConfigurationError during client creation
- **Network timeout**: Convert to StorageError with timeout context
- **Invalid credentials**: Convert to StorageError with authentication context (don't expose keys)
- **Object not found on download**: Throw FileNotFoundError
- **Object not found on delete**: Silently succeed (idempotent delete)
- **Object not found on exists**: Return false (not an error)
- **Stream interruption during upload**: StorageError with partial upload context
- **Signed URL for non-existent key**: Generate URL anyway (S3 allows this, error on access)
- **Content-Length missing for stream upload**: Use contentLength from UploadParams or fail

## Open Questions

- [ ] Should the backend self-register, or should registration happen in a separate initialization file?
- [ ] What AWS SDK version constraints exist? (Check if already in pnpm-lock.yaml)
- [ ] Should we support server-side encryption options now, or defer to future enhancement?
- [ ] For signed URL generation on non-existent objects: should we check exists() first or let S3 behavior stand?

## Analyst Recommendation

**Approach C (Hybrid - Class Backend with Injected S3Client)** is recommended for the following reasons:

1. **Best testability**: Unit tests can inject mock S3Client without module mocking (vi.mock is unreliable with Fastify, per CONVENTIONS.md:644)

2. **Clear separation**: Factory handles config/client creation, class handles S3 operations. Each can be tested independently.

3. **Follows existing patterns**: Uses class structure like OpenRouterClient but adds DI for better testing, addressing a known pain point.

4. **Explicit dependencies**: The class's constructor signature documents exactly what it needs (S3Client, bucket, optional config), making the code self-documenting.

5. **Flexible factory**: The factory can be registered with registerBackend and handles all initialization, while the class remains focused on operations.

**Implementation structure:**

```
packages/storage/src/backends/
  s3.backend.ts       - S3StorageBackend class
  s3.factory.ts       - createS3Backend factory (or in same file)
  __tests__/
    s3.backend.test.ts
```

**Complexity estimate:** Medium - AWS SDK v3 has good TypeScript support, but streaming and error handling require careful implementation. The DI pattern adds a small amount of complexity but pays off in testability.

**Dependencies to add:**
- `@aws-sdk/client-s3` - Core S3 operations
- `@aws-sdk/s3-request-presigner` - Signed URL generation
