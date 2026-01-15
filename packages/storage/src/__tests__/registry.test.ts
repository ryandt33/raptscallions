/**
 * Tests for storage backend plugin registry
 */

import { describe, it, expect, beforeEach } from 'vitest';


import { BackendNotRegisteredError } from '../errors.js';
import {
  registerBackend,
  getBackendFactory,
  isBackendRegistered,
  getRegisteredBackends,
  resetRegistry,
} from '../registry.js';

import type {
  IStorageBackend,
  UploadParams,
  UploadResult,
  SignedUrl,
  SignedUrlOptions,
  BackendFactory,
} from '../types.js';
import type { Readable } from 'node:stream';

/**
 * Mock implementation of IStorageBackend for testing
 */
class MockStorageBackend implements IStorageBackend {
  public readonly name: string;

  constructor(name: string = 'mock') {
    this.name = name;
  }

  async upload(_params: UploadParams): Promise<UploadResult> {
    return { key: _params.key };
  }

  async download(_key: string): Promise<Readable> {
    const { Readable } = await import('node:stream');
    return Readable.from(['test']);
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  async exists(_key: string): Promise<boolean> {
    return true;
  }

  async getSignedUrl(_key: string, _options?: SignedUrlOptions): Promise<SignedUrl> {
    return {
      url: `https://mock.storage/${_key}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }
}

describe('Storage Registry', () => {
  beforeEach(() => {
    // Reset registry state between tests
    resetRegistry();
  });

  describe('registerBackend', () => {
    it('should register a backend factory', () => {
      // Arrange
      const factory: BackendFactory = () => new MockStorageBackend();

      // Act
      registerBackend('mock', factory);

      // Assert
      expect(isBackendRegistered('mock')).toBe(true);
    });

    it('should allow registration of multiple backends', () => {
      // Arrange
      const localFactory: BackendFactory = () => new MockStorageBackend('local');
      const s3Factory: BackendFactory = () => new MockStorageBackend('s3');
      const azureFactory: BackendFactory = () => new MockStorageBackend('azure');

      // Act
      registerBackend('local', localFactory);
      registerBackend('s3', s3Factory);
      registerBackend('azure', azureFactory);

      // Assert
      expect(isBackendRegistered('local')).toBe(true);
      expect(isBackendRegistered('s3')).toBe(true);
      expect(isBackendRegistered('azure')).toBe(true);
    });

    it('should overwrite previous registration (idempotent)', () => {
      // Arrange
      const factory1: BackendFactory = () => new MockStorageBackend('first');
      const factory2: BackendFactory = () => new MockStorageBackend('second');

      // Act
      registerBackend('test', factory1);
      registerBackend('test', factory2);

      // Assert
      const retrievedFactory = getBackendFactory('test');
      const instance = retrievedFactory();
      expect((instance as MockStorageBackend).name).toBe('second');
    });

    it('should accept generic type constraint for type safety', () => {
      // Arrange - This test verifies TypeScript generics work at compile time
      // The BackendFactory<T> generic ensures only IStorageBackend implementations are accepted
      const typedFactory: BackendFactory<MockStorageBackend> = () => new MockStorageBackend();

      // Act
      registerBackend<MockStorageBackend>('typed', typedFactory);

      // Assert
      expect(isBackendRegistered('typed')).toBe(true);
    });
  });

  describe('getBackendFactory', () => {
    it('should return registered factory', () => {
      // Arrange
      const expectedBackend = new MockStorageBackend('test');
      const factory: BackendFactory = () => expectedBackend;
      registerBackend('test', factory);

      // Act
      const retrievedFactory = getBackendFactory('test');
      const instance = retrievedFactory();

      // Assert
      expect(instance).toBe(expectedBackend);
    });

    it('should throw BackendNotRegisteredError for unknown identifier', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend());

      // Act & Assert
      expect(() => getBackendFactory('unknown')).toThrow(BackendNotRegisteredError);
    });

    it('should include available backends in error message', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend());
      registerBackend('s3', () => new MockStorageBackend());

      // Act & Assert
      try {
        getBackendFactory('azure');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BackendNotRegisteredError);
        const backendError = error as BackendNotRegisteredError;
        expect(backendError.message).toContain('azure');
        expect(backendError.message).toContain('local');
        expect(backendError.message).toContain('s3');
      }
    });

    it('should throw with empty available list when no backends registered', () => {
      // Act & Assert
      try {
        getBackendFactory('any');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BackendNotRegisteredError);
        const backendError = error as BackendNotRegisteredError;
        expect(backendError.message).toContain('No backends are currently registered');
      }
    });
  });

  describe('isBackendRegistered', () => {
    it('should return true for registered backend', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());

      // Act & Assert
      expect(isBackendRegistered('test')).toBe(true);
    });

    it('should return false for unregistered backend', () => {
      // Act & Assert
      expect(isBackendRegistered('unknown')).toBe(false);
    });

    it('should return false after registry reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());
      expect(isBackendRegistered('test')).toBe(true);

      // Act
      resetRegistry();

      // Assert
      expect(isBackendRegistered('test')).toBe(false);
    });
  });

  describe('getRegisteredBackends', () => {
    it('should return empty array when no backends registered', () => {
      // Act & Assert
      expect(getRegisteredBackends()).toEqual([]);
    });

    it('should return all registered backend identifiers', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend());
      registerBackend('s3', () => new MockStorageBackend());
      registerBackend('gcs', () => new MockStorageBackend());

      // Act
      const backends = getRegisteredBackends();

      // Assert
      expect(backends).toHaveLength(3);
      expect(backends).toContain('local');
      expect(backends).toContain('s3');
      expect(backends).toContain('gcs');
    });

    it('should return new array (not a reference to internal state)', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());

      // Act
      const backends1 = getRegisteredBackends();
      const backends2 = getRegisteredBackends();

      // Assert - should be equal but not the same reference
      expect(backends1).toEqual(backends2);
      expect(backends1).not.toBe(backends2);
    });

    it('should return empty array after registry reset', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend());
      registerBackend('s3', () => new MockStorageBackend());

      // Act
      resetRegistry();

      // Assert
      expect(getRegisteredBackends()).toEqual([]);
    });
  });

  describe('resetRegistry', () => {
    it('should clear all registered backends', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend());
      registerBackend('s3', () => new MockStorageBackend());
      registerBackend('azure', () => new MockStorageBackend());
      expect(getRegisteredBackends()).toHaveLength(3);

      // Act
      resetRegistry();

      // Assert
      expect(getRegisteredBackends()).toHaveLength(0);
      expect(isBackendRegistered('local')).toBe(false);
      expect(isBackendRegistered('s3')).toBe(false);
      expect(isBackendRegistered('azure')).toBe(false);
    });

    it('should allow re-registration after reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend('first'));
      resetRegistry();

      // Act
      registerBackend('test', () => new MockStorageBackend('second'));

      // Assert
      expect(isBackendRegistered('test')).toBe(true);
      const factory = getBackendFactory('test');
      const instance = factory() as MockStorageBackend;
      expect(instance.name).toBe('second');
    });

    it('should be safe to call multiple times', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());

      // Act
      resetRegistry();
      resetRegistry();
      resetRegistry();

      // Assert - should not throw
      expect(getRegisteredBackends()).toEqual([]);
    });
  });

  describe('Backend identifier edge cases', () => {
    it('should handle identifiers with special characters', () => {
      // Arrange
      const identifiers = ['my-backend', 'my_backend', 'backend123', 'Backend.v2'];

      // Act & Assert
      for (const id of identifiers) {
        registerBackend(id, () => new MockStorageBackend(id));
        expect(isBackendRegistered(id)).toBe(true);
      }
    });

    it('should treat identifiers as case-sensitive', () => {
      // Arrange
      registerBackend('Local', () => new MockStorageBackend('upper'));
      registerBackend('local', () => new MockStorageBackend('lower'));

      // Assert
      expect(isBackendRegistered('Local')).toBe(true);
      expect(isBackendRegistered('local')).toBe(true);
      expect(getRegisteredBackends()).toHaveLength(2);

      // Verify they are different backends
      const upperFactory = getBackendFactory('Local');
      const lowerFactory = getBackendFactory('local');
      expect((upperFactory() as MockStorageBackend).name).toBe('upper');
      expect((lowerFactory() as MockStorageBackend).name).toBe('lower');
    });
  });

  describe('Concurrent registration', () => {
    it('should handle many registrations without conflicts', () => {
      // Arrange
      const count = 100;
      const factories = Array.from({ length: count }, (_, i) => ({
        id: `backend-${i}`,
        factory: (): IStorageBackend => new MockStorageBackend(`backend-${i}`),
      }));

      // Act
      for (const { id, factory } of factories) {
        registerBackend(id, factory);
      }

      // Assert
      expect(getRegisteredBackends()).toHaveLength(count);
      for (const { id } of factories) {
        expect(isBackendRegistered(id)).toBe(true);
      }
    });
  });
});
