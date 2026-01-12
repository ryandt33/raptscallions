import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { getLogger } from '../logger.js';

describe('Logger', () => {
  let consoleInfoSpy: MockInstance;
  let consoleDebugSpy: MockInstance;
  let consoleWarnSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create logger with given name', () => {
    const logger = getLogger('test-service');
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.trace).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.fatal).toBeDefined();
  });

  it('should return same logger instance for same name', () => {
    const logger1 = getLogger('test-service');
    const logger2 = getLogger('test-service');
    expect(logger1).toBe(logger2);
  });

  it('should return different logger instances for different names', () => {
    const logger1 = getLogger('service-1');
    const logger2 = getLogger('service-2');
    expect(logger1).not.toBe(logger2);
  });

  it('should log info messages to console.info', () => {
    const logger = getLogger('test-service');
    logger.info('test message', { userId: '123' });

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const output = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('test-service');
    expect(output).toContain('INFO');
    expect(output).toContain('test message');
    expect(output).toContain('"userId":"123"');
  });

  it('should log debug messages to console.debug', () => {
    const logger = getLogger('test-service');
    logger.debug('debug message');

    expect(consoleDebugSpy).toHaveBeenCalledOnce();
    const output = consoleDebugSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('DEBUG');
    expect(output).toContain('debug message');
  });

  it('should log trace messages to console.debug', () => {
    const logger = getLogger('test-service');
    logger.trace('trace message');

    expect(consoleDebugSpy).toHaveBeenCalledOnce();
    const output = consoleDebugSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('TRACE');
    expect(output).toContain('trace message');
  });

  it('should log warn messages to console.warn', () => {
    const logger = getLogger('test-service');
    logger.warn('warning message');

    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    const output = consoleWarnSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('WARN');
    expect(output).toContain('warning message');
  });

  it('should log error messages to console.error', () => {
    const logger = getLogger('test-service');
    logger.error('error occurred');

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('ERROR');
    expect(output).toContain('error occurred');
  });

  it('should log fatal messages to console.error', () => {
    const logger = getLogger('test-service');
    logger.fatal('fatal error');

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('FATAL');
    expect(output).toContain('fatal error');
  });

  it('should handle missing metadata gracefully', () => {
    const logger = getLogger('test-service');
    logger.info('test without meta');

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const output = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('test without meta');
    expect(output).not.toContain('undefined');
  });

  it('should include timestamp in log output', () => {
    const logger = getLogger('test-service');
    logger.info('timestamped message');

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const output = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    // ISO timestamp format: 2026-01-12T...
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should include logger name in output', () => {
    const logger = getLogger('my-custom-service');
    logger.info('test message');

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const output = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('my-custom-service');
  });

  it('should serialize metadata as JSON', () => {
    const logger = getLogger('test-service');
    logger.info('test', {
      userId: '123',
      action: 'login',
      nested: { key: 'value' }
    });

    expect(consoleInfoSpy).toHaveBeenCalledOnce();
    const output = consoleInfoSpy.mock.calls[0]?.[0] as string;
    expect(output).toBeDefined();
    expect(output).toContain('"userId":"123"');
    expect(output).toContain('"action":"login"');
    expect(output).toContain('"nested"');
  });
});
