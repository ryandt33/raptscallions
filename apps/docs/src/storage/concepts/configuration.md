---
title: Configuration
description: Environment variables and Zod-based validation for storage backend settings
related_code:
  - packages/storage/src/config.ts
  - packages/storage/src/config-registry.ts
implements_task: E05-T002b
last_verified: 2026-01-16
---

# Configuration

The storage package uses a Zod-based configuration system with lazy loading via Proxy pattern (matching `packages/ai/config.ts`). Configuration validates common settings and backend-specific requirements from environment variables.

## Lazy Configuration Loading

Configuration is not parsed until first property access, avoiding validation errors during test imports:

```typescript
import { storageConfig } from "@raptscallions/storage";

// Config is parsed on first access
console.log(storageConfig.STORAGE_BACKEND); // "local"
console.log(storageConfig.STORAGE_MAX_FILE_SIZE_BYTES); // 10485760 (10MB)
```

## Environment Variables

### Common Settings

These apply to all storage backends:

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_BACKEND` | Backend identifier | `"local"` |
| `STORAGE_MAX_FILE_SIZE_BYTES` | Maximum file size | `10485760` (10MB) |
| `STORAGE_QUOTA_BYTES` | Storage quota per user/group | `1073741824` (1GB) |
| `STORAGE_SIGNED_URL_EXPIRATION_SECONDS` | Signed URL expiration | `900` (15min) |

### Backend-Specific Settings

These are validated when the corresponding backend is selected via `STORAGE_BACKEND`:

**Local Filesystem:**
| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_LOCAL_PATH` | Storage directory | `"./storage/uploads"` |

**S3-Compatible:**
| Variable | Description | Required |
|----------|-------------|----------|
| `STORAGE_S3_ENDPOINT` | Endpoint URL (optional for AWS S3) | No |
| `STORAGE_S3_REGION` | AWS region | Yes |
| `STORAGE_S3_BUCKET` | Bucket name | Yes |
| `STORAGE_S3_ACCESS_KEY_ID` | Access key ID | Yes |
| `STORAGE_S3_SECRET_ACCESS_KEY` | Secret access key | Yes |

**Azure Blob:**
| Variable | Description | Required |
|----------|-------------|----------|
| `STORAGE_AZURE_ACCOUNT_NAME` | Account name | Yes |
| `STORAGE_AZURE_ACCESS_KEY` | Access key | Yes |
| `STORAGE_AZURE_CONTAINER` | Container name | Yes |

**Google Cloud Storage:**
| Variable | Description | Required |
|----------|-------------|----------|
| `STORAGE_GCS_PROJECT_ID` | Project ID | Yes |
| `STORAGE_GCS_BUCKET` | Bucket name | Yes |
| `STORAGE_GCS_KEY_FILE_PATH` | Service account key file | No (uses ADC) |

**Aliyun OSS:**
| Variable | Description | Required |
|----------|-------------|----------|
| `STORAGE_ALIYUN_REGION` | Region | Yes |
| `STORAGE_ALIYUN_BUCKET` | Bucket name | Yes |
| `STORAGE_ALIYUN_ACCESS_KEY_ID` | Access key ID | Yes |
| `STORAGE_ALIYUN_SECRET_ACCESS_KEY` | Secret access key | Yes |

## Config Registry for Extensibility

Backends can register their configuration schemas for validation:

```typescript
import { z } from "zod";
import { registerBackendConfig } from "@raptscallions/storage";

// Register custom backend config schema
const myBackendConfigSchema = z.object({
  STORAGE_MY_BACKEND_URL: z.string().url(),
  STORAGE_MY_BACKEND_API_KEY: z.string().min(1),
});

registerBackendConfig("my-backend", myBackendConfigSchema);
```

Built-in backends (local, s3, azure, gcs, aliyun) are registered automatically on module load.

### Config Registry API

```typescript
// Register backend config schema
registerBackendConfig(identifier: string, schema: ZodSchema): void

// Get registered schema
getBackendConfigSchema(identifier: string): ZodSchema | undefined

// Check if backend has registered config
isBackendConfigRegistered(identifier: string): boolean

// List all registered backend configs
getRegisteredBackendConfigs(): string[]

// Clear registry (for testing)
resetConfigRegistry(): void
```

## Typed Backend Config Access

```typescript
import { getBackendConfig, type S3Config } from "@raptscallions/storage";

// When STORAGE_BACKEND=s3
const s3Config = getBackendConfig<S3Config>();
console.log(s3Config.STORAGE_S3_BUCKET);
```

## Configuration Errors

Invalid configuration produces clear error messages via `ConfigurationError`:

```typescript
import { ConfigurationError } from "@raptscallions/storage";

// Missing required field
// Error: "Invalid storage configuration: STORAGE_S3_BUCKET: S3 bucket name is required"

// Invalid value
// Error: "Invalid storage configuration: STORAGE_MAX_FILE_SIZE_BYTES: Expected positive number"
```

## Testing Configuration

Reset config state between tests to ensure isolation:

```typescript
import {
  resetStorageConfig,
  resetConfigRegistry,
  registerBuiltInConfigs,
} from "@raptscallions/storage";

beforeEach(() => {
  // Reset both config and registry
  resetStorageConfig();
  resetConfigRegistry();

  // Re-register built-in configs if needed
  registerBuiltInConfigs();

  // Set test environment
  process.env.STORAGE_BACKEND = "local";
});

afterEach(() => {
  resetStorageConfig();
  resetConfigRegistry();
});
```

::: warning Reset Order
`resetStorageConfig()` clears the cached config but does NOT clear the config registry. Call `resetConfigRegistry()` separately to clear registered schemas. After clearing the registry, call `registerBuiltInConfigs()` to re-register built-in backend schemas.
:::

## Related Pages

**Related Documentation:**
- [Backend Interface](/storage/concepts/backend-interface) — The `IStorageBackend` contract and plugin registry
- [Custom Backends](/storage/patterns/custom-backends) — How to implement your own storage backend

**Implementation:**
- [E05-T002b: Storage configuration system with validation](/backlog/tasks/E05/E05-T002b.md) ([spec](/backlog/docs/specs/E05/E05-T002b-spec.md), [code review](/backlog/docs/reviews/E05/E05-T002b-code-review.md), [integration report](/backlog/docs/reviews/E05/E05-T002b-integration-report.md))

**Source Files:**
- [config.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/config.ts) — Configuration schemas and lazy loading
- [config-registry.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/config-registry.ts) — Backend config schema registry
