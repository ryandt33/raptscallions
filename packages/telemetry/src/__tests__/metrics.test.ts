import { describe, it, expect } from 'vitest';

import { getMeter } from '../metrics.js';

describe('Meter', () => {
  it('should create meter with given name', () => {
    const meter = getMeter('test-service');
    expect(meter).toBeDefined();
    expect(meter.createCounter).toBeDefined();
    expect(meter.createHistogram).toBeDefined();
    expect(meter.createGauge).toBeDefined();
  });

  it('should return same meter instance for same name', () => {
    const meter1 = getMeter('test-service');
    const meter2 = getMeter('test-service');
    expect(meter1).toBe(meter2);
  });

  it('should return different meter instances for different names', () => {
    const meter1 = getMeter('service-1');
    const meter2 = getMeter('service-2');
    expect(meter1).not.toBe(meter2);
  });

  describe('Counter', () => {
    it('should create no-op counter', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter');

      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
    });

    it('should create counter with description', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter', {
        description: 'Test counter description'
      });

      expect(counter).toBeDefined();
    });

    it('should allow adding value without throwing', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter');

      expect(() => {
        counter.add(1);
      }).not.toThrow();
    });

    it('should allow adding value with attributes without throwing', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter');

      expect(() => {
        counter.add(5, { label: 'test', status: 'success' });
      }).not.toThrow();
    });

    it('should accept zero value', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter');

      expect(() => {
        counter.add(0);
      }).not.toThrow();
    });

    it('should accept large values', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('test-counter');

      expect(() => {
        counter.add(1000000);
      }).not.toThrow();
    });
  });

  describe('Histogram', () => {
    it('should create no-op histogram', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram');

      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
    });

    it('should create histogram with description', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram', {
        description: 'Test histogram description'
      });

      expect(histogram).toBeDefined();
    });

    it('should allow recording value without throwing', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram');

      expect(() => {
        histogram.record(100);
      }).not.toThrow();
    });

    it('should allow recording value with attributes without throwing', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram');

      expect(() => {
        histogram.record(200, { label: 'test', endpoint: '/api/users' });
      }).not.toThrow();
    });

    it('should accept decimal values', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram');

      expect(() => {
        histogram.record(123.456);
      }).not.toThrow();
    });

    it('should accept negative values', () => {
      const meter = getMeter('test-service');
      const histogram = meter.createHistogram('test-histogram');

      expect(() => {
        histogram.record(-50);
      }).not.toThrow();
    });
  });

  describe('Gauge', () => {
    it('should create no-op gauge', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge');

      expect(gauge).toBeDefined();
      expect(gauge.record).toBeDefined();
    });

    it('should create gauge with description', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge', {
        description: 'Test gauge description'
      });

      expect(gauge).toBeDefined();
    });

    it('should allow recording value without throwing', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge');

      expect(() => {
        gauge.record(50);
      }).not.toThrow();
    });

    it('should allow recording value with attributes without throwing', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge');

      expect(() => {
        gauge.record(75, { region: 'us-east-1' });
      }).not.toThrow();
    });

    it('should accept zero value', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge');

      expect(() => {
        gauge.record(0);
      }).not.toThrow();
    });

    it('should accept decimal values', () => {
      const meter = getMeter('test-service');
      const gauge = meter.createGauge('test-gauge');

      expect(() => {
        gauge.record(98.6);
      }).not.toThrow();
    });
  });

  describe('Multiple instruments', () => {
    it('should create multiple counters', () => {
      const meter = getMeter('test-service');
      const counter1 = meter.createCounter('counter-1');
      const counter2 = meter.createCounter('counter-2');

      expect(counter1).toBeDefined();
      expect(counter2).toBeDefined();
    });

    it('should create instruments of different types', () => {
      const meter = getMeter('test-service');
      const counter = meter.createCounter('requests-total');
      const histogram = meter.createHistogram('request-duration');
      const gauge = meter.createGauge('active-connections');

      expect(counter).toBeDefined();
      expect(histogram).toBeDefined();
      expect(gauge).toBeDefined();

      // Should all work without throwing
      expect(() => {
        counter.add(1);
        histogram.record(150);
        gauge.record(10);
      }).not.toThrow();
    });
  });
});
