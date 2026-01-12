# E02-T001 Implementation Specification: Fastify API Server Foundation

**Task:** E02-T001
**Epic:** E02 - API Foundation & Authentication
**Status:** ANALYZED
**Analyst:** analyst
**Date:** 2026-01-12

---

## Overview

This task establishes the foundational Fastify API server for Raptscallions. It implements the minimal server infrastructure required for all subsequent API features including health checks, structured error handling, request logging, graceful shutdown, and environment configuration.

This is the first task in Epic E02 and blocks all other API development work (E02-T002, E02-T007). The implementation must follow the strict TypeScript conventions (zero `any`, strict mode) and use Fastify-specific patterns (not Express).

---

## Acceptance Criteria (Detailed)

### AC1: apps/api package created with TypeScript and Fastify 4.x

**What:** Create new package `apps/api` with complete TypeScript configuration

**Details:**
- Create package.json with Fastify 4.x as primary dependency
- Configure TypeScript with strict mode settings matching root config
- Set up package exports and build scripts
- Add dependencies: `fastify@^4.28.0`, `@fastify/cors`, `@raptscallions/db`, `@raptscallions/core`, `@raptscallions/telemetry`
- Add dev dependencies: `@types/node`, `tsx`, `typescript`, `vitest`

**Files Created:**
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/index.ts` (entry point)
- `apps/api/src/server.ts` (server factory)
- `apps/api/src/config.ts` (environment validation)

**Success Criteria:**
- `pnpm install` succeeds with no warnings
- `pnpm --filter @raptscallions/api build` succeeds with zero TypeScript errors
- Package resolves internal workspace dependencies correctly

---

### AC2: Server starts on PORT from environment (default 3000)

**What:** Server listens on configurable port with environment validation

**Details:**
- Read `PORT` from environment (type: number)
- Default to 3000 if not provided
- Use Zod coercion: `z.coerce.number().default(3000)`
- Validate port is in valid range (1-65535)
- Log startup message with bound address

**Implementation Pattern:**
```typescript
// src/config.ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;
export const config = envSchema.parse(process.env);
```

**Success Criteria:**
- Server starts on default port 3000 when PORT is unset
- Server starts on custom port when PORT=4000 is set
- Server throws validation error on invalid port (e.g., PORT=-1)
- Startup log shows: `Server listening on http://0.0.0.0:3000`

---

### AC3: Health check endpoint GET /health returns { status: 'ok', timestamp }

**What:** Basic health check endpoint for load balancers and monitoring

**Details:**
- Route: `GET /health`
- Response: `{ status: 'ok', timestamp: ISO8601 string }`
- Status code: 200
- No authentication required
- Always responds (even if DB/Redis are down)

**Implementation Pattern:**
```typescript
// src/routes/health.routes.ts
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });
};
```

**Success Criteria:**
- `curl http://localhost:3000/health` returns 200 with JSON body
- Response matches exact schema: `{ status: string, timestamp: string }`
- Endpoint responds in < 10ms
- No database connection required

---

### AC4: Readiness check endpoint GET /ready validates DB connection

**What:** Readiness probe that verifies critical dependencies

**Details:**
- Route: `GET /ready`
- Checks database connectivity (simple query: `SELECT 1`)
- Returns 200 if ready, 503 if not ready
- Response: `{ ready: boolean, checks: { database: 'ok' | 'error' } }`
- No authentication required
- Use queryClient from `@raptscallions/db`

**Implementation Pattern:**
```typescript
// src/routes/health.routes.ts
app.get('/ready', async (_request, reply) => {
  const checks = {
    database: 'error' as 'ok' | 'error',
  };

  try {
    // Simple connectivity check
    await queryClient.unsafe('SELECT 1');
    checks.database = 'ok';
  } catch (error) {
    logger.error({ error }, 'Database readiness check failed');
  }

  const ready = checks.database === 'ok';
  const statusCode = ready ? 200 : 503;

  return reply.status(statusCode).send({
    ready,
    checks,
  });
});
```

**Success Criteria:**
- Returns 200 when database is connected
- Returns 503 when database is unavailable
- Kubernetes readiness probe can use this endpoint
- Does not throw unhandled errors (graceful degradation)

---

### AC5: Global error handler formats errors as { error, code, details }

**What:** Centralized error handling middleware using typed errors from `@raptscallions/core`

**Details:**
- Handle `AppError` subclasses (ValidationError, NotFoundError, UnauthorizedError)
- Map error classes to appropriate HTTP status codes
- Format all errors consistently as `{ error: string, code: string, details?: unknown }`
- Log unhandled errors with full context (requestId, error stack)
- Never expose internal error details in production

**Implementation Pattern:**
```typescript
// src/middleware/error-handler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@raptscallions/core/errors';
import { getLogger } from '@raptscallions/telemetry';

const logger = getLogger('api:error-handler');

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Handle known AppError instances
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  // Log unexpected errors
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      requestId: request.id,
      method: request.method,
      url: request.url,
    },
    'Unhandled error'
  );

  // Generic 500 response
  void reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

**Register in server:**
```typescript
// src/server.ts
app.setErrorHandler(errorHandler);
```

**Success Criteria:**
- `ValidationError` returns 400 with code `VALIDATION_ERROR`
- `NotFoundError` returns 404 with code `NOT_FOUND`
- `UnauthorizedError` returns 401 with code `UNAUTHORIZED`
- Unhandled errors return 500 with generic message
- All errors logged with structured context

---

### AC6: Request logging middleware logs all requests with structured format

**What:** Log every HTTP request with timing and metadata

**Details:**
- Log request start (method, url, requestId)
- Log request completion (status, duration, userAgent)
- Use structured logging format compatible with telemetry package
- Include request ID for correlation
- Use `@raptscallions/telemetry` logger

**Implementation Pattern:**
```typescript
// src/middleware/request-logger.ts
import type { FastifyPluginAsync } from 'fastify';
import { getLogger } from '@raptscallions/telemetry';

const logger = getLogger('api:request');

export const requestLogger: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, _reply) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
      'Request started'
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.getResponseTime();

    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(responseTime),
        userAgent: request.headers['user-agent'],
      },
      'Request completed'
    );
  });
};
```

**Success Criteria:**
- Every request generates two log entries (start, completion)
- Logs include request ID for tracing
- Response time measured in milliseconds
- 404 requests are logged (not silenced)
- Structured format compatible with JSON parsing

---

### AC7: Graceful shutdown handler closes server and DB connections

**What:** Handle SIGINT/SIGTERM signals and clean up resources

**Details:**
- Listen for `SIGINT` (Ctrl+C) and `SIGTERM` (Docker stop)
- Close Fastify server (waits for in-flight requests)
- Close database connection pool
- Exit with code 0 after cleanup
- Log shutdown reason and completion

**Implementation Pattern:**
```typescript
// src/index.ts
import { getLogger } from '@raptscallions/telemetry';
import { queryClient } from '@raptscallions/db';
import { createServer } from './server.js';

const logger = getLogger('api');

async function start(): Promise<void> {
  const app = await createServer();

  try {
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    logger.info({ port: config.PORT }, 'Server listening');
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown handlers
  const signals = ['SIGINT', 'SIGTERM'] as const;
  signals.forEach((signal) => {
    process.on(signal, () => {
      void (async () => {
        logger.info({ signal }, 'Shutting down gracefully');

        try {
          // Close server (wait for in-flight requests)
          await app.close();
          logger.info('Server closed');

          // Close database connections
          await queryClient.end();
          logger.info('Database connections closed');

          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      })();
    });
  });
}

void start();
```

**Success Criteria:**
- Ctrl+C in terminal triggers graceful shutdown
- Docker stop triggers graceful shutdown (max 10s before SIGKILL)
- Server waits for in-flight requests to complete
- Database connections properly closed
- No "connection pool destroyed" warnings

---

### AC8: Environment variables validated with Zod schema on startup

**What:** Fail-fast validation of required environment configuration

**Details:**
- Validate all required env vars on startup (before server starts)
- Throw clear error messages for missing/invalid values
- Use Zod schema with helpful error messages
- Parse once, export typed config object
- Required vars: `DATABASE_URL`, `REDIS_URL`

**Implementation Pattern:**
```typescript
// src/config.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000)
    .describe('Port to listen on'),

  DATABASE_URL: z
    .string()
    .url()
    .describe('PostgreSQL connection string (required)'),

  REDIS_URL: z
    .string()
    .url()
    .describe('Redis connection string (required)'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .describe('Comma-separated list of allowed origins'),
});

export type Env = z.infer<typeof envSchema>;

// Parse and export - will throw if invalid
export const config = envSchema.parse(process.env);
```

**Error Handling:**
```typescript
// src/index.ts
try {
  const config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}
```

**Success Criteria:**
- Server refuses to start with missing `DATABASE_URL`
- Server refuses to start with invalid URL format
- Clear error messages indicate which env vars are invalid
- Valid config allows server to start
- Config is type-safe (TypeScript infers types from schema)

---

### AC9: CORS middleware configured with allowed origins

**What:** Enable cross-origin requests from frontend

**Details:**
- Use `@fastify/cors` plugin
- Parse allowed origins from `CORS_ORIGINS` env var (comma-separated)
- Allow credentials (cookies)
- Support preflight requests (OPTIONS)
- Development default: `http://localhost:5173` (Vite)

**Implementation Pattern:**
```typescript
// src/server.ts
import cors from '@fastify/cors';

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using custom logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // ... rest of setup
}
```

**Success Criteria:**
- Preflight OPTIONS requests return correct CORS headers
- Frontend at localhost:5173 can make requests
- Credentials (cookies) are allowed
- Unauthorized origins receive CORS errors
- Multiple origins supported (comma-separated)

---

### AC10: Server builds and starts without errors

**What:** End-to-end verification of package setup

**Details:**
- `pnpm install` succeeds
- `pnpm build` succeeds with zero TypeScript errors
- `pnpm dev` starts server successfully
- Server responds to health check
- No runtime warnings or errors

**Success Criteria:**
- Build completes in < 10 seconds
- No TypeScript errors (`pnpm typecheck` passes)
- Server starts in < 2 seconds
- Health endpoint responds correctly
- Clean shutdown on Ctrl+C

---

## Architecture

### Package Structure

```
apps/api/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Entry point (starts server)
│   ├── server.ts                # Server factory (testable)
│   ├── config.ts                # Environment validation
│   ├── routes/
│   │   └── health.routes.ts     # Health + readiness checks
│   └── middleware/
│       ├── error-handler.ts     # Global error handler
│       └── request-logger.ts    # Request logging hooks
└── __tests__/
    ├── server.test.ts           # Server creation tests
    └── integration/
        └── health.test.ts       # Health endpoint integration tests
```

### Dependencies

**Runtime:**
- `fastify@^4.28.0` - API framework
- `@fastify/cors@^10.0.1` - CORS plugin
- `@raptscallions/core` - Typed errors, schemas
- `@raptscallions/db` - Database client and schema
- `@raptscallions/telemetry` - Logging
- `zod@^3.22.4` - Schema validation

**Development:**
- `@types/node@^20.10.0` - Node.js types
- `tsx@^4.7.0` - TypeScript executor for dev mode
- `typescript@^5.3.0` - TypeScript compiler
- `vitest@^1.1.0` - Testing framework

### Server Lifecycle

```
1. Parse environment variables (config.ts)
   └─> Fail fast if invalid

2. Create Fastify instance (server.ts)
   ├─> Register CORS plugin
   ├─> Register request logger hooks
   ├─> Register health routes
   └─> Register error handler

3. Start listening (index.ts)
   └─> Log startup message

4. Handle requests
   ├─> onRequest hook (log start)
   ├─> Route handler
   ├─> onResponse hook (log completion)
   └─> Error handler (if error thrown)

5. Handle shutdown signals
   ├─> Close server (wait for requests)
   ├─> Close DB connections
   └─> Exit process
```

---

## Implementation Steps

### Step 1: Create Package Structure

**Files to create:**
```bash
mkdir -p apps/api/src/{routes,middleware}
mkdir -p apps/api/__tests__/integration
touch apps/api/src/{index,server,config}.ts
touch apps/api/src/routes/health.routes.ts
touch apps/api/src/middleware/{error-handler,request-logger}.ts
```

**package.json:**
```json
{
  "name": "@raptscallions/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist *.tsbuildinfo",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@raptscallions/core": "workspace:*",
    "@raptscallions/db": "workspace:*",
    "@raptscallions/telemetry": "workspace:*",
    "fastify": "^4.28.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.1.0"
  }
}
```

**tsconfig.json:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

---

### Step 2: Environment Configuration

**src/config.ts:**
```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

// Parse and validate - throws if invalid
export const config = envSchema.parse(process.env);
```

---

### Step 3: Error Handler Middleware

**src/middleware/error-handler.ts:**
```typescript
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@raptscallions/core/errors';
import { getLogger } from '@raptscallions/telemetry';

const logger = getLogger('api:error-handler');

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      requestId: request.id,
      method: request.method,
      url: request.url,
    },
    'Unhandled error'
  );

  void reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

---

### Step 4: Request Logger Middleware

**src/middleware/request-logger.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify';
import { getLogger } from '@raptscallions/telemetry';

const logger = getLogger('api:request');

export const requestLogger: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, _reply) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
      'Request started'
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    const responseTime = reply.getResponseTime();

    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(responseTime),
        userAgent: request.headers['user-agent'],
      },
      'Request completed'
    );
  });
};
```

---

### Step 5: Health Check Routes

**src/routes/health.routes.ts:**
```typescript
import type { FastifyPluginAsync } from 'fastify';
import { getLogger } from '@raptscallions/telemetry';
import { queryClient } from '@raptscallions/db';

const logger = getLogger('api:health');

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Basic health check
  app.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check (validates dependencies)
  app.get('/ready', async (_request, reply) => {
    const checks = {
      database: 'error' as 'ok' | 'error',
    };

    try {
      await queryClient.unsafe('SELECT 1');
      checks.database = 'ok';
    } catch (error) {
      logger.error({ error }, 'Database readiness check failed');
    }

    const ready = checks.database === 'ok';
    const statusCode = ready ? 200 : 503;

    return reply.status(statusCode).send({
      ready,
      checks,
    });
  });
};
```

---

### Step 6: Server Factory

**src/server.ts:**
```typescript
import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRoutes } from './routes/health.routes.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using custom logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Register request logger
  await app.register(requestLogger);

  // Register routes
  await app.register(healthRoutes);

  // Register error handler (must be last)
  app.setErrorHandler(errorHandler);

  return app;
}
```

---

### Step 7: Entry Point with Graceful Shutdown

**src/index.ts:**
```typescript
import { getLogger } from '@raptscallions/telemetry';
import { queryClient } from '@raptscallions/db';
import { config } from './config.js';
import { createServer } from './server.js';

const logger = getLogger('api');

async function start(): Promise<void> {
  const app = await createServer();

  try {
    await app.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    logger.info(
      {
        port: config.PORT,
        env: config.NODE_ENV,
      },
      'Server listening'
    );
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown handlers
  const signals = ['SIGINT', 'SIGTERM'] as const;
  signals.forEach((signal) => {
    process.on(signal, () => {
      void (async () => {
        logger.info({ signal }, 'Shutting down gracefully');

        try {
          await app.close();
          logger.info('Server closed');

          await queryClient.end();
          logger.info('Database connections closed');

          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during shutdown');
          process.exit(1);
        }
      })();
    });
  });
}

// Handle startup errors
try {
  void start();
} catch (error) {
  logger.fatal({ error }, 'Startup failed');
  process.exit(1);
}
```

---

## Testing Strategy

### Unit Tests

**Test File:** `__tests__/server.test.ts`

**Test Cases:**
1. Server creation succeeds
2. Error handler formats AppError correctly
3. Error handler formats unknown errors as 500
4. Request logger hooks registered
5. CORS configuration applied

**Example:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from '../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Server', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createServer();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create server instance', () => {
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
  });

  it('should have health routes registered', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
    });
  });
});
```

---

### Integration Tests

**Test File:** `__tests__/integration/health.test.ts`

**Test Cases:**
1. GET /health returns 200 with status and timestamp
2. GET /ready returns 200 when database is connected
3. GET /ready returns 503 when database is unavailable
4. CORS headers present on responses
5. Request logging generates structured logs

**Example:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

describe('Health Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status and timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('GET /ready', () => {
    it('should return 200 when database is ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ready).toBe(true);
      expect(body.checks.database).toBe('ok');
    });
  });
});
```

---

## Dependencies

### Existing Packages Required

- ✅ `@raptscallions/core` - Provides `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`
- ✅ `@raptscallions/db` - Provides `db`, `queryClient`, schema exports
- ✅ `@raptscallions/telemetry` - Provides `getLogger()` function

### New External Dependencies

- `fastify@^4.28.0` - Core API framework
- `@fastify/cors@^10.0.1` - CORS plugin

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| **Database connection fails on startup** | Server starts but `/ready` returns 503 (health check still works) |
| **Port already in use** | Log clear error message, exit with code 1 |
| **Invalid environment variables** | Zod validation provides clear error messages before server starts |
| **Unhandled promise rejections** | Error handler catches all async route errors |
| **Memory leaks from unclosed connections** | Graceful shutdown closes DB pool and server |

---

## Success Metrics

- ✅ Zero TypeScript errors: `pnpm typecheck` passes
- ✅ Zero test failures: `pnpm test` passes
- ✅ Server starts in < 2 seconds
- ✅ Health endpoint responds in < 10ms
- ✅ Graceful shutdown completes in < 5 seconds
- ✅ All 10 acceptance criteria verified

---

## Follow-up Tasks

This task blocks:
- **E02-T002:** Sessions table and Lucia setup (requires server foundation)
- **E02-T007:** Rate limiting middleware (requires server foundation)

After completion, the API server will be ready for:
- Authentication routes (E02-T003)
- OAuth integration (E02-T004)
- Permission middleware (E02-T005)

---

## References

- [Fastify Documentation](https://fastify.dev/)
- [Fastify TypeScript Guide](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Zod Documentation](https://zod.dev/)
- Project: `docs/ARCHITECTURE.md` - Technology stack decisions
- Project: `docs/CONVENTIONS.md` - Code style and error handling patterns
- Project: `.claude/rules/api.md` - Fastify-specific patterns
- Project: `.claude/rules/testing.md` - Testing conventions

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** APPROVED WITH RECOMMENDATIONS

### Developer Experience Assessment

This specification provides a solid foundation for the API server with good attention to developer experience. The following analysis covers usability, clarity, and operational concerns.

---

### Strengths

#### 1. **Clear Error Messages**
- ✅ Zod validation provides helpful error context (AC8:422-428)
- ✅ Structured error format `{ error, code, details }` is consistent and predictable
- ✅ AppError subclasses map to appropriate HTTP status codes
- ✅ Logs include requestId for tracing errors across systems

#### 2. **Operational Visibility**
- ✅ Structured logging at all key lifecycle points (request start, completion, errors)
- ✅ Separate `/health` (always up) and `/ready` (dependency check) endpoints
- ✅ Readiness check provides granular status: `{ ready: boolean, checks: { database: 'ok' | 'error' } }`
- ✅ Response time tracking built into request logging

#### 3. **Developer-Friendly Patterns**
- ✅ Server factory pattern (`createServer()`) enables testability
- ✅ Type-safe configuration with Zod inference
- ✅ Graceful shutdown prevents data loss and connection leaks
- ✅ Hot reload support via `tsx watch` for development

#### 4. **Fail-Fast Philosophy**
- ✅ Environment validation happens before server starts
- ✅ Clear exit codes (0 for graceful, 1 for errors)
- ✅ Startup errors logged with `fatal` level before exit

---

### Issues Found

#### MUST FIX (Blocking UX Issues)

**Issue #1: Startup Error Messages Hidden from Operators**
**Location:** AC8:416-429

**Problem:**
When environment validation fails, error messages are written to `console.error` instead of the structured logger. This creates inconsistent operational experience:
- Development: Errors appear in terminal but not in log aggregation tools
- Production: Operators may miss critical startup failures if only monitoring structured logs

**Current Pattern:**
```typescript
try {
  const config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}
```

**Recommendation:**
Use the logger for consistency:
```typescript
import { getLogger } from '@raptscallions/telemetry';
const logger = getLogger('api:config');

try {
  const config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.fatal(
      {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      'Invalid environment configuration'
    );
    // Also print to console for development visibility
    console.error('❌ Invalid environment configuration:');
    error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}
```

**Impact:** Without this, production debugging becomes harder when deployments fail.

---

**Issue #2: Silent Readiness Check Failures Create Ambiguity**
**Location:** AC4:126-149

**Problem:**
The `/ready` endpoint catches database errors and returns `{ checks: { database: 'error' } }`, but provides no information about *why* the check failed. Operators debugging a 503 response have no context.

**Current Pattern:**
```typescript
try {
  await queryClient.unsafe('SELECT 1');
  checks.database = 'ok';
} catch (error) {
  logger.error({ error }, 'Database readiness check failed');
}
```

**Recommendation:**
Include error context in the response for operational visibility:
```typescript
const checks: {
  database: 'ok' | 'error';
  databaseError?: string;
} = {
  database: 'error',
};

try {
  await queryClient.unsafe('SELECT 1');
  checks.database = 'ok';
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  checks.databaseError = errorMessage;
  logger.error({ error }, 'Database readiness check failed');
}

const ready = checks.database === 'ok';
const statusCode = ready ? 200 : 503;

return reply.status(statusCode).send({
  ready,
  checks,
});
```

**Impact:** When Kubernetes pods fail readiness checks, operators can immediately see "Connection refused" vs "Authentication failed" vs "Timeout" without digging through logs.

---

#### SHOULD FIX (Usability Improvements)

**Issue #3: CORS Error Messages Are Opaque**
**Location:** AC9:454-473

**Problem:**
When a frontend makes a request from an unauthorized origin, the CORS error message from the browser is generic ("CORS policy blocked"). Developers debugging integration issues can't easily determine which origins are allowed.

**Recommendation:**
Add a diagnostic endpoint (only in development mode):
```typescript
if (config.NODE_ENV === 'development') {
  app.get('/debug/cors', async (_request, reply) => {
    return reply.send({
      allowedOrigins: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });
  });
}
```

**Alternate:** Log rejected CORS requests at `warn` level with the rejected origin:
```typescript
await app.register(cors, {
  origin: (origin, callback) => {
    const allowed = config.CORS_ORIGINS.split(',').map((s) => s.trim());
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowed }, 'CORS request rejected');
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

**Impact:** Reduces time spent debugging CORS issues during development and integration.

---

**Issue #4: Shutdown Timeout Not Enforced**
**Location:** AC7:302-353

**Problem:**
Graceful shutdown waits indefinitely for `app.close()` and `queryClient.end()`. If in-flight requests hang (e.g., a module hook is stuck), the server never exits. Kubernetes will eventually send SIGKILL after 30s, but this creates a poor operational experience.

**Recommendation:**
Add shutdown timeout enforcement:
```typescript
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

process.on(signal, () => {
  void (async () => {
    logger.info({ signal }, 'Shutting down gracefully');

    const shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      await app.close();
      logger.info('Server closed');

      await queryClient.end();
      logger.info('Database connections closed');

      clearTimeout(shutdownTimer);
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  })();
});
```

**Impact:** Prevents zombie processes and ensures predictable shutdown behavior.

---

**Issue #5: Missing Development Mode Indicators**
**Location:** Startup logging (AC2, Step 7)

**Problem:**
When the server starts, logs show port and environment but don't clearly indicate important development-mode behaviors:
- CORS accepting localhost origins
- Detailed error stacks being returned to clients
- Debug endpoints available

**Recommendation:**
Enhance startup logging to provide context:
```typescript
logger.info(
  {
    port: config.PORT,
    env: config.NODE_ENV,
    corsOrigins: config.CORS_ORIGINS.split(',').map((s) => s.trim()),
  },
  'Server listening'
);

if (config.NODE_ENV === 'development') {
  logger.info('Development mode: detailed errors and debug endpoints enabled');
}
```

**Impact:** Reduces confusion when developers see different error detail levels between environments.

---

#### NICE TO HAVE (Suggestions)

**Suggestion #1: Add Liveness Probe Endpoint**
Currently spec provides `/health` (basic) and `/ready` (validates dependencies). Consider adding `/live` for Kubernetes liveness probes that checks if the event loop is responsive but doesn't validate dependencies.

**Suggestion #2: Include Server Metadata in Health Response**
Add version, uptime, and commit hash to `/health` response for operational visibility:
```typescript
app.get('/health', async (_request, reply) => {
  return reply.send({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    commit: process.env.GIT_COMMIT || 'unknown',
  });
});
```

**Suggestion #3: Add Request Size Limits**
Document or specify request body size limits to prevent abuse:
```typescript
const app = fastify({
  logger: false,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  bodyLimit: 1048576, // 1MB
});
```

---

### Accessibility Considerations (N/A)

This is a backend API with no user-facing UI. Accessibility concerns don't apply, but equivalents for operational access:
- ✅ Structured logs are machine-readable (JSON format)
- ✅ Error codes enable programmatic error handling
- ✅ Health endpoints follow industry standards (compatible with monitoring tools)

---

### Consistency Review

#### Naming Conventions
- ✅ File names follow patterns: `*.routes.ts`, `*.middleware.ts` (per CONVENTIONS.md)
- ✅ snake_case not applicable (this is TypeScript, not database schema)
- ✅ HTTP method naming consistent: `app.get`, `app.post` (Fastify standard)

#### Response Formats
- ✅ Success responses: `{ data: T }` or plain object for health checks
- ✅ Error responses: `{ error: string, code: string, details?: any }`
- ✅ Consistent HTTP status code usage

#### Logging Patterns
- ✅ All loggers use `getLogger('namespace')` pattern
- ✅ Structured context objects used consistently
- ✅ Log levels appropriate (info, error, fatal, warn)

---

### User Flow Analysis (Developer Journey)

#### Flow 1: First-Time Setup
1. Clone repository
2. Copy `.env.example` (assumed to exist, not in this spec)
3. Run `pnpm install`
4. Run `pnpm dev`

**Potential Issue:** If `.env.example` is missing DATABASE_URL, startup fails with error. Consider if spec should create `.env.example` or document it.

**Resolution:** Out of scope for this task. Documentation task should handle.

#### Flow 2: Debugging a 503 Response
1. Check logs → see "Request completed" with 503 status
2. Check `/ready` endpoint → see `{ ready: false, checks: { database: 'error' } }`
3. Check logs → see "Database readiness check failed" with error context

**With Issue #2 fixed:** Developer can check `/ready` response body directly without log access.

#### Flow 3: Production Deployment Failure
1. Deploy to Kubernetes
2. Pod fails to start (CrashLoopBackOff)
3. Check pod logs → see Zod validation errors
4. Fix environment variables in deployment manifest
5. Redeploy

**With Issue #1 fixed:** Errors appear in both console (for kubectl logs) and structured logs (for log aggregation).

---

### Security & Privacy Considerations

#### Potential Information Disclosure
⚠️ **Concern:** Error responses may leak internal details in production

**Current Mitigation:**
- AppError instances control what details are exposed
- Generic 500 errors only return "Internal server error"
- Stack traces only logged, never returned to client

**Recommendation:** Add explicit note in implementation that `AppError.details` should never contain sensitive information (passwords, tokens, PII).

#### CORS Configuration
✅ **Adequate:** Credentials allowed only for explicitly configured origins, no wildcard.

---

### Performance Considerations

#### Request Logging Overhead
- **Concern:** Logging every request (onRequest + onResponse) could impact performance at high scale
- **Assessment:** Acceptable for initial implementation. Structured logs are efficient.
- **Future:** Consider sampling or log level controls for high-traffic routes

#### Readiness Check Performance
- **Concern:** Every `/ready` call executes `SELECT 1` query
- **Assessment:** Simple query is fast (<5ms) and readiness checks are infrequent (Kubernetes default: 10s interval)
- **Future:** Consider caching readiness state with TTL if checks become expensive

---

### Recommendations Summary

| Issue                                  | Severity  | Effort | Impact  |
| -------------------------------------- | --------- | ------ | ------- |
| #1: Startup errors not logged          | Must Fix  | Low    | High    |
| #2: Readiness check lacks error detail | Must Fix  | Low    | High    |
| #3: CORS errors opaque                 | Should Fix| Low    | Medium  |
| #4: Shutdown timeout not enforced      | Should Fix| Low    | Medium  |
| #5: Missing dev mode indicators        | Should Fix| Low    | Low     |
| Suggestion #1: Add /live endpoint      | Nice      | Low    | Low     |
| Suggestion #2: Add version to /health  | Nice      | Low    | Low     |
| Suggestion #3: Document body limits    | Nice      | Low    | Low     |

---

### Verdict: APPROVED WITH RECOMMENDATIONS

The specification is **ready for architecture review** with the understanding that:

1. **Must Fix issues should be addressed during implementation** (Issues #1 and #2)
2. **Should Fix issues are recommended but not blocking** (Issues #3-5)
3. **Nice to Have suggestions are optional enhancements** (Suggestions 1-3)

The foundation is solid, error handling is thoughtful, and operational visibility is good. The recommendations focus on improving the *developer experience* of debugging and operating the API server.

**Next Steps:**
- Proceed to architecture review (`/review-plan`)
- During implementation, incorporate Must Fix recommendations
- Consider Should Fix recommendations based on time constraints

---

**END OF UX REVIEW**

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** APPROVED FOR IMPLEMENTATION

### Executive Summary

The implementation specification is **architecturally sound** and ready for implementation. The plan demonstrates strong alignment with the project's architectural decisions, technology stack, and coding conventions. The foundation is well-designed for future extensibility.

**Key Strengths:**
- Correct Fastify-centric approach (not Express patterns)
- Proper use of Drizzle ORM integration
- Strong fail-fast validation strategy
- Excellent operational observability (health/readiness separation)
- Type-safe configuration with Zod inference

---

### Architecture Compliance

✅ **Technology Stack:** All choices align with ARCHITECTURE.md canonical stack
✅ **Code Conventions:** Strong adherence to CONVENTIONS.md patterns
✅ **Monorepo Structure:** Follows prescribed directory layout
✅ **API Design:** Response formats match canonical specifications
✅ **Security:** Proper CORS, no information disclosure, request ID tracking
✅ **Testability:** Server factory pattern enables comprehensive testing

---

### Issues Requiring Correction

#### Issue #1: Error Handler Type Signature (MINOR)

**Location:** AC5 error handler implementation

**Problem:** Error handler signature uses `FastifyError` specifically:
```typescript
export function errorHandler(
  error: FastifyError,  // ← Too specific
  request: FastifyRequest,
  reply: FastifyReply
): void
```

**Fix:** Fastify's error handler receives `Error | FastifyError`, not just `FastifyError`. Update to:
```typescript
export function errorHandler(
  error: Error | FastifyError,  // ← Correct union type
  request: FastifyRequest,
  reply: FastifyReply
): void
```

**Impact:** Type safety improvement. Logic already handles this correctly with instanceof checks.

---

#### Issue #2: Database Client Import Clarification (MINOR)

**Location:** AC4 readiness check, Step 5 (health routes)

**Problem:** Spec references `queryClient` from `@raptscallions/db`:
```typescript
import { queryClient } from '@raptscallions/db';
await queryClient.unsafe('SELECT 1');
```

**Action Required:** Verify the actual export name in `packages/db/src/client.ts` (from E01-T001). The spec should use the correct import that matches the db package's public API. Common options:
- `import { pool } from '@raptscallions/db/client'` + `pool.query('SELECT 1')`
- `import { db } from '@raptscallions/db'` + `db.execute(sql\`SELECT 1\`)`

**Impact:** Prevents build errors. Ensure consistency with db package interface.

---

### Recommendations from UX Review Integration

The UX review provided excellent operational improvements. All recommendations are architecturally compatible:

**Must Address During Implementation:**
1. ✅ Startup error logging (UX Issue #1) - Use structured logger for config errors
2. ✅ Readiness check error detail (UX Issue #2) - Include error message in response

**Strongly Recommended:**
3. ✅ Shutdown timeout enforcement (UX Issue #4) - Prevent zombie processes
4. ✅ CORS debugging endpoint (UX Issue #3) - Add `/debug/cors` in development
5. ✅ Dev mode indicators (UX Issue #5) - Log development mode status

---

### Container Deployment Verification

**Recommendation:** Add Docker build verification to AC10 success criteria.

ARCHITECTURE.md mandates containerization. While Dockerfile creation can be a separate task, at minimum verify the package builds in a Node.js 20 container:

```bash
# Test container build
docker run --rm -v $(pwd):/app -w /app node:20 sh -c "
  npm install -g pnpm &&
  pnpm install &&
  pnpm --filter @raptscallions/api build
"
```

**Impact:** Catch containerization issues early before deployment tasks.

---

### Performance Analysis

✅ **Startup Performance:** Estimated ~200ms (target < 2s) - Pass
✅ **Health Check Latency:** Estimated < 1ms (target < 10ms) - Pass
✅ **Readiness Check:** PostgreSQL SELECT 1 typically < 5ms - Acceptable
✅ **Request Logging:** Minimal overhead, structured format efficient

---

### Extensibility Assessment

✅ **Plugin Architecture:** Fastify's plugin system enables modular growth
✅ **Configuration:** Easy to extend with new environment variables
✅ **Error Handling:** Typed error system ready for domain-specific errors
✅ **Blocked Tasks Ready:** E02-T002 (Auth) and E02-T007 (Rate limiting) can build on this foundation

**Future Plugin Registration Points:**
- Authentication middleware (E02-T002)
- Rate limiting plugin (E02-T007)
- Domain route handlers (users, groups, tools)
- Metrics endpoint (/metrics for Prometheus)

---

### Risk Assessment

**Low Risk Areas:**
- Fastify setup (well-documented, simple)
- Zod validation (straightforward schema)
- Health checks (minimal logic)
- CORS (official plugin, standard config)

**Medium Risk Areas:**
- Database connection (depends on E01-T001 completion - verify exports first)
- Graceful shutdown (test with long-running requests - add timeout per UX rec)
- Error handler (test all error types comprehensively)

**Mitigations:**
- Mock database for tests to avoid E01 dependency
- Add shutdown timeout enforcement (10s)
- Comprehensive error handler test cases

---

### Production Readiness

**Included (Appropriate for Foundation Task):**
- ✅ Graceful shutdown (Kubernetes compatible)
- ✅ Health and readiness probes
- ✅ Structured logging (OpenTelemetry compatible)
- ✅ Environment-based configuration
- ✅ CORS security
- ✅ Request ID tracking

**Missing (Acceptable - Follow-up Tasks):**
- Dockerfile and docker-compose.yml (create soon)
- Metrics endpoint (/metrics)
- Rate limiting (E02-T007)
- Authentication (E02-T002)

---

### Final Verdict

**✅ APPROVED FOR IMPLEMENTATION**

**Conditions:**
1. Fix error handler type signature (Issue #1) - 1 minute
2. Clarify and verify database client import (Issue #2) - 5 minutes
3. Incorporate UX "Must Fix" items during implementation - 15 minutes

**Confidence Level:** HIGH

**Estimated Implementation Time:** 4-6 hours
**Architectural Complexity:** Low
**Risk Level:** Low

This specification provides a solid foundation for the API server with excellent extensibility. The design follows all architectural guidelines and establishes patterns that future tasks will build upon.

**Next Steps:**
1. Address Issues #1 and #2 (update spec or verify during implementation)
2. Proceed to implementation: `/implement E02-T001`
3. Create Docker deployment task after this completes

---

**END OF ARCHITECTURE REVIEW**

---

**END OF SPECIFICATION**
