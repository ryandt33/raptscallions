/**
 * Tests for storage-specific error classes
 */

import { AppError } from '@raptscallions/core';
import { describe, it, expect } from 'vitest';

import {
  StorageError,
  QuotaExceededError,
  FileNotFoundError,
  InvalidFileTypeError,
  BackendNotRegisteredError,
  StorageErrorCode,
} from '../errors.js';

describe('Storage Error Classes', () => {
  describe('StorageError', () => {
    it('should create error with message and default status code 500', () => {
      // Arrange & Act
      const error = new StorageError('Connection failed');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('StorageError');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(StorageErrorCode.STORAGE_ERROR);
    });

    it('should include details when provided', () => {
      // Arrange
      const details = { bucket: 'my-bucket', operation: 'upload' };

      // Act
      const error = new StorageError('Backend error', details);

      // Assert
      expect(error.details).toEqual(details);
    });

    it('should work without details', () => {
      // Arrange & Act
      const error = new StorageError('Generic error');

      // Assert
      expect(error.details).toBeUndefined();
    });

    it('should work with instanceof checks', () => {
      // Arrange & Act
      const error = new StorageError('Test');

      // Assert
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
      expect(error instanceof StorageError).toBe(true);
    });
  });

  describe('QuotaExceededError', () => {
    it('should create error with default message and status code 403', () => {
      // Arrange & Act
      const error = new QuotaExceededError();

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(QuotaExceededError);
      expect(error.message).toBe('Storage quota exceeded');
      expect(error.name).toBe('QuotaExceededError');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
    });

    it('should accept custom message', () => {
      // Arrange & Act
      const error = new QuotaExceededError('User quota limit reached');

      // Assert
      expect(error.message).toBe('User quota limit reached');
    });

    it('should include usage details when provided', () => {
      // Arrange
      const details = {
        currentUsage: 1024 * 1024 * 100, // 100MB
        quotaLimit: 1024 * 1024 * 100, // 100MB
        requestedSize: 1024 * 1024 * 10, // 10MB
      };

      // Act
      const error = new QuotaExceededError('Quota exceeded', details);

      // Assert
      expect(error.details).toEqual(details);
    });

    it('should work without details', () => {
      // Arrange & Act
      const error = new QuotaExceededError();

      // Assert
      expect(error.details).toBeUndefined();
    });
  });

  describe('FileNotFoundError', () => {
    it('should create error with key in message and status code 404', () => {
      // Arrange & Act
      const error = new FileNotFoundError('uploads/document.pdf');

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(FileNotFoundError);
      expect(error.message).toBe('File not found in storage: uploads/document.pdf');
      expect(error.name).toBe('FileNotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(StorageErrorCode.FILE_NOT_FOUND);
    });

    it('should include key in details', () => {
      // Arrange & Act
      const error = new FileNotFoundError('assets/image.png');

      // Assert
      expect(error.details).toEqual({ key: 'assets/image.png' });
    });

    it('should handle various key formats', () => {
      // Arrange
      const keys = [
        'simple.txt',
        'path/to/file.pdf',
        'deeply/nested/path/to/document.docx',
        'special-chars_123.json',
      ];

      // Act & Assert
      for (const key of keys) {
        const error = new FileNotFoundError(key);
        expect(error.message).toContain(key);
        expect(error.details).toEqual({ key });
      }
    });
  });

  describe('InvalidFileTypeError', () => {
    it('should create error with provided type and status code 400', () => {
      // Arrange & Act
      const error = new InvalidFileTypeError('application/x-executable');

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(InvalidFileTypeError);
      expect(error.message).toBe('Invalid file type: application/x-executable');
      expect(error.name).toBe('InvalidFileTypeError');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(StorageErrorCode.INVALID_FILE_TYPE);
    });

    it('should include allowed types in message when provided', () => {
      // Arrange
      const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];

      // Act
      const error = new InvalidFileTypeError('video/mp4', allowedTypes);

      // Assert
      expect(error.message).toBe(
        'Invalid file type: video/mp4. Allowed types: image/png, image/jpeg, application/pdf'
      );
    });

    it('should include provided type and allowed types in details', () => {
      // Arrange
      const allowedTypes = ['text/plain', 'text/csv'];

      // Act
      const error = new InvalidFileTypeError('text/html', allowedTypes);

      // Assert
      expect(error.details).toEqual({
        providedType: 'text/html',
        allowedTypes: ['text/plain', 'text/csv'],
      });
    });

    it('should work without allowed types list', () => {
      // Arrange & Act
      const error = new InvalidFileTypeError('application/octet-stream');

      // Assert
      expect(error.message).toBe('Invalid file type: application/octet-stream');
      expect(error.details).toEqual({
        providedType: 'application/octet-stream',
        allowedTypes: undefined,
      });
    });
  });

  describe('BackendNotRegisteredError', () => {
    it('should create error with identifier and available backends', () => {
      // Arrange & Act
      const error = new BackendNotRegisteredError('azure', ['local', 's3']);

      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(BackendNotRegisteredError);
      expect(error.message).toBe(
        'Storage backend not registered: "azure". Available backends: local, s3'
      );
      expect(error.name).toBe('BackendNotRegisteredError');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(StorageErrorCode.BACKEND_NOT_REGISTERED);
    });

    it('should include identifier and available backends in details', () => {
      // Arrange & Act
      const error = new BackendNotRegisteredError('minio', ['local', 's3', 'gcs']);

      // Assert
      expect(error.details).toEqual({
        requestedBackend: 'minio',
        availableBackends: ['local', 's3', 'gcs'],
      });
    });

    it('should handle empty available backends list', () => {
      // Arrange & Act
      const error = new BackendNotRegisteredError('s3', []);

      // Assert
      expect(error.message).toBe(
        'Storage backend not registered: "s3". No backends are currently registered.'
      );
      expect(error.details).toEqual({
        requestedBackend: 's3',
        availableBackends: [],
      });
    });

    it('should handle single available backend', () => {
      // Arrange & Act
      const error = new BackendNotRegisteredError('s3', ['local']);

      // Assert
      expect(error.message).toBe(
        'Storage backend not registered: "s3". Available backends: local'
      );
    });
  });

  describe('Error serialization', () => {
    it('should serialize StorageError to JSON', () => {
      // Arrange
      const error = new StorageError('Test error', { key: 'value' });

      // Act
      const json = error.toJSON();

      // Assert
      expect(json).toEqual({
        message: 'Test error',
        code: StorageErrorCode.STORAGE_ERROR,
        statusCode: 500,
        details: { key: 'value' },
      });
    });

    it('should serialize QuotaExceededError to JSON', () => {
      // Arrange
      const error = new QuotaExceededError('Quota exceeded', {
        currentUsage: 100,
        quotaLimit: 100,
      });

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      expect(json.statusCode).toBe(403);
      expect(json.details).toEqual({ currentUsage: 100, quotaLimit: 100 });
    });

    it('should serialize FileNotFoundError to JSON', () => {
      // Arrange
      const error = new FileNotFoundError('test.pdf');

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe(StorageErrorCode.FILE_NOT_FOUND);
      expect(json.statusCode).toBe(404);
      expect(json.details).toEqual({ key: 'test.pdf' });
    });

    it('should serialize InvalidFileTypeError to JSON', () => {
      // Arrange
      const error = new InvalidFileTypeError('video/mp4', ['image/png']);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe(StorageErrorCode.INVALID_FILE_TYPE);
      expect(json.statusCode).toBe(400);
      expect(json.details).toEqual({
        providedType: 'video/mp4',
        allowedTypes: ['image/png'],
      });
    });

    it('should serialize BackendNotRegisteredError to JSON', () => {
      // Arrange
      const error = new BackendNotRegisteredError('unknown', ['local']);

      // Act
      const json = error.toJSON();

      // Assert
      expect(json.code).toBe(StorageErrorCode.BACKEND_NOT_REGISTERED);
      expect(json.statusCode).toBe(500);
      expect(json.details).toEqual({
        requestedBackend: 'unknown',
        availableBackends: ['local'],
      });
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper prototype chain for all error types', () => {
      // Arrange
      const errors = [
        new StorageError('test'),
        new QuotaExceededError(),
        new FileNotFoundError('test'),
        new InvalidFileTypeError('test'),
        new BackendNotRegisteredError('test', []),
      ];

      // Act & Assert
      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.stack).toBeDefined();
      }
    });

    it('should distinguish between error types', () => {
      // Arrange
      const quotaError = new QuotaExceededError();
      const fileNotFoundError = new FileNotFoundError('test');
      const invalidTypeError = new InvalidFileTypeError('test');

      // Assert
      expect(quotaError).toBeInstanceOf(QuotaExceededError);
      expect(quotaError).not.toBeInstanceOf(FileNotFoundError);
      expect(quotaError).not.toBeInstanceOf(InvalidFileTypeError);

      expect(fileNotFoundError).toBeInstanceOf(FileNotFoundError);
      expect(fileNotFoundError).not.toBeInstanceOf(QuotaExceededError);
      expect(fileNotFoundError).not.toBeInstanceOf(InvalidFileTypeError);

      expect(invalidTypeError).toBeInstanceOf(InvalidFileTypeError);
      expect(invalidTypeError).not.toBeInstanceOf(QuotaExceededError);
      expect(invalidTypeError).not.toBeInstanceOf(FileNotFoundError);
    });
  });

  describe('StorageErrorCode constants', () => {
    it('should export all expected error codes', () => {
      // Assert
      expect(StorageErrorCode.STORAGE_ERROR).toBe('STORAGE_ERROR');
      expect(StorageErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
      expect(StorageErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(StorageErrorCode.INVALID_FILE_TYPE).toBe('INVALID_FILE_TYPE');
      expect(StorageErrorCode.BACKEND_NOT_REGISTERED).toBe('BACKEND_NOT_REGISTERED');
    });
  });
});
