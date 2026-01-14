# @raptscallions/telemetry

OpenTelemetry-based observability package for RaptScallions, providing tracing, metrics, and structured logging.

> **Current Status:** This is a **stub implementation** with a functional API contract. Full OpenTelemetry integration will be implemented in a future epic.

## Features

- **Structured Logging** - Console-based logger with timestamps, metadata, and log levels
- **Distributed Tracing** - No-op tracer stub compatible with OpenTelemetry API
- **Metrics Collection** - No-op meter stub for counters, histograms, and gauges
- **Type-Safe API** - Comprehensive TypeScript interfaces with zero `any` types
- **Future-Ready** - API surface designed for drop-in OpenTelemetry replacement

## Installation

This package is part of the RaptScallions monorepo and is not published to npm separately.

```bash
# Install from monorepo
pnpm install
```

## Usage

### Initialize Telemetry

```typescript
import { initTelemetry } from "@raptscallions/telemetry";

// Initialize with service configuration
initTelemetry({
  serviceName: "api-server",
  environment: "production",
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
});
```

### Structured Logging

```typescript
import { getLogger } from "@raptscallions/telemetry";

const logger = getLogger("user-service");

// Log with metadata
logger.info("User created", { userId: "123", email: "user@example.com" });
logger.warn("Rate limit exceeded", { userId: "123", limit: 100 });
logger.error("Database connection failed", { error: err.message });

// Available log levels
logger.trace("Detailed trace information");
logger.debug("Debug information");
logger.info("General information");
logger.warn("Warning messages");
logger.error("Error messages");
logger.fatal("Fatal errors");
```

**Current Output:** Logs to console with format:

```
2025-01-12T10:30:45.123Z [user-service] INFO: User created {"userId":"123","email":"user@example.com"}
```

### Distributed Tracing

```typescript
import { getTracer } from "@raptscallions/telemetry";

const tracer = getTracer("api-server");

// Manual span management
const span = tracer.startSpan("database-query");
try {
  span.setAttribute("query", "SELECT * FROM users");
  span.setAttribute("user_id", userId);

  const result = await db.query.users.findMany();

  span.addEvent("query-completed", { rowCount: result.length });
  return result;
} finally {
  span.end();
}

// Automatic span management with callback
const result = tracer.startActiveSpan("http-request", (span) => {
  span.setAttribute("http.method", "POST");
  span.setAttribute("http.url", "/api/users");

  return processRequest();
  // span.end() is called automatically
});
```

**Current Behavior:** No-op stub that maintains the API contract without recording traces.

### Metrics Collection

```typescript
import { getMeter } from "@raptscallions/telemetry";

const meter = getMeter("api-server");

// Counter - monotonically increasing values
const requestCounter = meter.createCounter("http_requests_total", {
  description: "Total HTTP requests",
});
requestCounter.add(1, { method: "GET", path: "/api/users" });

// Histogram - statistical distribution
const responseTime = meter.createHistogram("http_response_time_ms", {
  description: "HTTP response time in milliseconds",
});
responseTime.record(42.5, { method: "GET", status: "200" });

// Gauge - point-in-time values
const activeConnections = meter.createGauge("active_connections", {
  description: "Current active connections",
});
activeConnections.record(150);
```

**Current Behavior:** No-op stub that maintains the API contract without recording metrics.

## API Reference

### Types

#### `TelemetryConfig`

Configuration for telemetry initialization.

```typescript
interface TelemetryConfig {
  serviceName: string; // Service name for telemetry attribution
  environment?: string; // Deployment environment (development, staging, production)
  enableTracing?: boolean; // Enable tracing subsystem
  enableMetrics?: boolean; // Enable metrics subsystem
  enableLogging?: boolean; // Enable logging subsystem (always on for stub)
}
```

#### `Logger`

Structured logger interface.

```typescript
interface Logger {
  trace(message: string, meta?: Metadata): void;
  debug(message: string, meta?: Metadata): void;
  info(message: string, meta?: Metadata): void;
  warn(message: string, meta?: Metadata): void;
  error(message: string, meta?: Metadata): void;
  fatal(message: string, meta?: Metadata): void;
}
```

#### `Tracer`

Distributed tracing interface.

```typescript
interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
  startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
}
```

#### `Meter`

Metrics collection interface.

```typescript
interface Meter {
  createCounter(name: string, options?: { description?: string }): Counter;
  createHistogram(name: string, options?: { description?: string }): Histogram;
  createGauge(name: string, options?: { description?: string }): Gauge;
}
```

### Functions

#### `initTelemetry(config: TelemetryConfig): void`

Initialize telemetry subsystems with the provided configuration.

**Validation:** Throws `Error` if `serviceName` is empty or missing.

#### `getLogger(name: string): Logger`

Get or create a logger instance. Returns the same instance for the same name (singleton pattern).

**Parameters:**

- `name` - Logger name, typically service or module name

**Returns:** Logger instance

#### `getTracer(name: string): Tracer`

Get or create a tracer instance. Returns the same instance for the same name (singleton pattern).

**Parameters:**

- `name` - Tracer name, typically service or module name

**Returns:** Tracer instance (currently no-op stub)

#### `getMeter(name: string): Meter`

Get or create a meter instance. Returns the same instance for the same name (singleton pattern).

**Parameters:**

- `name` - Meter name, typically service or module name

**Returns:** Meter instance (currently no-op stub)

## Development

### Build

```bash
# From package directory
pnpm build

# From root
pnpm --filter @raptscallions/telemetry build
```

### Test

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

### Type Checking

```bash
# From package directory
pnpm typecheck

# From root
pnpm --filter @raptscallions/telemetry typecheck
```

## Implementation Status

### ✅ Completed (Stub)

- [x] Type definitions for all telemetry components
- [x] Logger with console-based output
- [x] Tracer stub with OpenTelemetry-compatible API
- [x] Metrics stub with OpenTelemetry-compatible API
- [x] Initialization function with validation
- [x] Comprehensive test suite (76 tests, 100% coverage)
- [x] TSDoc documentation for all public APIs

### 🚧 Future Work (Full OpenTelemetry Implementation)

The following features will be implemented in a future epic:

- [ ] **Tracing:** TracerProvider with OTLP exporters
- [ ] **Metrics:** MeterProvider with OTLP exporters
- [ ] **Logging:** LoggerProvider with OTLP exporters (replace console)
- [ ] **Context Propagation:** W3C Trace Context for distributed tracing
- [ ] **Instrumentation:** Auto-instrumentation for HTTP, database, Redis, etc.
- [ ] **Sampling:** Configurable sampling strategies (head-based, tail-based)
- [ ] **Batching:** Batch exporters for performance optimization
- [ ] **Resource Detection:** Automatic detection of service.name, deployment.environment, host, container, etc.

## Technical Details

### Design Principles

1. **OpenTelemetry-First:** API surface matches OpenTelemetry conventions for seamless migration
2. **Type Safety:** Zero `any` types, comprehensive TypeScript interfaces
3. **Singleton Pattern:** Named loggers, tracers, and meters use singleton instances
4. **No External Dependencies:** Stub implementation has zero runtime dependencies
5. **Developer-Friendly:** Logger provides immediate console feedback; traces/metrics fail silently

### Why Stub First?

This stub implementation allows:

- **Early Integration:** Other packages can import and use telemetry immediately
- **API Contract:** Establishes stable API before complex OpenTelemetry integration
- **Development Velocity:** Console logging works out-of-the-box without external services
- **Zero Risk:** No breaking changes when replacing stub with full implementation

### File Structure

```
packages/telemetry/
├── src/
│   ├── types.ts           # TypeScript interfaces and types
│   ├── logger.ts          # Console-based logger implementation
│   ├── tracing.ts         # No-op tracer stub
│   ├── metrics.ts         # No-op meter stub
│   ├── index.ts           # Main entry point
│   └── __tests__/
│       ├── logger.test.ts
│       ├── tracing.test.ts
│       ├── metrics.test.ts
│       └── index.test.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md              # This file
```

## Contributing

When contributing to this package:

1. **Maintain Type Safety:** Never use `any` type
2. **Follow AAA Pattern:** All tests use Arrange-Act-Assert structure
3. **Document Public APIs:** Add TSDoc comments with `@remarks` for stubs
4. **Consider Future Migration:** Keep API compatible with OpenTelemetry
5. **Test Coverage:** Maintain 80%+ line coverage (current: 100%)

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
- [Project Architecture](../../docs/ARCHITECTURE.md)
- [Code Conventions](../../docs/CONVENTIONS.md)

## License

[License information to be added]
