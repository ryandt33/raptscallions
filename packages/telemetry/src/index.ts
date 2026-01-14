// @raptscallions/telemetry - OpenTelemetry observability stubs

import { getLogger } from './logger.js';

import type { TelemetryConfig } from './types.js';

// Re-export all types
export type * from './types.js';

// Re-export logger functions
export { getLogger } from './logger.js';

// Export default logger instance for convenience
export const logger = getLogger('raptscallions');

// Re-export tracing functions
export { getTracer } from './tracing.js';

// Re-export metrics functions
export { getMeter } from './metrics.js';

/**
 * Initialize telemetry subsystems
 *
 * @param config - Telemetry configuration
 *
 * @remarks
 * This is a stub implementation that does nothing.
 * Logger is always available via getLogger().
 * Tracing and metrics are no-op stubs.
 *
 * TODO: Implement full OpenTelemetry initialization:
 * - TracerProvider with OTLP exporters
 * - MeterProvider with OTLP exporters
 * - LoggerProvider with OTLP exporters
 * - Context propagation setup
 * - Resource detection (service.name, deployment.environment, etc.)
 */
export function initTelemetry(config: TelemetryConfig): void {
  // No-op stub - just validate config shape
  if (!config.serviceName) {
    throw new Error('serviceName is required in TelemetryConfig');
  }

  // TODO: Initialize OpenTelemetry SDK
  // - Set up providers
  // - Configure exporters
  // - Register instrumentations
}
