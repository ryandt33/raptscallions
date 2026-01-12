import { describe, it, expect } from 'vitest';
import { initTelemetry, getLogger, getTracer, getMeter } from '../index.js';
import type { TelemetryConfig, Logger, Tracer, Meter, Span } from '../index.js';

describe('Package exports', () => {
  it('should export initTelemetry function', () => {
    expect(initTelemetry).toBeDefined();
    expect(typeof initTelemetry).toBe('function');
  });

  it('should export getLogger function', () => {
    expect(getLogger).toBeDefined();
    expect(typeof getLogger).toBe('function');
  });

  it('should export getTracer function', () => {
    expect(getTracer).toBeDefined();
    expect(typeof getTracer).toBe('function');
  });

  it('should export getMeter function', () => {
    expect(getMeter).toBeDefined();
    expect(typeof getMeter).toBe('function');
  });
});

describe('Type exports', () => {
  it('should export TelemetryConfig type', () => {
    // TypeScript compile-time check
    const config: TelemetryConfig = {
      serviceName: 'test-service'
    };
    expect(config).toBeDefined();
  });

  it('should export Logger interface', () => {
    // TypeScript compile-time check
    const logger: Logger = getLogger('test');
    expect(logger).toBeDefined();
  });

  it('should export Tracer interface', () => {
    // TypeScript compile-time check
    const tracer: Tracer = getTracer('test');
    expect(tracer).toBeDefined();
  });

  it('should export Meter interface', () => {
    // TypeScript compile-time check
    const meter: Meter = getMeter('test');
    expect(meter).toBeDefined();
  });

  it('should export Span interface', () => {
    // TypeScript compile-time check
    const tracer = getTracer('test');
    const span: Span = tracer.startSpan('test-span');
    expect(span).toBeDefined();
  });
});

describe('initTelemetry', () => {
  it('should require serviceName in config', () => {
    expect(() => {
      initTelemetry({ serviceName: '' });
    }).toThrow('serviceName is required');
  });

  it('should throw error for missing serviceName', () => {
    expect(() => {
      initTelemetry({} as TelemetryConfig);
    }).toThrow('serviceName is required');
  });

  it('should accept valid config without throwing', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        environment: 'development',
      });
    }).not.toThrow();
  });

  it('should accept minimal config with only serviceName', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
      });
    }).not.toThrow();
  });

  it('should accept config with all optional fields', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        environment: 'production',
        enableTracing: true,
        enableMetrics: true,
        enableLogging: true,
      });
    }).not.toThrow();
  });

  it('should accept config with partial optional fields', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        enableTracing: false,
      });
    }).not.toThrow();
  });

  it('should accept various environment values', () => {
    expect(() => {
      initTelemetry({ serviceName: 'test', environment: 'development' });
      initTelemetry({ serviceName: 'test', environment: 'staging' });
      initTelemetry({ serviceName: 'test', environment: 'production' });
    }).not.toThrow();
  });

  it('should accept config with enableTracing false', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        enableTracing: false,
      });
    }).not.toThrow();
  });

  it('should accept config with enableMetrics false', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        enableMetrics: false,
      });
    }).not.toThrow();
  });

  it('should accept config with enableLogging false', () => {
    expect(() => {
      initTelemetry({
        serviceName: 'test-service',
        enableLogging: false,
      });
    }).not.toThrow();
  });
});

describe('Integration', () => {
  it('should allow using logger after initialization', () => {
    initTelemetry({ serviceName: 'test-service' });
    const logger = getLogger('test');

    expect(() => {
      logger.info('Test message');
    }).not.toThrow();
  });

  it('should allow using tracer after initialization', () => {
    initTelemetry({ serviceName: 'test-service' });
    const tracer = getTracer('test');

    expect(() => {
      const span = tracer.startSpan('test-span');
      span.end();
    }).not.toThrow();
  });

  it('should allow using meter after initialization', () => {
    initTelemetry({ serviceName: 'test-service' });
    const meter = getMeter('test');

    expect(() => {
      const counter = meter.createCounter('test-counter');
      counter.add(1);
    }).not.toThrow();
  });

  it('should allow using functions without initialization', () => {
    // Stubs should work even without calling initTelemetry
    const logger = getLogger('test');
    const tracer = getTracer('test');
    const meter = getMeter('test');

    expect(() => {
      logger.info('Test');
      tracer.startSpan('test').end();
      meter.createCounter('test').add(1);
    }).not.toThrow();
  });
});
