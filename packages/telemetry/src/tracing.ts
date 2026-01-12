import type { Tracer, Span, SpanOptions, Metadata } from './types.js';

/**
 * No-op span implementation
 *
 * @remarks
 * This is a stub that does nothing.
 * TODO: Replace with OpenTelemetry Span in future epic.
 */
class NoOpSpan implements Span {
  setAttribute(_key: string, _value: unknown): void {
    // No-op stub
  }

  setAttributes(_attributes: Metadata): void {
    // No-op stub
  }

  addEvent(_name: string, _attributes?: Metadata): void {
    // No-op stub
  }

  end(): void {
    // No-op stub
  }

  isRecording(): boolean {
    return false;
  }
}

/**
 * No-op tracer implementation
 *
 * @remarks
 * This is a stub that returns no-op spans.
 * TODO: Replace with OpenTelemetry Tracer in future epic.
 */
class NoOpTracer implements Tracer {
  constructor(private name: string) {}

  startSpan(_name: string, _options?: SpanOptions): Span {
    return new NoOpSpan();
  }

  startActiveSpan<T>(name: string, fn: (span: Span) => T): T {
    const span = new NoOpSpan();
    try {
      return fn(span);
    } finally {
      span.end();
    }
  }
}

const tracers = new Map<string, Tracer>();

/**
 * Get or create a tracer instance
 *
 * @param name - Tracer name (typically service or module name)
 * @returns Tracer instance
 *
 * @remarks
 * Returns a no-op tracer for development.
 * TODO: Replace with OpenTelemetry Tracer Provider in future epic.
 */
export function getTracer(name: string): Tracer {
  let tracer = tracers.get(name);
  if (!tracer) {
    tracer = new NoOpTracer(name);
    tracers.set(name, tracer);
  }
  return tracer;
}
