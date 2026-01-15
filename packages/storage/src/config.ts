/**
 * Storage configuration system
 *
 * Zod-based configuration system with lazy loading via Proxy pattern,
 * backend-specific validation, and clear error messages.
 *
 * Configuration is not parsed until first property access, avoiding
 * validation errors during test imports or when storage is not used.
 */

import { z } from "zod";

import {
  getBackendConfigSchema,
  registerBackendConfig,
} from "./config-registry.js";
import { ConfigurationError } from "./errors.js";

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
  STORAGE_AZURE_CONTAINER: z
    .string()
    .min(1, "Azure container name is required"),
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
 * Called to ensure built-in backends have schemas available.
 */
export function registerBuiltInConfigs(): void {
  registerBackendConfig("local", localConfigSchema);
  registerBackendConfig("s3", s3ConfigSchema);
  registerBackendConfig("azure", azureConfigSchema);
  registerBackendConfig("gcs", gcsConfigSchema);
  registerBackendConfig("aliyun", aliyunConfigSchema);
}

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
    }
    // If no schema is registered, allow the backend to handle its own config.
    // The backend registration (E05-T002a) will fail if the backend doesn't exist.

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
    // Handle symbol properties (like Symbol.toStringTag) gracefully
    if (typeof prop === "symbol") {
      return undefined;
    }
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
