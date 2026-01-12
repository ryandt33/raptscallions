/**
 * Configuration for telemetry initialization
 */
export interface TelemetryConfig {
  /** Service name for telemetry attribution */
  serviceName: string;

  /** Deployment environment (development, staging, production) */
  environment?: string;

  /** Enable tracing subsystem */
  enableTracing?: boolean;

  /** Enable metrics subsystem */
  enableMetrics?: boolean;

  /** Enable logging subsystem (always on for stub) */
  enableLogging?: boolean;
}

/**
 * Metadata for log entries and spans
 */
export type Metadata = Record<string, unknown>;

/**
 * Log levels in order of severity
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Logger interface for structured logging
 *
 * Supports two calling patterns:
 * 1. Standard: logger.info("message", { meta: "data" })
 * 2. Pino-style: logger.info({ meta: "data" }, "message")
 */
export interface Logger {
  trace(message: string, meta?: Metadata): void;
  trace(meta: Metadata, message: string): void;
  debug(message: string, meta?: Metadata): void;
  debug(meta: Metadata, message: string): void;
  info(message: string, meta?: Metadata): void;
  info(meta: Metadata, message: string): void;
  warn(message: string, meta?: Metadata): void;
  warn(meta: Metadata, message: string): void;
  error(message: string, meta?: Metadata): void;
  error(meta: Metadata, message: string): void;
  fatal(message: string, meta?: Metadata): void;
  fatal(meta: Metadata, message: string): void;
}

/**
 * Span options for tracing
 */
export interface SpanOptions {
  attributes?: Metadata;
  parent?: Span;
}

/**
 * Span interface for distributed tracing
 *
 * @remarks
 * This is a stub implementation. Full OpenTelemetry Span will be implemented later.
 */
export interface Span {
  setAttribute(key: string, value: unknown): void;
  setAttributes(attributes: Metadata): void;
  addEvent(name: string, attributes?: Metadata): void;
  end(): void;
  isRecording(): boolean;
}

/**
 * Tracer interface for creating spans
 *
 * @remarks
 * This is a stub implementation. Full OpenTelemetry Tracer will be implemented later.
 */
export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
}

/**
 * Metric instrument types
 */
export interface Counter {
  add(value: number, attributes?: Metadata): void;
}

export interface Histogram {
  record(value: number, attributes?: Metadata): void;
}

export interface Gauge {
  record(value: number, attributes?: Metadata): void;
}

/**
 * Meter interface for creating metrics
 *
 * @remarks
 * This is a stub implementation. Full OpenTelemetry Meter will be implemented later.
 */
export interface Meter {
  createCounter(name: string, options?: { description?: string }): Counter;
  createHistogram(name: string, options?: { description?: string }): Histogram;
  createGauge(name: string, options?: { description?: string }): Gauge;
}
