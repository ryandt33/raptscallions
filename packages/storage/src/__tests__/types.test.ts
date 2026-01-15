/**
 * Tests for storage type definitions and interface compliance
 */

import { describe, it, expect } from 'vitest';

import type {
  IStorageBackend,
  BackendFactory,
  UploadParams,
  UploadResult,
  SignedUrl,
  SignedUrlOptions,
} from '../types.js';
import type { Readable } from 'node:stream';


/**
 * Minimal mock backend that satisfies IStorageBackend interface
 * Used to verify the interface contract is correct
 */
class MinimalStorageBackend implements IStorageBackend {
  async upload(params: UploadParams): Promise<UploadResult> {
    return { key: params.key };
  }

  async download(_key: string): Promise<Readable> {
    const { Readable } = await import('node:stream');
    return Readable.from([]);
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }

  async getSignedUrl(_key: string, _options?: SignedUrlOptions): Promise<SignedUrl> {
    return {
      url: 'https://example.com/signed',
      expiresAt: new Date().toISOString(),
    };
  }
}

/**
 * Full-featured mock backend with all optional properties
 */
class FullStorageBackend implements IStorageBackend {
  async upload(params: UploadParams): Promise<UploadResult> {
    return {
      key: params.key,
      etag: 'abc123',
      url: `https://storage.example.com/${params.key}`,
    };
  }

  async download(_key: string): Promise<Readable> {
    const { Readable } = await import('node:stream');
    return Readable.from(['file content']);
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  async exists(_key: string): Promise<boolean> {
    return true;
  }

  async getSignedUrl(_key: string, options?: SignedUrlOptions): Promise<SignedUrl> {
    const expiresIn = options?.expiresIn ?? 3600;
    return {
      url: 'https://example.com/signed?token=xyz',
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }
}

describe('Storage Types', () => {
  describe('IStorageBackend interface', () => {
    it('should allow minimal implementation', () => {
      // Act
      const backend: IStorageBackend = new MinimalStorageBackend();

      // Assert
      expect(backend.upload).toBeDefined();
      expect(backend.download).toBeDefined();
      expect(backend.delete).toBeDefined();
      expect(backend.exists).toBeDefined();
      expect(backend.getSignedUrl).toBeDefined();
    });

    it('should allow full implementation with optional returns', () => {
      // Act
      const backend: IStorageBackend = new FullStorageBackend();

      // Assert
      expect(backend).toBeDefined();
    });

    it('should have all required methods', async () => {
      // Arrange
      const backend: IStorageBackend = new MinimalStorageBackend();

      // Assert - all methods are callable
      expect(typeof backend.upload).toBe('function');
      expect(typeof backend.download).toBe('function');
      expect(typeof backend.delete).toBe('function');
      expect(typeof backend.exists).toBe('function');
      expect(typeof backend.getSignedUrl).toBe('function');
    });
  });

  describe('UploadParams type', () => {
    it('should accept required properties', () => {
      // Arrange
      const params: UploadParams = {
        key: 'uploads/file.pdf',
        body: Buffer.from('test'),
        contentType: 'application/pdf',
      };

      // Assert
      expect(params.key).toBe('uploads/file.pdf');
      expect(params.body).toBeInstanceOf(Buffer);
      expect(params.contentType).toBe('application/pdf');
    });

    it('should accept optional contentLength', () => {
      // Arrange
      const params: UploadParams = {
        key: 'file.txt',
        body: Buffer.from('content'),
        contentType: 'text/plain',
        contentLength: 7,
      };

      // Assert
      expect(params.contentLength).toBe(7);
    });

    it('should accept optional metadata', () => {
      // Arrange
      const params: UploadParams = {
        key: 'file.txt',
        body: Buffer.from('content'),
        contentType: 'text/plain',
        metadata: {
          userId: 'user-123',
          groupId: 'group-456',
          description: 'Test file',
        },
      };

      // Assert
      expect(params.metadata).toBeDefined();
      expect(params.metadata?.userId).toBe('user-123');
    });

    it('should accept Readable stream as body', async () => {
      // Arrange
      const { Readable } = await import('node:stream');
      const stream = Readable.from(['chunk1', 'chunk2']);

      const params: UploadParams = {
        key: 'stream-file.txt',
        body: stream,
        contentType: 'text/plain',
        contentLength: 12,
      };

      // Assert
      expect(params.body).toBeInstanceOf(Readable);
    });
  });

  describe('UploadResult type', () => {
    it('should have required key property', () => {
      // Arrange
      const result: UploadResult = {
        key: 'uploads/file.pdf',
      };

      // Assert
      expect(result.key).toBe('uploads/file.pdf');
    });

    it('should accept optional etag', () => {
      // Arrange
      const result: UploadResult = {
        key: 'file.txt',
        etag: '"abc123"',
      };

      // Assert
      expect(result.etag).toBe('"abc123"');
    });

    it('should accept optional url', () => {
      // Arrange
      const result: UploadResult = {
        key: 'file.txt',
        url: 'https://storage.example.com/file.txt',
      };

      // Assert
      expect(result.url).toBe('https://storage.example.com/file.txt');
    });

    it('should accept all properties', () => {
      // Arrange
      const result: UploadResult = {
        key: 'file.txt',
        etag: '"xyz789"',
        url: 'https://cdn.example.com/file.txt',
      };

      // Assert
      expect(result.key).toBeDefined();
      expect(result.etag).toBeDefined();
      expect(result.url).toBeDefined();
    });
  });

  describe('SignedUrlOptions type', () => {
    it('should accept expiresIn', () => {
      // Arrange
      const options: SignedUrlOptions = {
        expiresIn: 3600,
      };

      // Assert
      expect(options.expiresIn).toBe(3600);
    });

    it('should accept method GET', () => {
      // Arrange
      const options: SignedUrlOptions = {
        method: 'GET',
      };

      // Assert
      expect(options.method).toBe('GET');
    });

    it('should accept method PUT', () => {
      // Arrange
      const options: SignedUrlOptions = {
        method: 'PUT',
        contentType: 'application/pdf',
      };

      // Assert
      expect(options.method).toBe('PUT');
      expect(options.contentType).toBe('application/pdf');
    });

    it('should accept all properties', () => {
      // Arrange
      const options: SignedUrlOptions = {
        expiresIn: 7200,
        method: 'PUT',
        contentType: 'image/png',
      };

      // Assert
      expect(options.expiresIn).toBe(7200);
      expect(options.method).toBe('PUT');
      expect(options.contentType).toBe('image/png');
    });

    it('should allow empty options', () => {
      // Arrange
      const options: SignedUrlOptions = {};

      // Assert
      expect(options.expiresIn).toBeUndefined();
      expect(options.method).toBeUndefined();
      expect(options.contentType).toBeUndefined();
    });
  });

  describe('SignedUrl type', () => {
    it('should have required url property', () => {
      // Arrange
      const signedUrl: SignedUrl = {
        url: 'https://storage.example.com/file.pdf?signature=abc',
        expiresAt: '2026-01-17T00:00:00.000Z',
      };

      // Assert
      expect(signedUrl.url).toBe('https://storage.example.com/file.pdf?signature=abc');
    });

    it('should have required expiresAt property', () => {
      // Arrange
      const signedUrl: SignedUrl = {
        url: 'https://example.com/file',
        expiresAt: new Date().toISOString(),
      };

      // Assert
      expect(signedUrl.expiresAt).toBeDefined();
      expect(typeof signedUrl.expiresAt).toBe('string');
    });
  });

  describe('BackendFactory type', () => {
    it('should be a function returning IStorageBackend', () => {
      // Arrange
      const factory: BackendFactory = () => new MinimalStorageBackend();

      // Act
      const backend = factory();

      // Assert
      expect(backend).toBeInstanceOf(MinimalStorageBackend);
    });

    it('should work with generic type parameter', () => {
      // Arrange
      const factory: BackendFactory<FullStorageBackend> = () => new FullStorageBackend();

      // Act
      const backend = factory();

      // Assert
      expect(backend).toBeInstanceOf(FullStorageBackend);
    });

    it('should accept parameterless factory', () => {
      // Arrange
      const factory: BackendFactory = () => new MinimalStorageBackend();

      // Act
      const backend = factory();

      // Assert
      expect(backend).toBeDefined();
    });
  });

  describe('Interface method return types', () => {
    it('upload should return Promise<UploadResult>', async () => {
      // Arrange
      const backend: IStorageBackend = new FullStorageBackend();

      // Act
      const result = await backend.upload({
        key: 'test.txt',
        body: Buffer.from('test'),
        contentType: 'text/plain',
      });

      // Assert
      expect(result.key).toBe('test.txt');
      expect(typeof result.key).toBe('string');
    });

    it('download should return Promise<Readable>', async () => {
      // Arrange
      const backend: IStorageBackend = new MinimalStorageBackend();
      const { Readable } = await import('node:stream');

      // Act
      const stream = await backend.download('test.txt');

      // Assert
      expect(stream).toBeInstanceOf(Readable);
    });

    it('delete should return Promise<void>', async () => {
      // Arrange
      const backend: IStorageBackend = new MinimalStorageBackend();

      // Act
      const result = await backend.delete('test.txt');

      // Assert
      expect(result).toBeUndefined();
    });

    it('exists should return Promise<boolean>', async () => {
      // Arrange
      const backend: IStorageBackend = new MinimalStorageBackend();

      // Act
      const exists = await backend.exists('test.txt');

      // Assert
      expect(typeof exists).toBe('boolean');
    });

    it('getSignedUrl should return Promise<SignedUrl>', async () => {
      // Arrange
      const backend: IStorageBackend = new FullStorageBackend();

      // Act
      const signedUrl = await backend.getSignedUrl('test.txt', { expiresIn: 3600 });

      // Assert
      expect(signedUrl.url).toBeDefined();
      expect(signedUrl.expiresAt).toBeDefined();
      expect(typeof signedUrl.url).toBe('string');
      expect(typeof signedUrl.expiresAt).toBe('string');
    });
  });
});
