import type { Logger, Metadata, LogLevel } from './types.js';

/**
 * Parse log arguments supporting both standard and pino-style patterns:
 * - Standard: log("message", { meta })
 * - Pino-style: log({ meta }, "message")
 */
function parseLogArgs(
  arg1: string | Metadata,
  arg2?: string | Metadata
): { message: string; meta: Metadata | undefined } {
  if (typeof arg1 === 'string') {
    // Standard pattern: log("message", meta?)
    return { message: arg1, meta: arg2 as Metadata | undefined };
  } else {
    // Pino-style pattern: log(meta, "message")
    return { message: arg2 as string, meta: arg1 };
  }
}

/**
 * Console-based logger implementation
 *
 * @remarks
 * This is a stub implementation using console methods.
 * TODO: Replace with OpenTelemetry Logs API in future epic.
 *
 * Supports two calling patterns:
 * 1. Standard: logger.info("message", { meta: "data" })
 * 2. Pino-style: logger.info({ meta: "data" }, "message")
 */
/* eslint-disable no-console -- Console methods are intentional for logging implementation */
class ConsoleLogger implements Logger {
  constructor(private name: string) {}

  private format(level: LogLevel, message: string, meta?: Metadata): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${this.name}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  trace(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.debug(this.format('trace', message, meta));
  }

  debug(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.debug(this.format('debug', message, meta));
  }

  info(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.info(this.format('info', message, meta));
  }

  warn(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.warn(this.format('warn', message, meta));
  }

  error(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.error(this.format('error', message, meta));
  }

  fatal(arg1: string | Metadata, arg2?: string | Metadata): void {
    const { message, meta } = parseLogArgs(arg1, arg2);
    console.error(this.format('fatal', message, meta));
  }
}

const loggers = new Map<string, Logger>();

/**
 * Get or create a logger instance
 *
 * @param name - Logger name (typically service or module name)
 * @returns Logger instance
 *
 * @remarks
 * Returns a console-based logger for development.
 * TODO: Replace with OpenTelemetry Logger in future epic.
 */
export function getLogger(name: string): Logger {
  let logger = loggers.get(name);
  if (!logger) {
    logger = new ConsoleLogger(name);
    loggers.set(name, logger);
  }
  return logger;
}
