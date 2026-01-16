/**
 * Storage backend implementations.
 *
 * Re-exports backend classes and factory functions for external use.
 */

// S3-compatible storage backend
export {
  S3StorageBackend,
  createS3Backend,
  type S3StorageBackendOptions,
  type PresignerFunction,
} from "./s3.backend.js";
