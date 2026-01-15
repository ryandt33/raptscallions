# Implementation Spec: E05-T002a

## Overview

Create the `@raptscallions/storage` package with a typed interface for storage backends, a plugin registry system for dynamic backend registration, a factory for lazy instantiation with caching, and typed error classes for domain-specific storage failures. This establishes the foundational abstraction layer that allows storage backends to be registered without modifying package code.

## Approach

Follow the functional-over-OOP principle from CONVENTIONS.md while providing class-based errors (required for instanceof checks) and a class-based interface contract. The plugin registry uses a simple Map-based approach with type-safe registration that validates implementations at registration time. The factory uses lazy instantiation with singleton caching per backend type.

Key design decisions:
- **Interface-based contract**: `IStorageBackend` defines the full contract without coupling to specific implementations
- **String-based backend identifiers**: Backends are identified by string keys (e.g., "local", "s3", "azure") rather than an enum, enabling extensibility
- **Registration-time validation**: TypeScript generics enforce interface compliance at registration time
- **Lazy factory with caching**: Backends are instantiated on first request and cached as singletons
- **Resettable state**: Both registry and factory expose reset functions for testing
- **Error hierarchy**: Storage-specific errors extend AppError from `@raptscallions/core`

## Files to Create

| File | Purpose |
| ---- | ------- |
| `packages/storage/package.json` | Package configuration with dependencies on zod and @raptscallions/core |
| `packages/storage/tsconfig.json` | TypeScript configuration extending root config |
| `packages/storage/vitest.config.ts` | Vitest configuration extending root config |
| `packages/storage/src/index.ts` | Barrel exports for all public APIs |
| `packages/storage/src/types.ts` | Interface and type definitions (IStorageBackend, UploadParams, etc.) |
| `packages/storage/src/errors.ts` | Storage-specific error classes extending AppError |
| `packages/storage/src/registry.ts` | Plugin registration system with validation |
| `packages/storage/src/factory.ts` | Backend factory with lazy instantiation and caching |
| `packages/storage/src/__tests__/types.test.ts` | Type inference and interface compliance tests |
| `packages/storage/src/__tests__/errors.test.ts` | Error class unit tests |
| `packages/storage/src/__tests__/registry.test.ts` | Registry functionality tests |
| `packages/storage/src/__tests__/factory.test.ts` | Factory functionality tests |

## Files to Modify

| File | Changes |
| ---- | ------- |
| `tsconfig.json` | Add reference to `packages/storage` |
| `vitest.workspace.ts` | Add `packages/storage` to workspace packages |
| `pnpm-workspace.yaml` | Already includes `packages/*`, no change needed |

## Dependencies

- Requires: None (this task has no dependencies)
- New packages:
  - `zod` (already in workspace, will be workspace dependency)
  - `@raptscallions/core` (workspace dependency for AppError, Zod schemas)

## Test Strategy

### Unit Tests

**Error Tests (`errors.test.ts`)**:
- Verify StorageError extends AppError with correct status code (500)
- Verify QuotaExceededError extends AppError with correct status code (403)
- Verify FileNotFoundError extends AppError with correct status code (404)
- Verify InvalidFileTypeError extends AppError with correct status code (400)
- Verify all errors maintain proper prototype chain for instanceof checks
- Verify error serialization via toJSON()
- Verify error messages are descriptive and include relevant context

**Registry Tests (`registry.test.ts`)**:
- Verify backends can be registered with registerBackend()
- Verify registration validates interface compliance (type-level, no runtime check)
- Verify getBackendFactory() returns registered factory
- Verify getBackendFactory() throws BackendNotRegisteredError for unknown identifiers
- Verify multiple backends can be registered simultaneously
- Verify re-registration overwrites previous registration (idempotent)
- Verify isBackendRegistered() returns correct boolean
- Verify getRegisteredBackends() returns all registered identifiers
- Verify resetRegistry() clears all registrations

**Factory Tests (`factory.test.ts`)**:
- Verify getBackend() creates instance on first call (lazy instantiation)
- Verify getBackend() returns cached instance on subsequent calls (singleton)
- Verify getBackend() throws BackendNotRegisteredError for unknown identifiers
- Verify different backend types have separate cached instances
- Verify resetFactory() clears all cached instances
- Verify resetAll() clears both registry and factory state
- Verify factory works with backends registered after first use

### Integration Tests

Not applicable for this package-only task. Integration tests with actual backends will be in E05-T003 (local), E05-T004 (S3), etc.

## Acceptance Criteria Breakdown

### Package & Interface (AC1-AC3)

**AC1: Package `@raptscallions/storage` created with proper structure and dependencies**
- Create `packages/storage/` directory structure matching existing packages
- Package.json with name `@raptscallions/storage`, ES modules, workspace deps
- TypeScript config extending root tsconfig.json
- Vitest config extending root config

**AC2: IStorageBackend interface defines contract: upload, download, delete, exists, getSignedUrl**
```typescript
interface IStorageBackend {
  upload(params: UploadParams): Promise<UploadResult>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl>;
}
```

**AC3: Package exports TypeScript types for interface and helper types**
- Export `IStorageBackend` interface
- Export `UploadParams`, `UploadResult`, `SignedUrl`, `SignedUrlOptions` types
- Use `export type` for type-only exports where appropriate

### Plugin Registry (AC4-AC10)

**AC4: Storage backends can be registered programmatically at runtime**
```typescript
registerBackend<T extends IStorageBackend>(
  identifier: string,
  factory: BackendFactory<T>
): void
```

**AC5: Backend registration validates that implementations satisfy the interface contract**
- TypeScript generics enforce `T extends IStorageBackend` at compile time
- No runtime validation needed (TypeScript handles it)

**AC6: System provides a way to retrieve registered backend by identifier**
```typescript
getBackendFactory(identifier: string): BackendFactory<IStorageBackend>
```

**AC7: Built-in backends (local, S3) can be registered using the same mechanism**
- Same `registerBackend()` function works for built-in and custom backends
- No special handling or reserved identifiers

**AC8: Attempting to retrieve an unregistered backend fails with clear, actionable error**
```typescript
throw new BackendNotRegisteredError(identifier, getRegisteredBackends());
```
- Error message includes the unknown identifier
- Error message lists available backends for discoverability

**AC9: Multiple backends can be registered simultaneously without conflicts**
- Registry stores backends in a Map keyed by identifier
- Each identifier is independent

**AC10: Backend registration is idempotent (re-registering same backend overwrites safely)**
- `registerBackend()` with existing identifier overwrites previous entry
- No error thrown on re-registration

### Factory & Instance Management (AC11-AC14)

**AC11: Factory creates backend instances on demand (lazy instantiation)**
- Backends are not instantiated until `getBackend()` is called
- Factory function is invoked only on first request

**AC12: Factory caches instances (singleton per backend type)**
- After first instantiation, subsequent calls return same instance
- Separate cache entry per backend identifier

**AC13: Factory throws typed error for unknown backend identifiers**
- Uses `BackendNotRegisteredError` from registry module
- Error includes identifier and available backends

**AC14: Tests can reset factory state between test cases**
```typescript
resetFactory(): void  // Clear instance cache
resetRegistry(): void  // Clear registered backends
resetAll(): void  // Clear both (convenience)
```

### Error Types (AC15-AC18)

**AC15: Package exports StorageError (extends AppError with 500 status)**
- Base error for generic storage backend failures
- Used for network errors, permission issues, service unavailability

**AC16: Package exports QuotaExceededError (extends AppError with 403 status)**
- Thrown when user/group storage quota would be exceeded
- 403 Forbidden is appropriate (action not allowed due to limits)

**AC17: Package exports FileNotFoundError (extends AppError with 404 status)**
- Thrown when download/delete/exists fails to find file
- Different from core NotFoundError (storage-specific context)

**AC18: Package exports InvalidFileTypeError (extends AppError with 400 status)**
- Thrown when upload MIME type validation fails
- 400 Bad Request indicates client provided invalid input

## Detailed Implementation

### Type Definitions

```typescript
// packages/storage/src/types.ts

import type { Readable } from "node:stream";

/**
 * Parameters for file upload operation.
 */
export interface UploadParams {
  /** Unique storage key for the file */
  key: string;
  /** File content as Buffer or readable stream */
  body: Buffer | Readable;
  /** MIME type of the file */
  contentType: string;
  /** File size in bytes (required for stream uploads) */
  contentLength?: number;
  /** Optional metadata to store with the file */
  metadata?: Record<string, string>;
}

/**
 * Result returned after successful upload.
 */
export interface UploadResult {
  /** Storage key where file was stored */
  key: string;
  /** ETag or version identifier from storage backend */
  etag?: string;
  /** Full URL to access the file (if public) */
  url?: string;
}

/**
 * Options for generating signed URLs.
 */
export interface SignedUrlOptions {
  /** Expiration time in seconds (default varies by backend) */
  expiresIn?: number;
  /** HTTP method the URL is valid for (default: GET) */
  method?: "GET" | "PUT";
  /** Content type for PUT URLs */
  contentType?: string;
}

/**
 * Signed URL result.
 */
export interface SignedUrl {
  /** The signed URL */
  url: string;
  /** When the URL expires (ISO 8601) */
  expiresAt: string;
}

/**
 * Storage backend interface contract.
 * All storage backends must implement this interface.
 */
export interface IStorageBackend {
  /**
   * Upload a file to storage.
   * @param params Upload parameters including key, body, and content type
   * @returns Upload result with key and optional etag/url
   * @throws StorageError on backend failure
   * @throws QuotaExceededError if storage limits exceeded
   * @throws InvalidFileTypeError if content type not allowed
   */
  upload(params: UploadParams): Promise<UploadResult>;

  /**
   * Download a file from storage.
   * @param key Storage key of the file
   * @returns Readable stream of file contents
   * @throws FileNotFoundError if file doesn't exist
   * @throws StorageError on backend failure
   */
  download(key: string): Promise<Readable>;

  /**
   * Delete a file from storage.
   * @param key Storage key of the file
   * @throws FileNotFoundError if file doesn't exist
   * @throws StorageError on backend failure
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists in storage.
   * @param key Storage key to check
   * @returns true if file exists, false otherwise
   * @throws StorageError on backend failure
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a signed URL for temporary file access.
   * @param key Storage key of the file
   * @param options URL generation options
   * @returns Signed URL with expiration
   * @throws FileNotFoundError if file doesn't exist
   * @throws StorageError on backend failure
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl>;
}

/**
 * Factory function type for creating backend instances.
 * Backends may require configuration, which is passed during registration.
 */
export type BackendFactory<T extends IStorageBackend = IStorageBackend> = () => T;
```

### Error Classes

```typescript
// packages/storage/src/errors.ts

import { AppError } from "@raptscallions/core";

/**
 * Error codes for storage operations.
 */
export const StorageErrorCode = {
  STORAGE_ERROR: "STORAGE_ERROR",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  BACKEND_NOT_REGISTERED: "BACKEND_NOT_REGISTERED",
} as const;

export type StorageErrorCodeType =
  (typeof StorageErrorCode)[keyof typeof StorageErrorCode];

/**
 * Base error for storage backend failures.
 * Used for network errors, permission issues, service unavailability.
 * Defaults to HTTP 500 Internal Server Error.
 */
export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, StorageErrorCode.STORAGE_ERROR, 500, details);
    this.name = "StorageError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when storage quota would be exceeded.
 * Defaults to HTTP 403 Forbidden (action not allowed due to limits).
 */
export class QuotaExceededError extends AppError {
  constructor(
    message: string = "Storage quota exceeded",
    details?: {
      currentUsage?: number;
      quotaLimit?: number;
      requestedSize?: number;
    }
  ) {
    super(message, StorageErrorCode.QUOTA_EXCEEDED, 403, details);
    this.name = "QuotaExceededError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a file is not found in storage.
 * Different from core NotFoundError to provide storage-specific context.
 * Defaults to HTTP 404 Not Found.
 */
export class FileNotFoundError extends AppError {
  constructor(key: string) {
    super(
      `File not found in storage: ${key}`,
      StorageErrorCode.FILE_NOT_FOUND,
      404,
      { key }
    );
    this.name = "FileNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when file MIME type validation fails.
 * Defaults to HTTP 400 Bad Request.
 */
export class InvalidFileTypeError extends AppError {
  constructor(
    providedType: string,
    allowedTypes?: string[]
  ) {
    const message = allowedTypes
      ? `Invalid file type: ${providedType}. Allowed types: ${allowedTypes.join(", ")}`
      : `Invalid file type: ${providedType}`;

    super(message, StorageErrorCode.INVALID_FILE_TYPE, 400, {
      providedType,
      allowedTypes,
    });
    this.name = "InvalidFileTypeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when attempting to use an unregistered storage backend.
 * Includes list of available backends for discoverability.
 * Defaults to HTTP 500 Internal Server Error (configuration issue).
 */
export class BackendNotRegisteredError extends AppError {
  constructor(identifier: string, availableBackends: string[]) {
    const message = availableBackends.length > 0
      ? `Storage backend not registered: "${identifier}". Available backends: ${availableBackends.join(", ")}`
      : `Storage backend not registered: "${identifier}". No backends are currently registered.`;

    super(message, StorageErrorCode.BACKEND_NOT_REGISTERED, 500, {
      requestedBackend: identifier,
      availableBackends,
    });
    this.name = "BackendNotRegisteredError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### Plugin Registry

```typescript
// packages/storage/src/registry.ts

import type { IStorageBackend, BackendFactory } from "./types.js";
import { BackendNotRegisteredError } from "./errors.js";

/**
 * Internal registry storage for backend factories.
 * Using Map for O(1) lookup and clear semantics.
 */
const backendRegistry = new Map<string, BackendFactory>();

/**
 * Register a storage backend factory.
 *
 * The generic constraint ensures type-safety: only factories that produce
 * IStorageBackend implementations can be registered.
 *
 * Registration is idempotent - re-registering with the same identifier
 * overwrites the previous factory.
 *
 * @param identifier Unique string identifier for the backend (e.g., "local", "s3")
 * @param factory Factory function that creates backend instances
 *
 * @example
 * ```typescript
 * // Register a local filesystem backend
 * registerBackend("local", () => new LocalStorageBackend("/uploads"));
 *
 * // Register an S3-compatible backend
 * registerBackend("s3", () => new S3StorageBackend({
 *   bucket: "my-bucket",
 *   region: "us-east-1",
 * }));
 * ```
 */
export function registerBackend<T extends IStorageBackend>(
  identifier: string,
  factory: BackendFactory<T>
): void {
  backendRegistry.set(identifier, factory as BackendFactory);
}

/**
 * Get a registered backend factory by identifier.
 *
 * @param identifier The backend identifier to look up
 * @returns The factory function for creating backend instances
 * @throws BackendNotRegisteredError if identifier is not registered
 *
 * @example
 * ```typescript
 * const factory = getBackendFactory("s3");
 * const backend = factory();
 * ```
 */
export function getBackendFactory(identifier: string): BackendFactory {
  const factory = backendRegistry.get(identifier);

  if (!factory) {
    throw new BackendNotRegisteredError(
      identifier,
      getRegisteredBackends()
    );
  }

  return factory;
}

/**
 * Check if a backend is registered.
 *
 * @param identifier The backend identifier to check
 * @returns true if the backend is registered, false otherwise
 */
export function isBackendRegistered(identifier: string): boolean {
  return backendRegistry.has(identifier);
}

/**
 * Get list of all registered backend identifiers.
 *
 * @returns Array of registered backend identifiers
 */
export function getRegisteredBackends(): string[] {
  return Array.from(backendRegistry.keys());
}

/**
 * Clear all registered backends.
 * Used for testing to reset state between test cases.
 */
export function resetRegistry(): void {
  backendRegistry.clear();
}
```

### Backend Factory

```typescript
// packages/storage/src/factory.ts

import type { IStorageBackend } from "./types.js";
import { getBackendFactory, resetRegistry } from "./registry.js";

/**
 * Cache for backend instances (singleton per identifier).
 */
const instanceCache = new Map<string, IStorageBackend>();

/**
 * Get a storage backend instance by identifier.
 *
 * This function provides lazy instantiation with singleton caching:
 * - First call: invokes the factory and caches the result
 * - Subsequent calls: returns the cached instance
 *
 * @param identifier The backend identifier (e.g., "local", "s3")
 * @returns The backend instance
 * @throws BackendNotRegisteredError if identifier is not registered
 *
 * @example
 * ```typescript
 * // Get the configured storage backend
 * const storage = getBackend("s3");
 *
 * // Upload a file
 * await storage.upload({
 *   key: "uploads/file.pdf",
 *   body: fileBuffer,
 *   contentType: "application/pdf",
 * });
 * ```
 */
export function getBackend(identifier: string): IStorageBackend {
  // Check cache first
  const cached = instanceCache.get(identifier);
  if (cached) {
    return cached;
  }

  // Get factory (throws if not registered)
  const factory = getBackendFactory(identifier);

  // Create instance and cache it
  const instance = factory();
  instanceCache.set(identifier, instance);

  return instance;
}

/**
 * Check if a backend instance is cached.
 *
 * @param identifier The backend identifier to check
 * @returns true if an instance is cached, false otherwise
 */
export function isBackendCached(identifier: string): boolean {
  return instanceCache.has(identifier);
}

/**
 * Clear all cached backend instances.
 * Used for testing to reset state between test cases.
 *
 * Note: This does not unregister backends from the registry.
 * Use resetRegistry() to clear registrations.
 */
export function resetFactory(): void {
  instanceCache.clear();
}

/**
 * Clear both the instance cache and the backend registry.
 * Convenience function for test cleanup.
 *
 * @example
 * ```typescript
 * // In test teardown
 * afterEach(() => {
 *   resetAll();
 * });
 * ```
 */
export function resetAll(): void {
  instanceCache.clear();
  resetRegistry();
}
```

### Barrel Exports

```typescript
// packages/storage/src/index.ts

// Type exports
export type {
  IStorageBackend,
  BackendFactory,
  UploadParams,
  UploadResult,
  SignedUrl,
  SignedUrlOptions,
} from "./types.js";

// Error exports
export {
  StorageError,
  QuotaExceededError,
  FileNotFoundError,
  InvalidFileTypeError,
  BackendNotRegisteredError,
  StorageErrorCode,
} from "./errors.js";
export type { StorageErrorCodeType } from "./errors.js";

// Registry exports
export {
  registerBackend,
  getBackendFactory,
  isBackendRegistered,
  getRegisteredBackends,
  resetRegistry,
} from "./registry.js";

// Factory exports
export {
  getBackend,
  isBackendCached,
  resetFactory,
  resetAll,
} from "./factory.js";
```

### Package Configuration

```json
// packages/storage/package.json
{
  "name": "@raptscallions/storage",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist *.tsbuildinfo",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --max-warnings 0",
    "lint:fix": "eslint src --fix"
  },
  "dependencies": {
    "@raptscallions/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.1.0"
  }
}
```

```typescript
// packages/storage/vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "../../vitest.config.js";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: "@raptscallions/storage",
      environment: "node",
      include: [
        "src/**/*.test.ts",
        "src/**/__tests__/**/*.test.ts",
      ],
    },
  })
);
```

```json
// packages/storage/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/__tests__/**/*", "node_modules", "dist"],
  "references": [
    { "path": "../core" }
  ]
}
```

## Edge Cases

1. **Concurrent registration**: Multiple calls to `registerBackend()` with the same identifier will overwrite. This is intentional (idempotent) but could hide bugs if different factories are registered. The last write wins.

2. **Factory throws during instantiation**: If a factory function throws, the error propagates to the caller of `getBackend()`. The cache is not populated, so retrying will attempt factory invocation again.

3. **Factory returns different instances**: The factory is only called once per identifier (due to caching). If callers need fresh instances, they should use different identifiers or call `resetFactory()`.

4. **Empty identifier string**: Empty string is a valid Map key, so `registerBackend("")` works technically. Consider adding validation if this is problematic, but keeping it simple for now.

5. **Memory management**: Cached instances persist for application lifetime. For long-running processes, this is typically fine. If backends hold resources, they should implement cleanup methods (not part of this interface).

6. **Thread safety**: JavaScript is single-threaded, so Map operations are atomic. No race conditions in registration or caching.

7. **Registry modification during iteration**: `getRegisteredBackends()` returns a new array, so modifications during iteration are safe.

8. **Backend deregistration**: There is no `unregisterBackend()` function. Use `resetRegistry()` to clear all backends. Individual deregistration could be added later if needed.

## Open Questions

*To be resolved during code review.*

### Q1: Should there be runtime validation of factory return type?

**Recommendation: No, keep TypeScript-only validation.**

Rationale:
- TypeScript generics enforce interface compliance at compile time
- Runtime validation adds overhead and complexity
- If a factory returns a broken implementation, tests will catch it
- Following "trust the type system" principle from CONVENTIONS.md

Counter-argument: Runtime validation provides defense-in-depth for JS consumers or dynamic registration.

---

### Q2: Should BackendFactory accept configuration parameters?

**Current design**: `BackendFactory<T> = () => T` (no parameters)

**Alternative**: `BackendFactory<T, C> = (config: C) => T`

**Recommendation: Keep simple, config is factory's responsibility.**

Rationale:
- Configuration is handled by E05-T002b (configuration system)
- Factories can capture config in closures when registered
- Adding config generics complicates the API without clear benefit
- Matches the pattern used in `packages/ai/client.ts` (config is module-internal)

Counter-argument: Explicit config typing could provide better type safety for backend implementers.

---

### Q3: Should getBackend() be async?

**Current design**: Synchronous return

**Alternative**: `async getBackend(id: string): Promise<IStorageBackend>`

**Recommendation: Keep synchronous.**

Rationale:
- Factory functions can be async internally if needed (return Promise)
- Most backends are instantiated synchronously (just config setup)
- Async factories would complicate the caching logic
- Existing patterns (Lucia adapter, Drizzle client) use sync instantiation

Counter-argument: Some backends might need async initialization (e.g., fetching credentials). But they can handle this internally with lazy connection.

---

### Q4: Should error codes be centralized in @raptscallions/core?

**Current design**: `StorageErrorCode` in storage package

**Alternative**: Add storage error codes to core's `ErrorCode`

**Recommendation: Keep in storage package.**

Rationale:
- Storage errors are domain-specific, not application-wide
- Following `packages/ai/errors.ts` pattern (domain errors in domain package)
- Keeps core package lean
- Prevents core from having dependencies on domain concepts

Counter-argument: Centralization enables better error handling middleware. But storage errors should be caught at the storage layer.

---

## Architecture Review Checklist

For architect review, verify:

1. **Technology alignment**: Uses TypeScript, Zod integration ready, extends AppError from core
2. **Naming conventions**: snake_case not applicable (no DB), camelCase for functions/variables
3. **File organization**: Matches `packages/ai/` structure
4. **Type exports**: Uses `export type` for type-only exports
5. **Error patterns**: Extends AppError, uses `Object.setPrototypeOf` for prototype chain
6. **Testing strategy**: Follows AAA pattern, tests in `__tests__/` directory
7. **Package structure**: Matches existing packages (core, ai, auth)
8. **No `any` types**: Uses `unknown` with type guards where needed
9. **ES modules**: Package uses `"type": "module"`

## Summary

This spec establishes the storage abstraction layer that enables:
1. Multiple storage backends without code changes (plugin system)
2. Type-safe registration and retrieval of backends
3. Efficient resource usage through lazy instantiation and caching
4. Clear error handling with domain-specific error types
5. Easy testing through resettable state

The implementation follows existing codebase patterns from `packages/ai/` and `packages/core/`, ensuring consistency across the monorepo.

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-16
**Verdict:** APPROVED

### Summary

The spec is architecturally sound and follows all established patterns. The design mirrors `packages/ai/` structure exactly, uses proper TypeScript patterns without any `any` types, and provides a clean extensibility model through the plugin registry.

### Checklist Results

| Area | Status | Notes |
|------|--------|-------|
| Architecture Fit | ✅ PASS | Follows Gateway-Application-Data layers; new package fits cleanly into `packages/` |
| Code Quality | ✅ PASS | File naming follows conventions; proper TypeScript patterns |
| TypeScript Strictness | ✅ PASS | No `any` types; uses generics with constraints; proper type exports |
| Database | N/A | No database changes in this task |
| Testing | ✅ PASS | AAA pattern specified; tests in `__tests__/`; resettable state for isolation |
| Dependencies | ✅ PASS | No new npm packages; uses existing `@raptscallions/core` |
| Security | ✅ PASS | No security concerns for interface/registry layer |

### Detailed Findings

**Strengths:**

1. **Perfect Pattern Alignment** - The spec mirrors `packages/ai/` exactly:
   - Same error class pattern extending `AppError` with `Object.setPrototypeOf`
   - Same barrel export structure in `index.ts`
   - Same tsconfig.json and vitest.config.ts patterns
   - Domain-specific error codes in the storage package (not core)

2. **TypeScript Correctness** - No violations:
   - Uses `Record<string, string>` and `Record<string, unknown>` (never `any`)
   - Uses `export type` for type-only exports
   - Generic constraints (`T extends IStorageBackend`) provide compile-time safety
   - Proper use of `unknown` with type guards recommended in Q1

3. **Functional-Over-OOP** - Correctly applied:
   - Registry uses pure functions (`registerBackend`, `getBackendFactory`)
   - Factory uses pure functions (`getBackend`, `resetFactory`)
   - Classes only where required (Error classes for `instanceof`)

4. **Extensibility Design** - Well architected:
   - String-based identifiers allow unlimited backends
   - No enum restricts future extensions
   - Same registration mechanism for built-in and custom backends

5. **Testability** - Properly considered:
   - `resetRegistry()`, `resetFactory()`, `resetAll()` for test isolation
   - `isBackendCached()` and `isBackendRegistered()` for assertions

**Minor Notes (Non-Blocking):**

1. The `package.json` does not include `zod` as a dependency, but the spec mentions "Zod integration ready" - this is fine since Zod is not directly used in this task.

2. The tsconfig.json exclude pattern (`src/__tests__/**/*`) differs slightly from `packages/ai/` (`**/*.test.ts`) but both achieve the same result.

### Open Questions Resolution

The spec's recommended answers to all four open questions are architecturally sound:

- **Q1 (Runtime validation)**: Agree with "No" - TypeScript provides sufficient compile-time safety
- **Q2 (Factory config params)**: Agree with keeping factory parameterless - matches existing patterns
- **Q3 (Async getBackend)**: Agree with synchronous - matches Drizzle/Lucia patterns
- **Q4 (Error codes location)**: Agree with keeping in storage package - matches AI package pattern

### Suggestions

- Consider adding input validation for empty string identifiers in `registerBackend()` if this becomes problematic in practice (Edge Case #4 in spec). Currently acceptable as-is.

### Approved With Notes

The developer should proceed with implementation. All open questions in the spec have reasonable recommended answers that align with existing codebase patterns.
