# Raptscallions

An open-source AI education platform with extreme modularity, teacher-as-creator design, and OneRoster integration.

## Features

- **Extreme modularity** - Minimal core with pluggable modules
- **Two interface types** - Chat (multi-turn) and Product (single I/O)
- **Teacher as creator** - No preset tools; teachers build what they need
- **One-click deployment** - Heroku, Docker Compose, Kubernetes
- **OneRoster native** - SIS integration from day one

## Prerequisites

- **Node.js 20 LTS** or higher
- **pnpm 9.x** (package manager)

### Installing pnpm

If you do not have pnpm installed:

```bash
# Using corepack (recommended)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Or using npm
npm install -g pnpm
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/raptscallions.git
cd raptscallions
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build All Packages

```bash
pnpm build
```

### 4. Environment Configuration

The API server requires environment variables. Create a `.env` file in the root:

```bash
# Required for API server
DATABASE_URL=postgresql://user:password@localhost:5432/raptscallions
REDIS_URL=redis://localhost:6379

# Optional configuration
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

### 5. Development Mode

```bash
# Run all packages in development mode
pnpm dev

# Or run specific packages
pnpm --filter @raptscallions/api dev
```

## API Server

The Fastify API server (`apps/api`) provides the backend foundation with:

- **Health checks**: `GET /health` (basic liveness) and `GET /ready` (dependency validation)
- **Request logging**: Structured logs with request ID tracking
- **Error handling**: Consistent error format with typed errors
- **Graceful shutdown**: Proper cleanup of connections on SIGINT/SIGTERM
- **CORS support**: Configurable allowed origins

### Running the API Server

```bash
# Development mode with hot reload
pnpm --filter @raptscallions/api dev

# Build for production
pnpm --filter @raptscallions/api build

# Start production server
pnpm --filter @raptscallions/api start
```

### API Endpoints

**Health & Status:**
- `GET /health` - Basic health check, returns `{ status: 'ok', timestamp }`
- `GET /ready` - Readiness check with database validation

**Authentication:**
- `POST /auth/register` - Register new user with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout current user (requires authentication)
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle Google OAuth callback
- `GET /auth/microsoft` - Initiate Microsoft OAuth flow
- `GET /auth/microsoft/callback` - Handle Microsoft OAuth callback

## Project Structure

```
raptscallions/
├── apps/                    # Application workspaces
│   ├── api/                 # Fastify API server ✅
│   ├── docs/                # VitePress knowledge base ✅
│   ├── worker/              # BullMQ job processor (coming soon)
│   └── web/                 # React frontend (coming soon)
├── packages/                # Shared library workspaces
│   ├── core/                # Shared types and Zod schemas
│   ├── db/                  # Drizzle schema and migrations
│   ├── modules/             # Module system with worker thread isolation
│   └── telemetry/           # OpenTelemetry tracing, metrics, logging
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System architecture reference
│   └── CONVENTIONS.md       # Code style guide
├── pnpm-workspace.yaml      # Workspace configuration
├── tsconfig.json            # Base TypeScript configuration
└── package.json             # Root package manifest
```

## Available Scripts

From the root directory:

| Script | Description |
| ------ | ----------- |
| `pnpm dev` | Run all packages in development mode (watch) |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests once |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Open Vitest web UI |
| `pnpm lint` | Run linting across all packages |
| `pnpm clean` | Remove node_modules and dist from all packages |
| `pnpm docs:dev` | Start VitePress docs dev server |
| `pnpm docs:build` | Build VitePress docs for production |
| `pnpm docs:preview` | Preview built docs locally |

## Testing

The project uses [Vitest](https://vitest.dev/) for testing with workspace support for the monorepo.

### Running Tests

```bash
# Run all tests once
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Run tests in watch mode (development)
pnpm test:watch

# Open interactive web UI
pnpm test:ui

# Run tests for a specific package
pnpm --filter @raptscallions/core test
```

### Coverage Reports

After running `pnpm test:coverage`, coverage reports are generated in the `coverage/` directory:

- **HTML Report**: Open `coverage/index.html` in a browser for detailed coverage analysis
- **Console Report**: Printed to the terminal after test completion
- **JSON Summary**: Available at `coverage/coverage-summary.json` for CI integration

**Coverage Thresholds**: The project enforces 80% minimum coverage for lines, functions, branches, and statements.

### Test Structure

Tests follow the AAA (Arrange-Act-Assert) pattern and are located in `__tests__/` directories:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

For more details, see [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Technology Stack

| Layer | Technology | Version |
| ----- | ---------- | ------- |
| Runtime | Node.js | 20 LTS |
| Language | TypeScript | 5.3+ (strict mode) |
| API Framework | Fastify | 4.x |
| ORM | Drizzle | 0.29+ |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis | 7 |
| Validation | Zod | 3.x |
| Auth | Lucia | 3.x |
| Frontend | React | 18.x |

For the complete technology stack, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Package Naming

All packages in this monorepo use the `@raptscallions` scope:

- `@raptscallions/core` - Shared types and schemas
- `@raptscallions/db` - Database package
- `@raptscallions/modules` - Module system
- `@raptscallions/telemetry` - Observability

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and architecture decisions
- [Conventions](docs/CONVENTIONS.md) - Code style and naming conventions
- [Knowledge Base](apps/docs/) - Browsable documentation site (VitePress)

### Running the Knowledge Base

The project includes a VitePress-powered knowledge base at `apps/docs/`:

```bash
# Start development server (http://localhost:5173)
pnpm docs:dev

# Build for production
pnpm docs:build

# Preview production build
pnpm docs:preview
```

The knowledge base provides:
- **Search**: Built-in local search (Cmd/Ctrl + K)
- **Dark/Light Theme**: Automatic theme switching
- **Live Reload**: Instant updates during development

## Development

### TypeScript Configuration

The project uses TypeScript 5.3+ with strict mode enabled. Key compiler options:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `target: ES2022`
- `module: NodeNext`

All packages extend the root `tsconfig.json`.

### Creating a New Package

1. Create directory under `packages/` or `apps/`
2. Add `package.json` with `@raptscallions/` scope name
3. Add `tsconfig.json` extending `../../tsconfig.json`
4. Add `src/index.ts` entry point

## License

[License information to be added]
