---
title: Custom Backends
description: How to implement your own storage backend
related_code:
  - packages/storage/src/types.ts
  - packages/storage/src/registry.ts
  - packages/storage/src/config-registry.ts
last_verified: 2026-01-16
---

# Custom Backends

This guide explains how to implement a custom storage backend that integrates with the RaptScallions storage system.

## Overview

To create a new storage backend:

1. Implement the `IStorageBackend` interface
2. Register with a unique identifier
3. Optionally register a config schema for validation
4. Handle all error cases with appropriate error types

## Implementation

```typescript
import type {
  IStorageBackend,
  UploadParams,
  UploadResult,
  SignedUrl,
  SignedUrlOptions,
} from "@raptscallions/storage";
import { StorageError, FileNotFoundError } from "@raptscallions/storage";
import type { Readable } from "stream";

interface MyBackendConfig {
  apiKey: string;
  baseUrl: string;
}

class MyCustomBackend implements IStorageBackend {
  constructor(private config: MyBackendConfig) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    try {
      // Your upload implementation...
      return { key: params.key };
    } catch (error) {
      throw new StorageError("Upload failed", { cause: error });
    }
  }

  async download(key: string): Promise<Readable> {
    const exists = await this.exists(key);
    if (!exists) {
      throw new FileNotFoundError(key);
    }
    // Return a readable stream...
  }

  async delete(key: string): Promise<void> {
    // Your delete implementation...
  }

  async exists(key: string): Promise<boolean> {
    // Your exists check implementation...
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<SignedUrl> {
    // Your signed URL implementation...
    return {
      url: `${this.config.baseUrl}/signed/${key}`,
      expiresAt: new Date(Date.now() + (options?.expiresIn ?? 900) * 1000).toISOString(),
    };
  }
}
```

## Registration

Register your backend at application startup:

```typescript
import { registerBackend } from "@raptscallions/storage";

registerBackend("custom", () => new MyCustomBackend({
  apiKey: process.env.CUSTOM_STORAGE_API_KEY!,
  baseUrl: process.env.CUSTOM_STORAGE_BASE_URL!,
}));
```

## Configuration Schema (Optional)

For automatic validation of environment variables, register a config schema:

```typescript
import { z } from "zod";
import { registerBackendConfig } from "@raptscallions/storage";

const myBackendConfigSchema = z.object({
  CUSTOM_STORAGE_API_KEY: z.string().min(1, "API key is required"),
  CUSTOM_STORAGE_BASE_URL: z.string().url("Must be a valid URL"),
});

registerBackendConfig("custom", myBackendConfigSchema);
```

When `STORAGE_BACKEND=custom`, the storage config system will validate these environment variables before the backend is instantiated.

## Error Handling

Use the appropriate error types for different failure modes:

| Error Type | When to Use |
|------------|-------------|
| `StorageError` | Generic failures (network, permissions, service down) |
| `FileNotFoundError` | File doesn't exist (download, delete, exists returning false then accessed) |
| `QuotaExceededError` | Storage quota would be exceeded |
| `InvalidFileTypeError` | MIME type not allowed |

```typescript
import {
  StorageError,
  FileNotFoundError,
  QuotaExceededError,
} from "@raptscallions/storage";

// Network or service failure
throw new StorageError("Connection timeout", { cause: originalError });

// File not found
throw new FileNotFoundError("uploads/missing.pdf");

// Quota exceeded
throw new QuotaExceededError("Storage quota exceeded", {
  currentUsage: 1073741824,
  quotaLimit: 1073741824,
  requestedSize: 10485760,
});
```

## Testing Your Backend

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  registerBackend,
  getBackend,
  resetAll,
  registerBackendConfig,
  resetConfigRegistry,
} from "@raptscallions/storage";

describe("MyCustomBackend", () => {
  beforeEach(() => {
    resetAll();
    resetConfigRegistry();

    // Register your backend
    registerBackend("custom", () => new MyCustomBackend({
      apiKey: "test-key",
      baseUrl: "https://test.example.com",
    }));
  });

  afterEach(() => {
    resetAll();
    resetConfigRegistry();
  });

  it("should upload files", async () => {
    const storage = getBackend("custom");
    const result = await storage.upload({
      key: "test/file.txt",
      body: Buffer.from("hello"),
      contentType: "text/plain",
    });
    expect(result.key).toBe("test/file.txt");
  });

  it("should throw FileNotFoundError for missing files", async () => {
    const storage = getBackend("custom");
    await expect(storage.download("nonexistent.txt"))
      .rejects.toThrow(FileNotFoundError);
  });
});
```

## Related Pages

**Related Documentation:**
- [Backend Interface](/storage/concepts/backend-interface) — The `IStorageBackend` contract and registry API
- [Configuration](/storage/concepts/configuration) — Config registry for custom backend validation

**Source Files:**
- [types.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/types.ts) — Interface definitions
- [registry.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/registry.ts) — Plugin registration
- [config-registry.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/storage/src/config-registry.ts) — Config schema registration
