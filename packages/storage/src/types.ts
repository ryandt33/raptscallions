/**
 * Storage backend type definitions.
 * Defines the contract for storage backends and supporting types.
 */

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
export type BackendFactory<T extends IStorageBackend = IStorageBackend> =
  () => T;
