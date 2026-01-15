/**
 * Tests for storage backend factory with lazy instantiation and caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';


import { BackendNotRegisteredError } from '../errors.js';
import {
  getBackend,
  isBackendCached,
  resetFactory,
  resetAll,
} from '../factory.js';
import {
  registerBackend,
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
  public readonly instanceId: string;

  constructor(name: string = 'mock') {
    this.name = name;
    this.instanceId = Math.random().toString(36).substring(7);
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

describe('Storage Factory', () => {
  beforeEach(() => {
    // Reset all state between tests
    resetAll();
  });

  describe('getBackend', () => {
    it('should create backend instance on first call (lazy instantiation)', () => {
      // Arrange
      const factoryFn = vi.fn(() => new MockStorageBackend('lazy'));
      registerBackend('lazy', factoryFn);

      // Assert - factory not called during registration
      expect(factoryFn).not.toHaveBeenCalled();

      // Act
      const backend = getBackend('lazy');

      // Assert - factory called only on getBackend
      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(backend).toBeInstanceOf(MockStorageBackend);
    });

    it('should return cached instance on subsequent calls (singleton)', () => {
      // Arrange
      const factoryFn = vi.fn(() => new MockStorageBackend('cached'));
      registerBackend('cached', factoryFn);

      // Act
      const instance1 = getBackend('cached');
      const instance2 = getBackend('cached');
      const instance3 = getBackend('cached');

      // Assert
      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should throw BackendNotRegisteredError for unknown identifier', () => {
      // Act & Assert
      expect(() => getBackend('unknown')).toThrow(BackendNotRegisteredError);
    });

    it('should include available backends in error for unknown identifier', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend('local'));
      registerBackend('s3', () => new MockStorageBackend('s3'));

      // Act & Assert
      try {
        getBackend('azure');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BackendNotRegisteredError);
        const backendError = error as BackendNotRegisteredError;
        expect(backendError.message).toContain('azure');
        expect(backendError.message).toContain('local');
        expect(backendError.message).toContain('s3');
      }
    });

    it('should maintain separate cached instances for different backend types', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend('local'));
      registerBackend('s3', () => new MockStorageBackend('s3'));
      registerBackend('azure', () => new MockStorageBackend('azure'));

      // Act
      const localBackend = getBackend('local') as MockStorageBackend;
      const s3Backend = getBackend('s3') as MockStorageBackend;
      const azureBackend = getBackend('azure') as MockStorageBackend;

      // Assert
      expect(localBackend.name).toBe('local');
      expect(s3Backend.name).toBe('s3');
      expect(azureBackend.name).toBe('azure');

      // Verify they are different instances
      expect(localBackend).not.toBe(s3Backend);
      expect(s3Backend).not.toBe(azureBackend);
      expect(localBackend).not.toBe(azureBackend);
    });

    it('should work with backends registered after factory use', () => {
      // Arrange - register and use first backend
      registerBackend('first', () => new MockStorageBackend('first'));
      getBackend('first');

      // Act - register second backend after first use
      registerBackend('second', () => new MockStorageBackend('second'));
      const secondBackend = getBackend('second');

      // Assert
      expect(secondBackend).toBeInstanceOf(MockStorageBackend);
      expect((secondBackend as MockStorageBackend).name).toBe('second');
    });

    it('should propagate factory errors to caller', () => {
      // Arrange
      const errorFactory: BackendFactory = () => {
        throw new Error('Factory initialization failed');
      };
      registerBackend('error', errorFactory);

      // Act & Assert
      expect(() => getBackend('error')).toThrow('Factory initialization failed');
    });

    it('should not cache instance when factory throws', () => {
      // Arrange
      let callCount = 0;
      const failingFactory: BackendFactory = () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return new MockStorageBackend('success');
      };
      registerBackend('retryable', failingFactory);

      // Act - first call fails
      expect(() => getBackend('retryable')).toThrow('First call fails');

      // Act - second call succeeds
      const backend = getBackend('retryable');

      // Assert
      expect(backend).toBeInstanceOf(MockStorageBackend);
      expect((backend as MockStorageBackend).name).toBe('success');
      expect(callCount).toBe(2);
    });
  });

  describe('isBackendCached', () => {
    it('should return false when backend not yet instantiated', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());

      // Act & Assert
      expect(isBackendCached('test')).toBe(false);
    });

    it('should return true after backend instantiation', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());

      // Act
      getBackend('test');

      // Assert
      expect(isBackendCached('test')).toBe(true);
    });

    it('should return false for unregistered backend', () => {
      // Act & Assert
      expect(isBackendCached('unknown')).toBe(false);
    });

    it('should return false after factory reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());
      getBackend('test');
      expect(isBackendCached('test')).toBe(true);

      // Act
      resetFactory();

      // Assert
      expect(isBackendCached('test')).toBe(false);
    });
  });

  describe('resetFactory', () => {
    it('should clear all cached backend instances', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend('local'));
      registerBackend('s3', () => new MockStorageBackend('s3'));
      getBackend('local');
      getBackend('s3');
      expect(isBackendCached('local')).toBe(true);
      expect(isBackendCached('s3')).toBe(true);

      // Act
      resetFactory();

      // Assert
      expect(isBackendCached('local')).toBe(false);
      expect(isBackendCached('s3')).toBe(false);
    });

    it('should not affect backend registrations', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend('local'));
      getBackend('local');

      // Act
      resetFactory();

      // Assert - backend still registered, can be re-instantiated
      const backend = getBackend('local');
      expect(backend).toBeInstanceOf(MockStorageBackend);
    });

    it('should create new instance after reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend());
      const instance1 = getBackend('test') as MockStorageBackend;

      // Act
      resetFactory();
      const instance2 = getBackend('test') as MockStorageBackend;

      // Assert - different instances (different instanceIds)
      expect(instance1.instanceId).not.toBe(instance2.instanceId);
    });

    it('should be safe to call when no backends cached', () => {
      // Act & Assert - should not throw
      resetFactory();
      expect(isBackendCached('anything')).toBe(false);
    });
  });

  describe('resetAll', () => {
    it('should clear both registry and factory cache', () => {
      // Arrange
      registerBackend('local', () => new MockStorageBackend('local'));
      registerBackend('s3', () => new MockStorageBackend('s3'));
      getBackend('local');
      getBackend('s3');

      // Assert preconditions
      expect(isBackendCached('local')).toBe(true);
      expect(isBackendCached('s3')).toBe(true);

      // Act
      resetAll();

      // Assert - both cache and registry cleared
      expect(isBackendCached('local')).toBe(false);
      expect(isBackendCached('s3')).toBe(false);
      expect(() => getBackend('local')).toThrow(BackendNotRegisteredError);
      expect(() => getBackend('s3')).toThrow(BackendNotRegisteredError);
    });

    it('should be safe to call multiple times', () => {
      // Act & Assert - should not throw
      resetAll();
      resetAll();
      resetAll();
    });

    it('should allow fresh registration after reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend('first'));
      getBackend('test');
      resetAll();

      // Act
      registerBackend('test', () => new MockStorageBackend('second'));
      const backend = getBackend('test') as MockStorageBackend;

      // Assert
      expect(backend.name).toBe('second');
    });
  });

  describe('Factory invocation behavior', () => {
    it('should invoke factory synchronously', () => {
      // Arrange
      const events: string[] = [];
      const factory = (): IStorageBackend => {
        events.push('factory-called');
        return new MockStorageBackend();
      };
      registerBackend('sync', factory);
      events.push('before-getBackend');

      // Act
      getBackend('sync');
      events.push('after-getBackend');

      // Assert - factory called synchronously during getBackend
      expect(events).toEqual([
        'before-getBackend',
        'factory-called',
        'after-getBackend',
      ]);
    });

    it('should call factory with no arguments', () => {
      // Arrange
      const factoryFn = vi.fn(() => new MockStorageBackend());
      registerBackend('test', factoryFn);

      // Act
      getBackend('test');

      // Assert
      expect(factoryFn).toHaveBeenCalledWith();
    });
  });

  describe('Concurrent access patterns', () => {
    it('should return same instance for concurrent calls', () => {
      // Arrange
      registerBackend('concurrent', () => new MockStorageBackend());

      // Act - simulate concurrent access
      const instances = Array.from({ length: 10 }, () => getBackend('concurrent'));

      // Assert - all should be the same instance
      const first = instances[0];
      for (const instance of instances) {
        expect(instance).toBe(first);
      }
    });

    it('should handle multiple different backends accessed concurrently', () => {
      // Arrange
      const identifiers = ['a', 'b', 'c', 'd', 'e'];
      for (const id of identifiers) {
        registerBackend(id, () => new MockStorageBackend(id));
      }

      // Act - access all backends
      const backends = identifiers.map(id => ({
        id,
        backend: getBackend(id) as MockStorageBackend,
      }));

      // Assert
      for (const { id, backend } of backends) {
        expect(backend.name).toBe(id);
      }
    });
  });

  describe('Backend re-registration with cached instance', () => {
    it('should return old cached instance after re-registration until factory reset', () => {
      // Arrange
      registerBackend('test', () => new MockStorageBackend('first'));
      const firstInstance = getBackend('test') as MockStorageBackend;
      expect(firstInstance.name).toBe('first');

      // Act - re-register with new factory
      registerBackend('test', () => new MockStorageBackend('second'));

      // Assert - still returns cached first instance
      const cachedInstance = getBackend('test') as MockStorageBackend;
      expect(cachedInstance).toBe(firstInstance);
      expect(cachedInstance.name).toBe('first');

      // Act - reset factory
      resetFactory();

      // Assert - now returns new instance
      const newInstance = getBackend('test') as MockStorageBackend;
      expect(newInstance.name).toBe('second');
      expect(newInstance).not.toBe(firstInstance);
    });
  });
});
