import { describe, it, expect } from 'vitest';

import { getTracer } from '../tracing.js';

describe('Tracer', () => {
  it('should create tracer with given name', () => {
    const tracer = getTracer('test-service');
    expect(tracer).toBeDefined();
    expect(tracer.startSpan).toBeDefined();
    expect(tracer.startActiveSpan).toBeDefined();
  });

  it('should return same tracer instance for same name', () => {
    const tracer1 = getTracer('test-service');
    const tracer2 = getTracer('test-service');
    expect(tracer1).toBe(tracer2);
  });

  it('should return different tracer instances for different names', () => {
    const tracer1 = getTracer('service-1');
    const tracer2 = getTracer('service-2');
    expect(tracer1).not.toBe(tracer2);
  });

  describe('startSpan', () => {
    it('should create no-op span', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(span).toBeDefined();
      expect(span.setAttribute).toBeDefined();
      expect(span.setAttributes).toBeDefined();
      expect(span.addEvent).toBeDefined();
      expect(span.end).toBeDefined();
      expect(span.isRecording).toBeDefined();
    });

    it('should create span with options', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation', {
        attributes: { key: 'value' }
      });

      expect(span).toBeDefined();
    });

    it('should return span that reports not recording', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(span.isRecording()).toBe(false);
    });
  });

  describe('Span methods', () => {
    it('should allow setting single attribute without throwing', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(() => {
        span.setAttribute('key', 'value');
      }).not.toThrow();
    });

    it('should allow setting multiple attributes without throwing', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(() => {
        span.setAttributes({ key1: 'value1', key2: 123 });
      }).not.toThrow();
    });

    it('should allow adding event without throwing', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(() => {
        span.addEvent('test-event');
      }).not.toThrow();
    });

    it('should allow adding event with attributes without throwing', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(() => {
        span.addEvent('test-event', { detail: 'extra info' });
      }).not.toThrow();
    });

    it('should allow ending span without throwing', () => {
      const tracer = getTracer('test-service');
      const span = tracer.startSpan('test-operation');

      expect(() => {
        span.end();
      }).not.toThrow();
    });
  });

  describe('startActiveSpan', () => {
    it('should execute function with span parameter', () => {
      const tracer = getTracer('test-service');
      let spanReceived = false;

      tracer.startActiveSpan('test-op', (span): void => {
        spanReceived = true;
        expect(span).toBeDefined();
        expect(span.isRecording()).toBe(false);
      });

      expect(spanReceived).toBe(true);
    });

    it('should return function result', () => {
      const tracer = getTracer('test-service');

      const result = tracer.startActiveSpan('test-op', () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should return string result', () => {
      const tracer = getTracer('test-service');

      const result = tracer.startActiveSpan('test-op', () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should return object result', () => {
      const tracer = getTracer('test-service');

      const result = tracer.startActiveSpan('test-op', () => {
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
    });

    it('should end span automatically after function completes', () => {
      const tracer = getTracer('test-service');
      let spanWasEnded = false;

      tracer.startActiveSpan('test-op', (span): void => {
        // Override end to track if it was called
        const originalEnd = span.end;
        span.end = () => {
          spanWasEnded = true;
          originalEnd.call(span);
        };
      });

      // Note: The stub should call end() after the function returns
      // This test verifies the behavior is implemented
      expect(spanWasEnded).toBe(true);
    });

    it('should allow span operations within function', () => {
      const tracer = getTracer('test-service');

      expect(() => {
        tracer.startActiveSpan('test-op', (span): void => {
          span.setAttribute('test-key', 'test-value');
          span.addEvent('test-event');
        });
      }).not.toThrow();
    });
  });
});
