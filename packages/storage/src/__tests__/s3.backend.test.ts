/**
 * Tests for S3StorageBackend
 *
 * TDD red phase - these tests will fail until implementation is complete.
 *
 * Uses dependency injection to mock S3Client rather than vi.mock(),
 * following CONVENTIONS.md recommendation for testability.
 */

import { Readable } from 'node:stream';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { FileNotFoundError, StorageError } from '../errors.js';

import type { IStorageBackend, UploadParams, SignedUrlOptions } from '../types.js';

/**
 * Mock S3Client interface matching AWS SDK v3 pattern.
 *
 * AWS SDK v3 uses a `send()` method that accepts command objects.
 * This mock captures the commands sent for verification.
 */
interface MockS3Client {
  send: ReturnType<typeof vi.fn>;
}

/**
 * Helper to create a mock S3Client with configurable responses.
 */
function createMockS3Client(): MockS3Client {
  return {
    send: vi.fn(),
  };
}

/**
 * Helper to create a Readable stream from string content.
 */
function createReadableStream(content: string): Readable {
  const readable = new Readable();
  readable.push(content);
  readable.push(null);
  return readable;
}

/**
 * Helper to create a mock S3 response Body (SDKStreamMixin).
 * AWS SDK v3 returns a special stream type for GetObjectCommand.
 */
function createMockS3Body(content: string): Readable & { transformToByteArray: () => Promise<Uint8Array> } {
  const stream = createReadableStream(content) as Readable & {
    transformToByteArray: () => Promise<Uint8Array>;
  };
  stream.transformToByteArray = async () => new TextEncoder().encode(content);
  return stream;
}

/**
 * Mock presigner function for testing getSignedUrl.
 * Returns a signed URL with the bucket and key embedded for verification.
 */
function createMockPresigner() {
  return vi.fn().mockImplementation(
    async (_client: unknown, command: { input: { Bucket: string; Key: string } }, _options: { expiresIn: number }) => {
      return `https://${command.input.Bucket}.s3.amazonaws.com/${command.input.Key}?signed=true`;
    }
  );
}

describe('S3StorageBackend', () => {
  let backend: IStorageBackend;
  let mockS3Client: MockS3Client;
  let mockPresigner: ReturnType<typeof createMockPresigner>;

  // Dynamic import to handle module not existing during TDD red phase
  async function importBackend(): Promise<{ S3StorageBackend: new (...args: unknown[]) => IStorageBackend; createS3Backend: () => IStorageBackend }> {
    const mod = await import('../backends/s3.backend.js');
    return mod as { S3StorageBackend: new (...args: unknown[]) => IStorageBackend; createS3Backend: () => IStorageBackend };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mockS3Client = createMockS3Client();
    mockPresigner = createMockPresigner();

    // Import and instantiate the backend with mock client and mock presigner
    const { S3StorageBackend } = await importBackend();
    backend = new S3StorageBackend(
      mockS3Client,
      'test-bucket',
      { signedUrlExpiration: 900, presigner: mockPresigner }
    );
  });

  describe('constructor', () => {
    it('should create instance with required parameters', async () => {
      // Arrange
      const { S3StorageBackend } = await importBackend();

      // Act
      const instance = new S3StorageBackend(
        mockS3Client,
        'my-bucket'
      );

      // Assert
      expect(instance).toBeDefined();
    });

    it('should accept optional configuration', async () => {
      // Arrange
      const { S3StorageBackend } = await importBackend();

      // Act
      const instance = new S3StorageBackend(
        mockS3Client,
        'my-bucket',
        { signedUrlExpiration: 3600 }
      );

      // Assert
      expect(instance).toBeDefined();
    });
  });

  describe('upload', () => {
    it('should upload file with Buffer body', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/test-file.txt',
        body: Buffer.from('Hello, world!'),
        contentType: 'text/plain',
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"abc123"' });

      // Act
      const result = await backend.upload(params);

      // Assert
      expect(result.key).toBe('uploads/test-file.txt');
      expect(result.etag).toBe('"abc123"');
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'uploads/test-file.txt',
            Body: params.body,
            ContentType: 'text/plain',
          }),
        })
      );
    });

    it('should upload file with Readable stream body', async () => {
      // Arrange
      const stream = createReadableStream('Stream content');
      const params: UploadParams = {
        key: 'uploads/stream-file.txt',
        body: stream,
        contentType: 'text/plain',
        contentLength: 14,
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"def456"' });

      // Act
      const result = await backend.upload(params);

      // Assert
      expect(result.key).toBe('uploads/stream-file.txt');
      expect(result.etag).toBe('"def456"');
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'uploads/stream-file.txt',
            Body: stream,
            ContentType: 'text/plain',
            ContentLength: 14,
          }),
        })
      );
    });

    it('should set correct ContentType', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/document.pdf',
        body: Buffer.from('PDF content'),
        contentType: 'application/pdf',
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"ghi789"' });

      // Act
      await backend.upload(params);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ContentType: 'application/pdf',
          }),
        })
      );
    });

    it('should include metadata when provided', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/with-metadata.txt',
        body: Buffer.from('Content'),
        contentType: 'text/plain',
        metadata: {
          'uploaded-by': 'user-123',
          'original-name': 'my-file.txt',
        },
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"jkl012"' });

      // Act
      await backend.upload(params);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Metadata: {
              'uploaded-by': 'user-123',
              'original-name': 'my-file.txt',
            },
          }),
        })
      );
    });

    it('should throw StorageError on S3 failure', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/fail.txt',
        body: Buffer.from('Content'),
        contentType: 'text/plain',
      };
      const s3Error = new Error('Access Denied');
      s3Error.name = 'AccessDenied';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      await expect(backend.upload(params)).rejects.toThrow(StorageError);
    });

    it('should return key and etag in result', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/test.txt',
        body: Buffer.from('Content'),
        contentType: 'text/plain',
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"etag-value-here"' });

      // Act
      const result = await backend.upload(params);

      // Assert
      expect(result).toEqual({
        key: 'uploads/test.txt',
        etag: '"etag-value-here"',
      });
    });
  });

  describe('download', () => {
    it('should return readable stream on success', async () => {
      // Arrange
      const key = 'downloads/existing-file.txt';
      const mockBody = createMockS3Body('File content here');
      mockS3Client.send.mockResolvedValue({ Body: mockBody });

      // Act
      const result = await backend.download(key);

      // Assert
      expect(result).toBeInstanceOf(Readable);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
          }),
        })
      );
    });

    it('should throw FileNotFoundError on NoSuchKey', async () => {
      // Arrange
      const key = 'downloads/non-existent.txt';
      const s3Error = new Error('The specified key does not exist.');
      s3Error.name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      await expect(backend.download(key)).rejects.toThrow(FileNotFoundError);
      await expect(backend.download(key)).rejects.toThrow(/non-existent\.txt/);
    });

    it('should throw StorageError on other S3 failures', async () => {
      // Arrange
      const key = 'downloads/error-file.txt';
      const s3Error = new Error('Service unavailable');
      s3Error.name = 'ServiceUnavailable';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      await expect(backend.download(key)).rejects.toThrow(StorageError);
    });

    it('should handle missing Body in response', async () => {
      // Arrange
      const key = 'downloads/empty-response.txt';
      mockS3Client.send.mockResolvedValue({ Body: undefined });

      // Act & Assert
      await expect(backend.download(key)).rejects.toThrow(FileNotFoundError);
    });
  });

  describe('delete', () => {
    it('should complete successfully on existing object', async () => {
      // Arrange
      const key = 'delete/existing-file.txt';
      mockS3Client.send.mockResolvedValue({});

      // Act
      await backend.delete(key);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
          }),
        })
      );
    });

    it('should complete successfully on non-existent object (idempotent)', async () => {
      // Arrange
      // S3 DeleteObject doesn't throw for non-existent objects by default
      const key = 'delete/non-existent.txt';
      mockS3Client.send.mockResolvedValue({});

      // Act & Assert - should not throw
      await expect(backend.delete(key)).resolves.toBeUndefined();
    });

    it('should succeed silently when object does not exist (NoSuchKey)', async () => {
      // Arrange
      // Some S3-compatible services might throw NoSuchKey
      const key = 'delete/missing.txt';
      const s3Error = new Error('No such key');
      s3Error.name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert - should not throw, delete is idempotent
      await expect(backend.delete(key)).resolves.toBeUndefined();
    });

    it('should throw StorageError on other S3 failures', async () => {
      // Arrange
      const key = 'delete/error-file.txt';
      const s3Error = new Error('Access Denied');
      s3Error.name = 'AccessDenied';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      await expect(backend.delete(key)).rejects.toThrow(StorageError);
    });
  });

  describe('exists', () => {
    it('should return true when object exists', async () => {
      // Arrange
      const key = 'exists/existing-file.txt';
      mockS3Client.send.mockResolvedValue({
        ContentLength: 1024,
        ContentType: 'text/plain',
      });

      // Act
      const result = await backend.exists(key);

      // Assert
      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: key,
          }),
        })
      );
    });

    it('should return false when object does not exist', async () => {
      // Arrange
      const key = 'exists/non-existent.txt';
      const s3Error = new Error('Not Found');
      s3Error.name = 'NotFound';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act
      const result = await backend.exists(key);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on NoSuchKey error', async () => {
      // Arrange
      const key = 'exists/missing.txt';
      const s3Error = new Error('The specified key does not exist.');
      s3Error.name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act
      const result = await backend.exists(key);

      // Assert
      expect(result).toBe(false);
    });

    it('should throw StorageError on other S3 failures', async () => {
      // Arrange
      const key = 'exists/error-file.txt';
      const s3Error = new Error('Internal Server Error');
      s3Error.name = 'InternalError';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      await expect(backend.exists(key)).rejects.toThrow(StorageError);
    });
  });

  describe('getSignedUrl', () => {
    it('should generate GET URL by default', async () => {
      // Arrange
      const key = 'signed/document.pdf';
      // Mock will be called but we need to check the command type

      // Act
      const result = await backend.getSignedUrl(key);

      // Assert
      expect(result.url).toBeDefined();
      expect(result.url).toContain('test-bucket');
      expect(result.expiresAt).toBeDefined();
      // Verify it's a valid ISO date
      expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
    });

    it('should generate PUT URL when method specified', async () => {
      // Arrange
      const key = 'signed/upload-target.pdf';
      const options: SignedUrlOptions = {
        method: 'PUT',
        contentType: 'application/pdf',
      };

      // Act
      const result = await backend.getSignedUrl(key, options);

      // Assert
      expect(result.url).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should use default expiration from config', async () => {
      // Arrange
      const key = 'signed/default-expiration.txt';
      const now = Date.now();

      // Act
      const result = await backend.getSignedUrl(key);

      // Assert
      const expiresAt = new Date(result.expiresAt).getTime();
      // Should expire approximately 900 seconds from now (with 5 second tolerance)
      expect(expiresAt).toBeGreaterThanOrEqual(now + 895 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + 905 * 1000);
    });

    it('should use custom expiration when provided', async () => {
      // Arrange
      const key = 'signed/custom-expiration.txt';
      const customExpiration = 3600; // 1 hour
      const now = Date.now();

      // Act
      const result = await backend.getSignedUrl(key, { expiresIn: customExpiration });

      // Assert
      const expiresAt = new Date(result.expiresAt).getTime();
      // Should expire approximately 3600 seconds from now (with 5 second tolerance)
      expect(expiresAt).toBeGreaterThanOrEqual(now + 3595 * 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + 3605 * 1000);
    });

    it('should include ContentType for PUT URLs', async () => {
      // Arrange
      const key = 'signed/typed-upload.png';
      const options: SignedUrlOptions = {
        method: 'PUT',
        contentType: 'image/png',
      };

      // Act
      const result = await backend.getSignedUrl(key, options);

      // Assert
      expect(result.url).toBeDefined();
      // The signed URL generation doesn't throw for non-existent objects
    });

    it('should return URL and expiresAt timestamp', async () => {
      // Arrange
      const key = 'signed/complete-response.txt';

      // Act
      const result = await backend.getSignedUrl(key);

      // Assert
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.url).toBe('string');
      expect(typeof result.expiresAt).toBe('string');
      // URL should be a valid URL
      expect(() => new URL(result.url)).not.toThrow();
    });

    it('should not verify object existence before generating URL', async () => {
      // Arrange
      const key = 'signed/non-existent.txt';
      // Don't set up any mock response - signed URL generation doesn't call S3 for existence

      // Act & Assert - should succeed even for non-existent objects
      const result = await backend.getSignedUrl(key);
      expect(result.url).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should convert NoSuchKey to FileNotFoundError', async () => {
      // Arrange
      const key = 'error/no-such-key.txt';
      const s3Error = new Error('The specified key does not exist.');
      s3Error.name = 'NoSuchKey';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFoundError);
      }
    });

    it('should convert NotFound to FileNotFoundError', async () => {
      // Arrange
      const key = 'error/not-found.txt';
      const s3Error = new Error('Not Found');
      s3Error.name = 'NotFound';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFoundError);
      }
    });

    it('should convert credential errors without exposing secrets', async () => {
      // Arrange
      const key = 'error/credential-error.txt';
      const s3Error = new Error('The AWS Access Key Id you provided is invalid');
      s3Error.name = 'InvalidAccessKeyId';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.upload({
          key,
          body: Buffer.from('test'),
          contentType: 'text/plain',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        // Should NOT contain the original error message that might have key info
        expect((error as Error).message).toContain('authentication');
        expect((error as Error).message).not.toContain('Access Key');
      }
    });

    it('should convert SignatureDoesNotMatch without exposing secrets', async () => {
      // Arrange
      const key = 'error/signature-error.txt';
      const s3Error = new Error('The request signature does not match');
      s3Error.name = 'SignatureDoesNotMatch';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('authentication');
      }
    });

    it('should convert CredentialsProviderError without exposing secrets', async () => {
      // Arrange
      const key = 'error/credentials-provider.txt';
      const s3Error = new Error('Could not load credentials from any providers');
      s3Error.name = 'CredentialsProviderError';
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('authentication');
        expect((error as Error).message).not.toContain('providers');
      }
    });

    it('should convert network errors with context', async () => {
      // Arrange
      const key = 'error/network-error.txt';
      const networkError = new Error('connect ECONNREFUSED 127.0.0.1:9000');
      mockS3Client.send.mockRejectedValue(networkError);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('unavailable');
      }
    });

    it('should convert DNS resolution errors', async () => {
      // Arrange
      const key = 'error/dns-error.txt';
      const dnsError = new Error('getaddrinfo ENOTFOUND minio.local');
      mockS3Client.send.mockRejectedValue(dnsError);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('unavailable');
      }
    });

    it('should wrap unknown errors in StorageError', async () => {
      // Arrange
      const key = 'error/unknown-error.txt';
      const unknownError = new Error('Something unexpected happened');
      mockS3Client.send.mockRejectedValue(unknownError);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('failed');
      }
    });

    it('should handle non-Error objects gracefully', async () => {
      // Arrange
      const key = 'error/non-error.txt';
      mockS3Client.send.mockRejectedValue({ code: 'UNKNOWN', message: 'Object error' });

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as Error).message).toContain('Unknown');
      }
    });

    it('should include key in StorageError details', async () => {
      // Arrange
      const key = 'error/details-test.txt';
      const s3Error = new Error('Generic S3 error');
      mockS3Client.send.mockRejectedValue(s3Error);

      // Act & Assert
      try {
        await backend.download(key);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).details).toMatchObject({ key });
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata object', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'edge/empty-metadata.txt',
        body: Buffer.from('Content'),
        contentType: 'text/plain',
        metadata: {},
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"test"' });

      // Act & Assert
      await expect(backend.upload(params)).resolves.toBeDefined();
    });

    it('should handle keys with special characters', async () => {
      // Arrange
      const key = 'edge/special chars & symbols (1).txt';
      mockS3Client.send.mockResolvedValue({ ETag: '"test"' });

      // Act
      const result = await backend.upload({
        key,
        body: Buffer.from('Content'),
        contentType: 'text/plain',
      });

      // Assert
      expect(result.key).toBe(key);
    });

    it('should handle deeply nested key paths', async () => {
      // Arrange
      const key = 'org/school/class/assignment/student/submission/file.pdf';
      mockS3Client.send.mockResolvedValue({ ETag: '"test"' });

      // Act
      const result = await backend.upload({
        key,
        body: Buffer.from('Content'),
        contentType: 'application/pdf',
      });

      // Assert
      expect(result.key).toBe(key);
    });

    it('should handle large content length values', async () => {
      // Arrange
      const largeSize = 5 * 1024 * 1024 * 1024; // 5GB
      const params: UploadParams = {
        key: 'edge/large-file.bin',
        body: createReadableStream('x'), // Actual content doesn't matter for this test
        contentType: 'application/octet-stream',
        contentLength: largeSize,
      };
      mockS3Client.send.mockResolvedValue({ ETag: '"test"' });

      // Act
      await backend.upload(params);

      // Assert
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ContentLength: largeSize,
          }),
        })
      );
    });

    it('should handle upload without etag in response', async () => {
      // Arrange
      const params: UploadParams = {
        key: 'edge/no-etag.txt',
        body: Buffer.from('Content'),
        contentType: 'text/plain',
      };
      mockS3Client.send.mockResolvedValue({}); // No ETag

      // Act
      const result = await backend.upload(params);

      // Assert
      expect(result.key).toBe('edge/no-etag.txt');
      expect(result.etag).toBeUndefined();
    });
  });
});

describe('createS3Backend factory', () => {
  // Note: Factory tests require environment configuration to be available
  // These tests verify the factory function exists and creates valid backends

  it('should be exported from the module', async () => {
    // Act
    const module = await import('../backends/s3.backend.js');

    // Assert
    expect(module.createS3Backend).toBeDefined();
    expect(typeof module.createS3Backend).toBe('function');
  });
});
