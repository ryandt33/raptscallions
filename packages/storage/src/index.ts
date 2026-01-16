/**
 * @raptscallions/storage - Storage backend abstraction layer
 *
 * This package provides a typed interface for storage backends with a plugin
 * registration system that allows third parties to add custom storage backends
 * without modifying package code.
 *
 * @example
 * ```typescript
 * import {
 *   registerBackend,
 *   getBackend,
 *   type IStorageBackend,
 *   type UploadParams,
 * } from "@raptscallions/storage";
 *
 * // Register a backend
 * registerBackend("local", () => new LocalStorageBackend("/uploads"));
 *
 * // Get and use the backend
 * const storage = getBackend("local");
 * await storage.upload({
 *   key: "file.pdf",
 *   body: fileBuffer,
 *   contentType: "application/pdf",
 * });
 * ```
 */

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
  ConfigurationError,
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

// Backend implementations
export { S3StorageBackend, createS3Backend } from "./backends/index.js";
export type {
  S3StorageBackendOptions,
  PresignerFunction,
} from "./backends/index.js";
