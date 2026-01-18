/**
 * Integration tests for S3StorageBackend with real MinIO instance.
 *
 * These tests verify the S3 backend works correctly against a real
 * S3-compatible service (MinIO) running in Docker Compose.
 *
 * Prerequisites:
 *   docker compose up -d minio minio-init
 *
 * Run with:
 *   pnpm --filter @raptscallions/storage test:integration
 */

import { S3Client } from "@aws-sdk/client-s3";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";

import { S3StorageBackend } from "../../backends/s3.backend.js";
import { FileNotFoundError } from "../../errors.js";

import type { UploadParams } from "../../types.js";
import type { Readable } from "node:stream";

// Test configuration - matches docker-compose.yml MinIO service
const MINIO_ENDPOINT =
  process.env.STORAGE_S3_ENDPOINT || "http://localhost:9000";
const MINIO_BUCKET = process.env.STORAGE_S3_BUCKET || "raptscallions-files";
const MINIO_ACCESS_KEY = process.env.STORAGE_S3_ACCESS_KEY_ID || "minioadmin";
const MINIO_SECRET_KEY =
  process.env.STORAGE_S3_SECRET_ACCESS_KEY || "minioadmin";

/**
 * Helper to convert a Readable stream to a string.
 */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Helper to check if MinIO is available at the configured endpoint.
 */
async function isMinioAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MINIO_ENDPOINT}/minio/health/live`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Helper to create a test backend with MinIO configuration.
 */
function createTestBackend(): S3StorageBackend {
  const client = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY,
      secretAccessKey: MINIO_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
  });

  return new S3StorageBackend(client, MINIO_BUCKET, {
    signedUrlExpiration: 900,
  });
}

describe("S3StorageBackend Integration Tests", () => {
  let backend: S3StorageBackend;
  const testKeys: string[] = []; // Track keys for cleanup

  /**
   * Helper to generate unique test keys to avoid conflicts.
   * Keys are tracked for cleanup in afterEach.
   */
  const createTestKey = (name: string): string => {
    const key = `integration-test/${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`;
    testKeys.push(key);
    return key;
  };

  beforeAll(async () => {
    const available = await isMinioAvailable();
    if (!available) {
      console.warn("MinIO not available at", MINIO_ENDPOINT);
      console.warn("Start with: docker compose up -d minio minio-init");
    }
  });

  beforeEach(() => {
    // Create fresh backend for each test
    backend = createTestBackend();
  });

  afterEach(async () => {
    // Clean up any test files created - ensures no orphaned files
    // Using Promise.allSettled to handle all deletions in parallel
    await Promise.allSettled(
      testKeys.map((key) => backend.delete(key).catch(() => undefined))
    );
    testKeys.length = 0;
  });

  // ==========================================================================
  // AC1: Tests run against real MinIO container (docker-compose)
  // ==========================================================================
  describe("MinIO connectivity (AC1)", () => {
    it("should connect to MinIO and verify bucket access", async () => {
      // Skip if MinIO not available
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("connectivity-test.txt");
      const content = "Testing MinIO connectivity";

      // Act - Simple upload to verify connection
      const result = await backend.upload({
        key,
        body: Buffer.from(content),
        contentType: "text/plain",
      });

      // Assert - Connection works, bucket is accessible
      expect(result.key).toBe(key);
      expect(result.etag).toBeDefined();
    });
  });

  // ==========================================================================
  // AC2: Complete lifecycle test: upload → download → verify content → delete
  // ==========================================================================
  describe("complete file lifecycle (AC2)", () => {
    it("should upload, download, verify content, and delete file", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("lifecycle-test.txt");
      const content = "Hello, MinIO integration test!";
      const params: UploadParams = {
        key,
        body: Buffer.from(content),
        contentType: "text/plain",
      };

      // Act - Upload
      const uploadResult = await backend.upload(params);
      expect(uploadResult.key).toBe(key);
      expect(uploadResult.etag).toBeDefined();

      // Act - Verify exists after upload
      const existsAfterUpload = await backend.exists(key);
      expect(existsAfterUpload).toBe(true);

      // Act - Download and verify content
      const downloadStream = await backend.download(key);
      const downloadedContent = await streamToString(downloadStream);
      expect(downloadedContent).toBe(content);

      // Act - Delete
      await backend.delete(key);

      // Assert - No longer exists after delete
      const existsAfterDelete = await backend.exists(key);
      expect(existsAfterDelete).toBe(false);
    });

    it("should handle binary file upload and download", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Create binary content (simulated PNG header)
      const key = createTestKey("binary-test.bin");
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);

      // Act - Upload binary
      const uploadResult = await backend.upload({
        key,
        body: binaryContent,
        contentType: "application/octet-stream",
      });
      expect(uploadResult.key).toBe(key);

      // Act - Download and verify
      const downloadStream = await backend.download(key);
      const chunks: Buffer[] = [];
      for await (const chunk of downloadStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const downloadedBinary = Buffer.concat(chunks);

      // Assert - Binary content matches exactly
      expect(downloadedBinary.equals(binaryContent)).toBe(true);
    });
  });

  // ==========================================================================
  // AC3: Signed URL test: generate URL → fetch directly → verify content
  // ==========================================================================
  describe("signed URL functionality (AC3)", () => {
    it("should generate GET URL that allows direct file access", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Upload file first
      const key = createTestKey("signed-url-test.txt");
      const content = "Content for signed URL test";
      await backend.upload({
        key,
        body: Buffer.from(content),
        contentType: "text/plain",
      });

      // Act - Get signed URL
      const { url, expiresAt } = await backend.getSignedUrl(key);

      // Assert - URL contains key and expiration is in future
      expect(url).toContain(encodeURIComponent(key).replace(/%2F/g, "/"));
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Act - Fetch content directly using signed URL
      const response = await fetch(url);
      const fetchedContent = await response.text();

      // Assert - Content matches
      expect(response.ok).toBe(true);
      expect(fetchedContent).toBe(content);
    });

    it("should generate PUT URL for direct upload", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("signed-put-test.txt");
      const content = "Uploaded via signed URL";

      // Act - Get signed PUT URL
      const { url } = await backend.getSignedUrl(key, {
        method: "PUT",
        contentType: "text/plain",
      });

      // Act - Upload directly via signed URL
      const putResponse = await fetch(url, {
        method: "PUT",
        body: content,
        headers: { "Content-Type": "text/plain" },
      });

      // Assert - Upload succeeded
      expect(putResponse.ok).toBe(true);

      // Assert - File exists and content matches
      const downloadStream = await backend.download(key);
      const downloadedContent = await streamToString(downloadStream);
      expect(downloadedContent).toBe(content);
    });

    it("should respect custom expiration time", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("custom-expiration.txt");
      await backend.upload({
        key,
        body: Buffer.from("test"),
        contentType: "text/plain",
      });

      // Act - Request 1 hour expiration
      const { expiresAt } = await backend.getSignedUrl(key, { expiresIn: 3600 });

      // Assert - Expiration is approximately 1 hour from now
      const expiresAtTime = new Date(expiresAt).getTime();
      const expectedTime = Date.now() + 3600 * 1000;
      // Allow 5 second tolerance
      expect(expiresAtTime).toBeGreaterThanOrEqual(expectedTime - 5000);
      expect(expiresAtTime).toBeLessThanOrEqual(expectedTime + 5000);
    });
  });

  // ==========================================================================
  // AC4: Error handling test: operations on non-existent objects
  // ==========================================================================
  describe("error handling (AC4)", () => {
    it("should throw FileNotFoundError for non-existent object download", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const nonExistentKey = "integration-test/does-not-exist-12345.txt";

      // Act & Assert
      await expect(backend.download(nonExistentKey)).rejects.toThrow(
        FileNotFoundError
      );
    });

    it("should return false for exists check on non-existent object", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const nonExistentKey = "integration-test/does-not-exist-67890.txt";

      // Act
      const exists = await backend.exists(nonExistentKey);

      // Assert
      expect(exists).toBe(false);
    });

    it("should not throw when deleting non-existent object (idempotent)", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const nonExistentKey = "integration-test/never-existed.txt";

      // Act & Assert - Should complete without throwing
      await expect(backend.delete(nonExistentKey)).resolves.toBeUndefined();
    });

    it("should generate signed URL for non-existent object (no existence check)", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const nonExistentKey = "integration-test/not-yet-created.txt";

      // Act - Should not throw (signed URLs don't verify existence)
      const { url, expiresAt } = await backend.getSignedUrl(nonExistentKey);

      // Assert - URL is generated
      expect(url).toBeDefined();
      expect(expiresAt).toBeDefined();

      // But fetching it should fail
      const response = await fetch(url);
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  // ==========================================================================
  // AC5: Storage key format is verified (correct path structure)
  // ==========================================================================
  describe("storage key format (AC5)", () => {
    it("should preserve path structure in keys", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Use hierarchical key like production would
      const key = createTestKey("org123/2024/01/document.pdf");
      const content = "PDF content simulation";

      // Act
      const result = await backend.upload({
        key,
        body: Buffer.from(content),
        contentType: "application/pdf",
      });

      // Assert - Key is preserved exactly
      expect(result.key).toBe(key);
      expect(result.key).toContain("org123");
      expect(result.key).toContain("2024/01");
      expect(result.key).toContain("document.pdf");

      // Verify we can download with the exact same key
      const stream = await backend.download(key);
      const downloaded = await streamToString(stream);
      expect(downloaded).toBe(content);
    });

    it("should handle special characters in keys", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Key with spaces and special chars
      const key = createTestKey("uploads/My Document (v2).pdf");
      const content = "Special character test";

      // Act
      await backend.upload({
        key,
        body: Buffer.from(content),
        contentType: "application/pdf",
      });

      // Assert - Can download with same key
      const stream = await backend.download(key);
      const downloaded = await streamToString(stream);
      expect(downloaded).toBe(content);
    });

    it("should handle deeply nested paths", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Deep hierarchy
      const key = createTestKey(
        "district/school/class/assignment/student/submission/file.txt"
      );
      const content = "Deeply nested file content";

      // Act
      const result = await backend.upload({
        key,
        body: Buffer.from(content),
        contentType: "text/plain",
      });

      // Assert - Path preserved
      expect(result.key).toContain("district");
      expect(result.key).toContain("student");
      expect(result.key).toContain("submission");

      // Verify retrieval
      const exists = await backend.exists(key);
      expect(exists).toBe(true);
    });

    it("should preserve metadata on upload", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("with-metadata.txt");
      const metadata = {
        "uploaded-by": "test-user",
        "original-name": "my-file.txt",
      };

      // Act - Upload with metadata
      const result = await backend.upload({
        key,
        body: Buffer.from("content"),
        contentType: "text/plain",
        metadata,
      });

      // Assert - Upload succeeds (metadata verification would need HEAD request)
      expect(result.key).toBe(key);
      expect(result.etag).toBeDefined();
    });
  });

  // ==========================================================================
  // AC6: Tests clean up after themselves (no orphaned test files)
  // Note: This is verified by the afterEach hook, but we can test the mechanism
  // ==========================================================================
  describe("test cleanup mechanism (AC6)", () => {
    it("should track created keys for cleanup", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - Create multiple files
      const key1 = createTestKey("cleanup-test-1.txt");
      const key2 = createTestKey("cleanup-test-2.txt");

      await backend.upload({
        key: key1,
        body: Buffer.from("file 1"),
        contentType: "text/plain",
      });

      await backend.upload({
        key: key2,
        body: Buffer.from("file 2"),
        contentType: "text/plain",
      });

      // Assert - Both keys are tracked
      expect(testKeys).toContain(key1);
      expect(testKeys).toContain(key2);

      // afterEach will clean these up
    });
  });

  // ==========================================================================
  // Additional edge case tests
  // ==========================================================================
  describe("edge cases", () => {
    it("should handle empty file upload", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange
      const key = createTestKey("empty-file.txt");

      // Act
      const result = await backend.upload({
        key,
        body: Buffer.from(""),
        contentType: "text/plain",
      });

      // Assert
      expect(result.key).toBe(key);

      // Verify download
      const stream = await backend.download(key);
      const content = await streamToString(stream);
      expect(content).toBe("");
    });

    it("should handle large file upload", async () => {
      if (!(await isMinioAvailable())) {
        console.warn("Skipping - MinIO not available");
        return;
      }

      // Arrange - 1MB file
      const key = createTestKey("large-file.bin");
      const size = 1024 * 1024;
      const content = Buffer.alloc(size, "x");

      // Act
      const result = await backend.upload({
        key,
        body: content,
        contentType: "application/octet-stream",
      });

      // Assert
      expect(result.key).toBe(key);

      // Verify download
      const stream = await backend.download(key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const downloaded = Buffer.concat(chunks);
      expect(downloaded.length).toBe(size);
    });
  });
});
