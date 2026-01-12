import type { Meter, Counter, Histogram, Gauge, Metadata } from './types.js';

/**
 * No-op counter implementation
 */
class NoOpCounter implements Counter {
  add(_value: number, _attributes?: Metadata): void {
    // No-op stub
  }
}

/**
 * No-op histogram implementation
 */
class NoOpHistogram implements Histogram {
  record(_value: number, _attributes?: Metadata): void {
    // No-op stub
  }
}

/**
 * No-op gauge implementation
 */
class NoOpGauge implements Gauge {
  record(_value: number, _attributes?: Metadata): void {
    // No-op stub
  }
}

/**
 * No-op meter implementation
 *
 * @remarks
 * This is a stub that returns no-op metric instruments.
 * TODO: Replace with OpenTelemetry Meter in future epic.
 */
class NoOpMeter implements Meter {
  constructor(private name: string) {}

  createCounter(_name: string, _options?: { description?: string }): Counter {
    return new NoOpCounter();
  }

  createHistogram(_name: string, _options?: { description?: string }): Histogram {
    return new NoOpHistogram();
  }

  createGauge(_name: string, _options?: { description?: string }): Gauge {
    return new NoOpGauge();
  }
}

const meters = new Map<string, Meter>();

/**
 * Get or create a meter instance
 *
 * @param name - Meter name (typically service or module name)
 * @returns Meter instance
 *
 * @remarks
 * Returns a no-op meter for development.
 * TODO: Replace with OpenTelemetry Meter Provider in future epic.
 */
export function getMeter(name: string): Meter {
  let meter = meters.get(name);
  if (!meter) {
    meter = new NoOpMeter(name);
    meters.set(name, meter);
  }
  return meter;
}
