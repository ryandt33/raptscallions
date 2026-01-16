/**
 * S3-compatible storage backend implementation.
 *
 * Implements IStorageBackend for AWS S3 and S3-compatible services
 * (MinIO, DigitalOcean Spaces, Backblaze B2, etc.).
 *
 * Uses dependency injection for the S3Client to enable unit testing
 * without module mocking.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getBackendConfig, storageConfig, type S3Config } from "../config.js";
import { FileNotFoundError, StorageError } from "../errors.js";

import type {
  IStorageBackend,
  SignedUrl,
  SignedUrlOptions,
  UploadParams,
  UploadResult,
} from "../types.js";
import type { Readable } from "node:stream";


/**
 * Type for a presigner function that generates signed URLs.
 * Used for dependency injection in tests.
 */
export type PresignerFunction = (
  client: S3Client,
  command: GetObjectCommand | PutObjectCommand,
  options: { expiresIn: number }
) => Promise<string>;

/**
 * Configuration options for S3StorageBackend.
 */
export interface S3StorageBackendOptions {
  /** Default signed URL expiration in seconds */
  signedUrlExpiration?: number;
  /** Custom presigner function (for testing) */
  presigner?: PresignerFunction;
}

/**
 * S3-compatible storage backend.
 *
 * Implements the IStorageBackend interface for S3-compatible storage services.
 * Receives an S3Client instance via dependency injection for testability.
 *
 * @example
 * ```typescript
 * // Production usage via factory
 * const backend = createS3Backend();
 *
 * // Testing with mock client
 * const mockClient = { send: vi.fn() };
 * const backend = new S3StorageBackend(mockClient, "test-bucket");
 * ```
 */
export class S3StorageBackend implements IStorageBackend {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultExpiration: number;
  private readonly presigner: PresignerFunction;

  constructor(
    client: S3Client,
    bucket: string,
    options?: S3StorageBackendOptions
  ) {
    this.client = client;
    this.bucket = bucket;
    this.defaultExpiration = options?.signedUrlExpiration ?? 900; // 15 minutes
    this.presigner = options?.presigner ?? awsGetSignedUrl;
  }

  /**
   * Upload a file to S3.
   *
   * Supports both Buffer and Readable stream bodies.
   * For streams, contentLength should be provided for optimal performance.
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
      Metadata: params.metadata,
    });

    try {
      const response = await this.client.send(command);
      const result: UploadResult = {
        key: params.key,
      };
      if (response.ETag) {
        result.etag = response.ETag;
      }
      return result;
    } catch (error) {
      this.handleError(error, params.key);
    }
  }

  /**
   * Download a file from S3.
   *
   * Returns a Readable stream of the file contents.
   * Throws FileNotFoundError if the file doesn't exist.
   */
  async download(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new FileNotFoundError(key);
      }

      return response.Body as Readable;
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        throw error;
      }
      this.handleError(error, key);
    }
  }

  /**
   * Delete a file from S3.
   *
   * This operation is idempotent - deleting a non-existent file
   * succeeds silently (no error thrown).
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      // S3 delete is idempotent - NoSuchKey errors are not errors
      if (this.isNotFoundError(error)) {
        return;
      }
      this.handleError(error, key);
    }
  }

  /**
   * Check if a file exists in S3.
   *
   * Uses HeadObject to check existence without downloading the file.
   * Returns false for missing files, throws StorageError for other failures.
   */
  async exists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      this.handleError(error, key);
    }
  }

  /**
   * Generate a signed URL for temporary file access.
   *
   * Can generate URLs for both GET (download) and PUT (upload) operations.
   * Does NOT verify that the object exists - signed URLs can be generated
   * for non-existent objects (errors occur when the URL is used).
   */
  async getSignedUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrl> {
    const expiresIn = options?.expiresIn ?? this.defaultExpiration;

    const command =
      options?.method === "PUT"
        ? new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: options?.contentType,
          })
        : new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });

    const url = await this.presigner(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return { url, expiresAt };
  }

  /**
   * Check if an error indicates "not found".
   */
  private isNotFoundError(error: unknown): boolean {
    if (error instanceof Error && "name" in error) {
      return error.name === "NoSuchKey" || error.name === "NotFound";
    }
    return false;
  }

  /**
   * Convert S3 errors to storage-specific errors.
   *
   * Handles common S3 error types and converts them to appropriate
   * storage error classes with useful context.
   */
  private handleError(error: unknown, key: string): never {
    if (error instanceof Error) {
      // Check for "NoSuchKey" error code
      if (error.name === "NoSuchKey") {
        throw new FileNotFoundError(key);
      }

      // Check for "NotFound" (HeadObject uses this)
      if (error.name === "NotFound") {
        throw new FileNotFoundError(key);
      }

      // Network/connection errors
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND")
      ) {
        throw new StorageError(`Storage service unavailable: ${error.message}`, {
          key,
          originalError: error.message,
        });
      }

      // Credential errors (don't expose keys)
      if (
        error.name === "CredentialsProviderError" ||
        error.name === "InvalidAccessKeyId" ||
        error.name === "SignatureDoesNotMatch"
      ) {
        throw new StorageError("Storage authentication failed", { key });
      }

      // Generic S3 error
      throw new StorageError(`Storage operation failed: ${error.message}`, {
        key,
        originalError: error.message,
      });
    }

    throw new StorageError("Unknown storage error", { key });
  }
}

/**
 * Create an S3StorageBackend instance using configuration from environment.
 *
 * This factory function reads S3 configuration from environment variables
 * and creates a properly configured S3StorageBackend instance.
 *
 * Use this for production code. For testing, inject a mock S3Client directly
 * into the S3StorageBackend constructor.
 *
 * @returns Configured S3StorageBackend instance
 * @throws ConfigurationError if required S3 configuration is missing
 *
 * @example
 * ```typescript
 * // Register the backend factory
 * registerBackend("s3", createS3Backend);
 *
 * // Or use directly
 * const backend = createS3Backend();
 * await backend.upload({ key: "files/doc.pdf", body: buffer, contentType: "application/pdf" });
 * ```
 */
export function createS3Backend(): S3StorageBackend {
  const s3Config = getBackendConfig<S3Config>();

  // Build S3Client config, only including endpoint if provided
  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: s3Config.STORAGE_S3_REGION,
    credentials: {
      accessKeyId: s3Config.STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: s3Config.STORAGE_S3_SECRET_ACCESS_KEY,
    },
    // Enable path-style URLs for MinIO and custom endpoints
    forcePathStyle: !!s3Config.STORAGE_S3_ENDPOINT,
  };

  // Only set endpoint if provided (for MinIO/custom S3-compatible services)
  if (s3Config.STORAGE_S3_ENDPOINT) {
    clientConfig.endpoint = s3Config.STORAGE_S3_ENDPOINT;
  }

  const client = new S3Client(clientConfig);

  return new S3StorageBackend(client, s3Config.STORAGE_S3_BUCKET, {
    signedUrlExpiration: storageConfig.STORAGE_SIGNED_URL_EXPIRATION_SECONDS,
  });
}
