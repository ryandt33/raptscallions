# Implementation Spec: E05-T002b

## Overview

Create a Zod-based configuration system for the `@raptscallions/storage` package that validates environment variables, enforces backend-specific requirements, and provides lazy initialization using the Proxy pattern from `packages/ai/config.ts`. The configuration system will validate common settings (max file size, quota, signed URL expiration) and backend-specific settings (S3 credentials, Azure account, local path), ensuring all required configuration is present before backend instantiation.

## Approach

Follow the established pattern from `packages/ai/config.ts` for lazy configuration loading using Proxy. The configuration system will use Zod discriminated unions to validate backend-specific configuration based on the selected `STORAGE_BACKEND` identifier. Key design decisions:

- **Lazy loading via Proxy**: Configuration is not parsed until first property access (matches AI package pattern)
- **Discriminated union for backends**: Use Zod's discriminated union based on backend identifier to validate backend-specific config
- **Extensible config registry**: Backends can register their config schemas at runtime (integrates with E05-T002a plugin system)
- **Environment variables as source**: All config from `process.env` (no config files)
- **Immutable after load**: Once parsed, config cannot be modified
- **Sensible defaults**: Local backend works with zero configuration

The configuration validates:
1. **Common settings**: Applied to all backends (max file size, quota, signed URL expiration)
2. **Backend identifier**: Which backend to use (`STORAGE_BACKEND`)
3. **Backend-specific settings**: Validated based on selected backend

## Files to Create

| File | Purpose |
| ---- | ------- |
| `packages/storage/src/config.ts` | Configuration schema, lazy loading, and validation |
| `packages/storage/src/config-registry.ts` | Backend config schema registration system |
| `packages/storage/src/__tests__/config.test.ts` | Configuration unit tests |
| `packages/storage/src/__tests__/config-registry.test.ts` | Config registry unit tests |

## Files to Modify

| File | Changes |
| ---- | ------- |
| `packages/storage/src/index.ts` | Export config, config registry functions, and config types |
| `packages/storage/src/errors.ts` | Add `ConfigurationError` class for config validation failures |

## Dependencies

- Requires: E05-T002a (storage backend interface and plugin system)
- New packages: None (uses existing `zod` from workspace)

## Test Strategy

### Unit Tests

**Config Tests (`config.test.ts`)**:
- Verify common settings are validated (maxFileSizeBytes, storageQuotaBytes, signedUrlExpirationSeconds)
- Verify default values are applied (10MB file size, 1GB quota, 15min signed URL)
- Verify `STORAGE_BACKEND` determines which backend config to validate
- Verify backend-specific settings are validated for each registered backend
- Verify missing required settings produce clear error messages
- Verify invalid values (negative numbers, invalid URLs) produce clear errors
- Verify config is lazy-loaded (not parsed until first access)
- Verify config reset works for testing
- Verify config is immutable after load (proxy returns same values)
- Verify environment variables are the configuration source

**Config Registry Tests (`config-registry.test.ts`)**:
- Verify backend config schemas can be registered
- Verify registered schemas are used during validation
- Verify unknown backends without registered schemas fail validation
- Verify re-registration overwrites previous schema (idempotent)
- Verify registry can be reset for testing
- Verify validation works with dynamically registered schemas

### Integration Tests

Integration with actual backends (E05-T003, E05-T004, E05-T005) will test:
- Backend instantiation uses validated config
- Config errors are thrown before backend instantiation

## Acceptance Criteria Breakdown

### Common Settings (AC1, AC8)

**AC1: Configuration schema validates common settings**
```typescript
const commonConfigSchema = z.object({
  STORAGE_BACKEND: z.string().default("local"),
  STORAGE_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024), // 10MB
  STORAGE_QUOTA_BYTES: z.coerce.number().int().positive().default(1024 * 1024 * 1024), // 1GB
  STORAGE_SIGNED_URL_EXPIRATION_SECONDS: z.coerce.number().int().positive().default(15 * 60), // 15 minutes
});
```

**AC8: Default values are provided for common settings**
- `STORAGE_MAX_FILE_SIZE_BYTES`: 10MB (10485760 bytes)
- `STORAGE_QUOTA_BYTES`: 1GB (1073741824 bytes)
- `STORAGE_SIGNED_URL_EXPIRATION_SECONDS`: 900 seconds (15 minutes)

### Backend-Specific Settings (AC2)

**AC2: Configuration schema validates backend-specific settings**

Backend schemas are registered dynamically. Built-in schemas:

```typescript
// Local filesystem backend
const localConfigSchema = z.object({
  STORAGE_LOCAL_PATH: z.string().default("./storage/uploads"),
});

// S3-compatible backend
const s3ConfigSchema = z.object({
  STORAGE_S3_ENDPOINT: z.string().url().optional(), // Optional for AWS S3
  STORAGE_S3_REGION: z.string().min(1),
  STORAGE_S3_BUCKET: z.string().min(1),
  STORAGE_S3_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1),
});

// Azure Blob backend
const azureConfigSchema = z.object({
  STORAGE_AZURE_ACCOUNT_NAME: z.string().min(1),
  STORAGE_AZURE_ACCESS_KEY: z.string().min(1),
  STORAGE_AZURE_CONTAINER: z.string().min(1),
});

// GCS backend
const gcsConfigSchema = z.object({
  STORAGE_GCS_PROJECT_ID: z.string().min(1),
  STORAGE_GCS_BUCKET: z.string().min(1),
  STORAGE_GCS_KEY_FILE_PATH: z.string().optional(), // Optional for ADC
});

// Aliyun OSS backend
const aliyunConfigSchema = z.object({
  STORAGE_ALIYUN_REGION: z.string().min(1),
  STORAGE_ALIYUN_BUCKET: z.string().min(1),
  STORAGE_ALIYUN_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_ALIYUN_SECRET_ACCESS_KEY: z.string().min(1),
});
```

### Backend Validation (AC3)

**AC3: Configuration validates that selected backend has all required settings present**

The config system validates backend-specific config based on `STORAGE_BACKEND`:

```typescript
function loadConfig(): StorageConfig {
  // Parse common config first
  const commonConfig = commonConfigSchema.parse({
    STORAGE_BACKEND: process.env.STORAGE_BACKEND,
    STORAGE_MAX_FILE_SIZE_BYTES: process.env.STORAGE_MAX_FILE_SIZE_BYTES,
    STORAGE_QUOTA_BYTES: process.env.STORAGE_QUOTA_BYTES,
    STORAGE_SIGNED_URL_EXPIRATION_SECONDS: process.env.STORAGE_SIGNED_URL_EXPIRATION_SECONDS,
  });

  // Get backend-specific schema
  const backendSchema = getBackendConfigSchema(commonConfig.STORAGE_BACKEND);

  if (!backendSchema) {
    // No schema = validation passes (backend handles its own config)
    // OR throw if we want strict validation
    throw new ConfigurationError(
      `No configuration schema registered for backend: ${commonConfig.STORAGE_BACKEND}`,
      { backend: commonConfig.STORAGE_BACKEND }
    );
  }

  // Parse backend-specific config
  const backendConfig = backendSchema.parse(process.env);

  return {
    ...commonConfig,
    backend: backendConfig,
  };
}
```

### Error Messages (AC4)

**AC4: Missing or invalid configuration produces clear error messages**

Use Zod's error formatting to provide actionable messages:

```typescript
try {
  configInstance = loadConfig();
} catch (error) {
  if (error instanceof z.ZodError) {
    const issues = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ConfigurationError(
      `Invalid storage configuration: ${issues.map(i => `${i.field}: ${i.message}`).join('; ')}`,
      { issues }
    );
  }
  throw error;
}
```

Example error messages:
- "Invalid storage configuration: STORAGE_S3_BUCKET: Required"
- "Invalid storage configuration: STORAGE_S3_REGION: Required; STORAGE_S3_ACCESS_KEY_ID: Required"
- "Invalid storage configuration: STORAGE_MAX_FILE_SIZE_BYTES: Expected positive number, received -100"

### Lazy Loading (AC5)

**AC5: Configuration is lazy-loaded (not parsed until first access)**

Following `packages/ai/config.ts` pattern:

```typescript
let configInstance: StorageConfig | undefined;

function loadConfig(): StorageConfig {
  if (!configInstance) {
    configInstance = parseAndValidateConfig();
  }
  return configInstance;
}

export const storageConfig = new Proxy({} as StorageConfig, {
  get(_target, prop: keyof StorageConfig) {
    const config = loadConfig();
    return config[prop];
  },
});
```

### Test Reset (AC6)

**AC6: Tests can reset configuration state between test cases**

```typescript
export function resetStorageConfig(): void {
  configInstance = undefined;
}
```

### Extensibility (AC7)

**AC7: Configuration supports extensibility (new backends can define their config requirements)**

Backend config registry allows runtime registration:

```typescript
// config-registry.ts
const backendConfigSchemas = new Map<string, z.ZodSchema>();

export function registerBackendConfig(
  identifier: string,
  schema: z.ZodSchema
): void {
  backendConfigSchemas.set(identifier, schema);
}

export function getBackendConfigSchema(identifier: string): z.ZodSchema | undefined {
  return backendConfigSchemas.get(identifier);
}

export function isBackendConfigRegistered(identifier: string): boolean {
  return backendConfigSchemas.has(identifier);
}

export function resetConfigRegistry(): void {
  backendConfigSchemas.clear();
}
```

### Environment Variables (AC9)

**AC9: Environment variables are the primary configuration source**

All configuration comes from `process.env`. Environment variable naming convention:

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `STORAGE_BACKEND` | Backend identifier | `"local"` |
| `STORAGE_MAX_FILE_SIZE_BYTES` | Maximum file size in bytes | `10485760` (10MB) |
| `STORAGE_QUOTA_BYTES` | Storage quota in bytes | `1073741824` (1GB) |
| `STORAGE_SIGNED_URL_EXPIRATION_SECONDS` | Signed URL expiration | `900` (15min) |
| `STORAGE_LOCAL_PATH` | Local backend: storage directory | `"./storage/uploads"` |
| `STORAGE_S3_ENDPOINT` | S3 backend: endpoint URL | (AWS default) |
| `STORAGE_S3_REGION` | S3 backend: AWS region | Required |
| `STORAGE_S3_BUCKET` | S3 backend: bucket name | Required |
| `STORAGE_S3_ACCESS_KEY_ID` | S3 backend: access key | Required |
| `STORAGE_S3_SECRET_ACCESS_KEY` | S3 backend: secret key | Required |
| `STORAGE_AZURE_ACCOUNT_NAME` | Azure backend: account name | Required |
| `STORAGE_AZURE_ACCESS_KEY` | Azure backend: access key | Required |
| `STORAGE_AZURE_CONTAINER` | Azure backend: container name | Required |
| `STORAGE_GCS_PROJECT_ID` | GCS backend: project ID | Required |
| `STORAGE_GCS_BUCKET` | GCS backend: bucket name | Required |
| `STORAGE_GCS_KEY_FILE_PATH` | GCS backend: service account key file | Optional (ADC) |
| `STORAGE_ALIYUN_REGION` | Aliyun backend: region | Required |
| `STORAGE_ALIYUN_BUCKET` | Aliyun backend: bucket name | Required |
| `STORAGE_ALIYUN_ACCESS_KEY_ID` | Aliyun backend: access key | Required |
| `STORAGE_ALIYUN_SECRET_ACCESS_KEY` | Aliyun backend: secret | Required |

### Immutability (AC10)

**AC10: Configuration is read-only after initialization (immutable)**

The Proxy pattern ensures immutability:
- No setter is defined on the Proxy
- `configInstance` is module-private
- Once `loadConfig()` caches the config, it returns the same object

```typescript
export const storageConfig = new Proxy({} as StorageConfig, {
  get(_target, prop: keyof StorageConfig) {
    const config = loadConfig();
    return config[prop];
  },
  // No set trap = writes are not allowed
});
```

## Detailed Implementation

### ConfigurationError Class

```typescript
// packages/storage/src/errors.ts (addition)

/**
 * Error thrown when storage configuration validation fails.
 * Provides details about which configuration fields are missing or invalid.
 * Defaults to HTTP 500 Internal Server Error (configuration issue).
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string,
    details?: {
      issues?: Array<{ field: string; message: string }>;
      backend?: string;
    }
  ) {
    super(message, StorageErrorCode.CONFIGURATION_ERROR, 500, details);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

Add to `StorageErrorCode`:
```typescript
export const StorageErrorCode = {
  STORAGE_ERROR: "STORAGE_ERROR",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  BACKEND_NOT_REGISTERED: "BACKEND_NOT_REGISTERED",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR", // NEW
} as const;
```

### Config Registry

```typescript
// packages/storage/src/config-registry.ts

import type { ZodSchema } from "zod";

/**
 * Registry for backend-specific configuration schemas.
 * Backends register their config schemas to enable validation
 * when that backend is selected via STORAGE_BACKEND.
 */
const backendConfigSchemas = new Map<string, ZodSchema>();

/**
 * Register a configuration schema for a storage backend.
 *
 * When STORAGE_BACKEND matches the identifier, the corresponding
 * schema is used to validate backend-specific environment variables.
 *
 * Registration is idempotent - re-registering overwrites previous schema.
 *
 * @param identifier Backend identifier (e.g., "local", "s3", "azure")
 * @param schema Zod schema for validating backend-specific config
 *
 * @example
 * ```typescript
 * import { z } from "zod";
 * import { registerBackendConfig } from "@raptscallions/storage";
 *
 * const myBackendConfigSchema = z.object({
 *   STORAGE_MY_BACKEND_URL: z.string().url(),
 *   STORAGE_MY_BACKEND_API_KEY: z.string().min(1),
 * });
 *
 * registerBackendConfig("my-backend", myBackendConfigSchema);
 * ```
 */
export function registerBackendConfig(
  identifier: string,
  schema: ZodSchema
): void {
  backendConfigSchemas.set(identifier, schema);
}

/**
 * Get the configuration schema for a backend.
 *
 * @param identifier Backend identifier
 * @returns The registered schema, or undefined if not registered
 */
export function getBackendConfigSchema(
  identifier: string
): ZodSchema | undefined {
  return backendConfigSchemas.get(identifier);
}

/**
 * Check if a backend has a registered configuration schema.
 *
 * @param identifier Backend identifier
 * @returns true if schema is registered, false otherwise
 */
export function isBackendConfigRegistered(identifier: string): boolean {
  return backendConfigSchemas.has(identifier);
}

/**
 * Get list of all backends with registered config schemas.
 *
 * @returns Array of backend identifiers
 */
export function getRegisteredBackendConfigs(): string[] {
  return Array.from(backendConfigSchemas.keys());
}

/**
 * Clear all registered config schemas.
 * Used for testing to reset state between test cases.
 */
export function resetConfigRegistry(): void {
  backendConfigSchemas.clear();
}
```

### Configuration Module

```typescript
// packages/storage/src/config.ts

import { z } from "zod";

import { ConfigurationError, StorageErrorCode } from "./errors.js";
import {
  getBackendConfigSchema,
  isBackendConfigRegistered,
  registerBackendConfig,
} from "./config-registry.js";

/**
 * Common configuration schema applied to all storage backends.
 */
export const commonConfigSchema = z.object({
  /** Storage backend identifier (e.g., "local", "s3", "azure") */
  STORAGE_BACKEND: z.string().min(1).default("local"),
  /** Maximum file size in bytes (default: 10MB) */
  STORAGE_MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  /** Storage quota in bytes per user/group (default: 1GB) */
  STORAGE_QUOTA_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024 * 1024),
  /** Signed URL expiration in seconds (default: 15 minutes) */
  STORAGE_SIGNED_URL_EXPIRATION_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60),
});

export type CommonConfig = z.infer<typeof commonConfigSchema>;

/**
 * Built-in backend configuration schemas.
 * These are registered automatically when the config module is imported.
 */

/** Local filesystem backend config */
export const localConfigSchema = z.object({
  /** Directory path for file storage (default: ./storage/uploads) */
  STORAGE_LOCAL_PATH: z.string().default("./storage/uploads"),
});

export type LocalConfig = z.infer<typeof localConfigSchema>;

/** S3-compatible backend config */
export const s3ConfigSchema = z.object({
  /** S3-compatible endpoint URL (optional for AWS S3) */
  STORAGE_S3_ENDPOINT: z.string().url().optional(),
  /** AWS region (required) */
  STORAGE_S3_REGION: z.string().min(1, "S3 region is required"),
  /** S3 bucket name (required) */
  STORAGE_S3_BUCKET: z.string().min(1, "S3 bucket name is required"),
  /** AWS access key ID (required) */
  STORAGE_S3_ACCESS_KEY_ID: z.string().min(1, "S3 access key ID is required"),
  /** AWS secret access key (required) */
  STORAGE_S3_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "S3 secret access key is required"),
});

export type S3Config = z.infer<typeof s3ConfigSchema>;

/** Azure Blob Storage config */
export const azureConfigSchema = z.object({
  /** Azure storage account name (required) */
  STORAGE_AZURE_ACCOUNT_NAME: z
    .string()
    .min(1, "Azure account name is required"),
  /** Azure storage access key (required) */
  STORAGE_AZURE_ACCESS_KEY: z.string().min(1, "Azure access key is required"),
  /** Azure blob container name (required) */
  STORAGE_AZURE_CONTAINER: z.string().min(1, "Azure container name is required"),
});

export type AzureConfig = z.infer<typeof azureConfigSchema>;

/** Google Cloud Storage config */
export const gcsConfigSchema = z.object({
  /** GCP project ID (required) */
  STORAGE_GCS_PROJECT_ID: z.string().min(1, "GCS project ID is required"),
  /** GCS bucket name (required) */
  STORAGE_GCS_BUCKET: z.string().min(1, "GCS bucket name is required"),
  /** Path to service account key file (optional, uses ADC if not provided) */
  STORAGE_GCS_KEY_FILE_PATH: z.string().optional(),
});

export type GcsConfig = z.infer<typeof gcsConfigSchema>;

/** Aliyun OSS config */
export const aliyunConfigSchema = z.object({
  /** Aliyun OSS region (required) */
  STORAGE_ALIYUN_REGION: z.string().min(1, "Aliyun region is required"),
  /** Aliyun OSS bucket name (required) */
  STORAGE_ALIYUN_BUCKET: z.string().min(1, "Aliyun bucket name is required"),
  /** Aliyun access key ID (required) */
  STORAGE_ALIYUN_ACCESS_KEY_ID: z
    .string()
    .min(1, "Aliyun access key ID is required"),
  /** Aliyun secret access key (required) */
  STORAGE_ALIYUN_SECRET_ACCESS_KEY: z
    .string()
    .min(1, "Aliyun secret access key is required"),
});

export type AliyunConfig = z.infer<typeof aliyunConfigSchema>;

/**
 * Full storage configuration type.
 * Common config plus backend-specific config keyed by backend identifier.
 */
export interface StorageConfig extends CommonConfig {
  /** Backend-specific configuration (typed based on STORAGE_BACKEND) */
  backend: Record<string, unknown>;
}

/**
 * Register built-in backend config schemas.
 * Called on module load to ensure built-in backends have schemas available.
 */
function registerBuiltInConfigs(): void {
  registerBackendConfig("local", localConfigSchema);
  registerBackendConfig("s3", s3ConfigSchema);
  registerBackendConfig("azure", azureConfigSchema);
  registerBackendConfig("gcs", gcsConfigSchema);
  registerBackendConfig("aliyun", aliyunConfigSchema);
}

// Auto-register built-in configs on module load
registerBuiltInConfigs();

/**
 * Cached configuration instance.
 */
let configInstance: StorageConfig | undefined;

/**
 * Parse and validate storage configuration from environment variables.
 *
 * @returns Validated storage configuration
 * @throws ConfigurationError if validation fails
 */
function parseAndValidateConfig(): StorageConfig {
  try {
    // Parse common config first
    const commonConfig = commonConfigSchema.parse({
      STORAGE_BACKEND: process.env.STORAGE_BACKEND,
      STORAGE_MAX_FILE_SIZE_BYTES: process.env.STORAGE_MAX_FILE_SIZE_BYTES,
      STORAGE_QUOTA_BYTES: process.env.STORAGE_QUOTA_BYTES,
      STORAGE_SIGNED_URL_EXPIRATION_SECONDS:
        process.env.STORAGE_SIGNED_URL_EXPIRATION_SECONDS,
    });

    // Get backend-specific schema
    const backendSchema = getBackendConfigSchema(commonConfig.STORAGE_BACKEND);

    let backendConfig: Record<string, unknown> = {};

    if (backendSchema) {
      // Validate backend-specific config
      backendConfig = backendSchema.parse(process.env) as Record<
        string,
        unknown
      >;
    } else if (!isBackendConfigRegistered(commonConfig.STORAGE_BACKEND)) {
      // Backend has no registered schema - this could be:
      // 1. A custom backend that handles its own config (allowed)
      // 2. A typo in STORAGE_BACKEND (we should warn but not fail)
      // For now, allow unknown backends without schema (they handle their own config)
      // The backend registration (E05-T002a) will fail if the backend doesn't exist
    }

    return {
      ...commonConfig,
      backend: backendConfig,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => ({
        field: issue.path.join(".") || "(unknown)",
        message: issue.message,
      }));
      throw new ConfigurationError(
        `Invalid storage configuration: ${issues
          .map((i) => `${i.field}: ${i.message}`)
          .join("; ")}`,
        { issues }
      );
    }
    throw error;
  }
}

/**
 * Load configuration (lazy, cached).
 *
 * @returns Validated storage configuration
 * @throws ConfigurationError if validation fails
 */
function loadConfig(): StorageConfig {
  if (!configInstance) {
    configInstance = parseAndValidateConfig();
  }
  return configInstance;
}

/**
 * Reset configuration instance.
 * Used for testing to reset state between test cases.
 */
export function resetStorageConfig(): void {
  configInstance = undefined;
}

/**
 * Storage configuration with lazy initialization.
 *
 * Configuration is not parsed until first property access, avoiding
 * validation errors during test imports or when storage is not used.
 *
 * @example
 * ```typescript
 * import { storageConfig } from "@raptscallions/storage";
 *
 * // Config is parsed on first access
 * console.log(storageConfig.STORAGE_BACKEND); // "local"
 * console.log(storageConfig.STORAGE_MAX_FILE_SIZE_BYTES); // 10485760
 * ```
 */
export const storageConfig = new Proxy({} as StorageConfig, {
  get(_target, prop: string | symbol) {
    const config = loadConfig();
    return config[prop as keyof StorageConfig];
  },
});

/**
 * Get strongly-typed backend configuration.
 *
 * Use this when you need type-safe access to backend-specific config.
 *
 * @returns The backend-specific configuration object
 *
 * @example
 * ```typescript
 * // When STORAGE_BACKEND=s3
 * const s3Config = getBackendConfig<S3Config>();
 * console.log(s3Config.STORAGE_S3_BUCKET);
 * ```
 */
export function getBackendConfig<T extends Record<string, unknown>>(): T {
  const config = loadConfig();
  return config.backend as T;
}

/**
 * Re-export registerBuiltInConfigs for testing purposes.
 * Allows tests to re-register built-in configs after resetConfigRegistry().
 */
export { registerBuiltInConfigs };
```

### Updated Index Exports

```typescript
// packages/storage/src/index.ts (additions)

// ... existing exports ...

// Config registry exports
export {
  registerBackendConfig,
  getBackendConfigSchema,
  isBackendConfigRegistered,
  getRegisteredBackendConfigs,
  resetConfigRegistry,
} from "./config-registry.js";

// Config exports
export {
  storageConfig,
  resetStorageConfig,
  getBackendConfig,
  registerBuiltInConfigs,
  commonConfigSchema,
  localConfigSchema,
  s3ConfigSchema,
  azureConfigSchema,
  gcsConfigSchema,
  aliyunConfigSchema,
} from "./config.js";
export type {
  StorageConfig,
  CommonConfig,
  LocalConfig,
  S3Config,
  AzureConfig,
  GcsConfig,
  AliyunConfig,
} from "./config.js";

// Add ConfigurationError to error exports
export {
  StorageError,
  QuotaExceededError,
  FileNotFoundError,
  InvalidFileTypeError,
  BackendNotRegisteredError,
  ConfigurationError, // NEW
  StorageErrorCode,
} from "./errors.js";
```

## Edge Cases

1. **Missing STORAGE_BACKEND**: Defaults to `"local"` - local backend works with zero configuration.

2. **Unknown backend without schema**: If `STORAGE_BACKEND` is set to a value without a registered config schema, validation passes for the common config. The backend registration (from E05-T002a) will fail if the backend itself isn't registered.

3. **Empty string values**: Environment variables with empty strings (e.g., `STORAGE_S3_BUCKET=""`) will fail Zod's `min(1)` validation with a clear error message.

4. **Type coercion**: Numeric values use `z.coerce.number()` to handle string-to-number conversion from environment variables.

5. **Invalid URL format**: S3 endpoint validation uses `z.string().url()` which will reject malformed URLs.

6. **Negative numbers**: Numeric fields use `.positive()` to reject zero and negative values.

7. **Config accessed before backend registration**: If `storageConfig` is accessed before backend-specific schemas are registered (e.g., a custom backend), validation may pass with an empty `backend` object.

8. **Reset ordering**: Calling `resetStorageConfig()` clears the cached config but does NOT clear the config registry. Call `resetConfigRegistry()` separately if needed. Call both in test teardown to ensure clean state.

9. **Re-registration of built-in configs**: After calling `resetConfigRegistry()`, built-in configs (local, s3, etc.) are no longer registered. Call `registerBuiltInConfigs()` to re-register them if needed for tests.

10. **Concurrent access during lazy load**: JavaScript is single-threaded, so the lazy loading is atomic. No race conditions possible.

## Open Questions

### Q1: Should unknown backends (without registered config schema) fail validation?

**Recommendation: Allow unknown backends, do not fail validation.**

Rationale:
- Custom backends can handle their own configuration internally
- The backend factory registration (E05-T002a) will fail if the backend doesn't exist
- Strict validation would require all backends to register config schemas even if they don't need config
- Matches the flexibility of the plugin system

Counter-argument: Strict validation could catch typos in `STORAGE_BACKEND` earlier.

### Q2: Should common config values be validated against backend-specific constraints?

**Recommendation: No, keep validation separate.**

For example, S3 might support larger files than local storage. But:
- Backend implementations should validate their own limits
- Common config provides system-wide defaults that backends can override
- Keeps config validation simple and fast

### Q3: Should the config module export individual getter functions or use the Proxy only?

**Recommendation: Export both Proxy and `getBackendConfig<T>()` helper.**

- Proxy provides natural property access: `storageConfig.STORAGE_BACKEND`
- `getBackendConfig<T>()` provides type-safe access to backend-specific config
- Both patterns have legitimate use cases

## Design Rationale: Out of Scope Decisions

This section documents why certain features are intentionally deferred and confirms they won't create tech debt.

### Out of Scope Items Analysis

| Deferred Feature | Tech Debt Risk | Rationale |
|------------------|----------------|-----------|
| **Runtime config updates** | Low | Config-as-env-vars is standard practice. Adding hot-reload later is an additive change, not a refactor. The Proxy pattern already isolates config access. |
| **Configuration UI** | None | This is a feature, not debt. The backend API can stay the same when UI is added. |
| **Secrets management** | Medium | Addressed separately - see E04-T012-15 for encrypted credential storage. Storage backend secrets remain in env vars as they are system-wide, not per-tenant. |
| **Config persistence to database** | Low | If per-group storage is needed later (each school has own bucket), that's an additive feature similar to E04-T012-15 for AI credentials. |

### Relationship to E04-T012-15 (AI Credential Encryption)

**No overlap or conflict** - these are complementary but distinct:

| System | What It Does | Secrets Handled | Scope |
|--------|--------------|-----------------|-------|
| **E04-T012-15** | Per-group AI API keys stored encrypted in DB | `sk-or-v1-xxxxx` (OpenRouter keys) | Per-tenant |
| **E05-T002b** | Storage backend credentials from env vars | `STORAGE_S3_SECRET_ACCESS_KEY`, etc. | System-wide |

**Key distinction**: E04 stores secrets **per-group** in the database (so each school can bring their own AI key). E05 is **system-wide** storage config (one S3 bucket for the whole deployment).

**Future alignment**: If per-group storage buckets are ever needed (each school has own S3 bucket), that would be a new feature set similar in scope to E04-T012-15. This is planned extensibility, not tech debt.

### Can Storage Backend Be Changed After Deployment?

| Scenario | Answer |
|----------|--------|
| **Before first deployment** | Yes, just change `.env` |
| **After deployment with data** | Yes, but requires **data migration** |

The config itself can always be changed by editing `.env` and restarting. However, if files exist in S3 and you switch to Azure, those files don't automatically move - a migration script would be needed. This is an operational concern, not a code limitation.

**The code is already backend-agnostic** - the `StorageBackend` interface (E05-T002a) ensures application code doesn't know or care which backend is active.

### No Ticking Time Bombs

The design is additive-friendly:
1. **Backend-agnostic interface** (E05-T002a) means application code is isolated from backend choice
2. **Plugin registry** means new backends can be added without touching existing code
3. **Lazy config loading** means env vars are read at runtime, not compile time
4. **Config registry** allows backends to define their own config schemas

---

## KB Documentation Note

> **For Writer Agent**: After this task is complete, add a KB article at `apps/docs/src/storage/concepts/configuration.md` covering:
> - How storage configuration works (lazy loading, env vars, backend selection)
> - Environment variable reference table
> - How to add custom backend config schemas
> - Relationship to AI credential encryption (E04) - when to use each approach
> - Backend switching and data migration considerations
>
> **Note**: For detailed rationale on out-of-scope decisions and tech debt analysis, reference this spec directly rather than duplicating the explanation in the KB. Link to E04-T012 for the per-tenant credential pattern.

---

## Summary

This spec establishes the configuration system for storage backends that:
1. Uses lazy Proxy-based loading matching `packages/ai/config.ts`
2. Validates common settings with sensible defaults
3. Validates backend-specific settings based on registered schemas
4. Provides extensibility through the config registry
5. Produces clear error messages for invalid configuration
6. Supports testing through resetable state

The implementation follows existing patterns from the AI package and integrates with the E05-T002a plugin system.

---

## Architecture Review

**Reviewer**: Architect Agent
**Date**: 2026-01-16
**Verdict**: ✅ APPROVED

### Checklist

| Criteria | Status | Notes |
|----------|--------|-------|
| Technology Stack Compliance | ✅ Pass | Uses Zod for validation, lazy Proxy pattern matches `packages/ai/config.ts` |
| Pattern Consistency | ✅ Pass | Follows established lazy-loading pattern exactly, config registry matches plugin registry pattern from E05-T002a |
| Error Handling | ✅ Pass | ConfigurationError extends AppError with correct HTTP 500 status code |
| TypeScript Strictness | ✅ Pass | No `any` types, uses `unknown` and type inference from Zod schemas |
| Extensibility | ✅ Pass | Config registry allows third-party backends to define their config requirements |
| Testability | ✅ Pass | Reset functions provided for both config and registry state |
| Dependency Direction | ✅ Pass | E05-T002b depends on E05-T002a (plugin system), correctly ordered |
| File Naming | ✅ Pass | `config.ts`, `config-registry.ts`, tests in `__tests__/` |

### Findings

**Strengths:**

1. **Exact Pattern Match**: The spec correctly replicates the `packages/ai/config.ts` pattern, ensuring consistency across the codebase.
2. **Discriminated Union Approach**: Using `STORAGE_BACKEND` to select which backend-specific schema to validate is clean and type-safe.
3. **Comprehensive Error Messages**: Zod error formatting provides actionable messages like "STORAGE_S3_BUCKET: Required".
4. **Test Reset Ordering**: Explicitly documents that `resetStorageConfig()` and `resetConfigRegistry()` are independent operations.
5. **Out of Scope Analysis**: Excellently documents why deferred features won't create tech debt and clarifies relationship with E04-T012-15.

**Concern Addressed (Unknown Backend Behavior):**

The spec allows unknown backends to pass validation silently. This is acceptable because:
- The backend factory (E05-T002a) will fail with clear `BackendNotRegisteredError`
- Custom backends may legitimately skip config registration
- Strict validation would burden trivial backends unnecessarily

**Minor Recommendations:**

1. Add type guard for symbol props in Proxy getter to avoid potential edge cases.
2. Ensure `CONFIGURATION_ERROR` is added to `StorageErrorCode` atomically with errors.ts update.
3. Consider optional runtime validation in `getBackendConfig<T>()` helper.

### Decision

**APPROVED** - The implementation spec is architecturally sound, correctly follows established patterns, integrates properly with E05-T002a, and provides appropriate extensibility for third-party backends.
