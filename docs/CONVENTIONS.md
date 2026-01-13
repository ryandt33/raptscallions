# Raptscallions Code Conventions

**Version:** 1.0.0  
**Status:** Canonical Reference

---

## General Principles

1. **Explicit over implicit** — Clear code beats clever code
2. **Functional over OOP** — Prefer pure functions, avoid classes where possible
3. **Composition over inheritance** — Build from small, composable pieces
4. **Fail fast** — Validate early, throw meaningful errors
5. **Test first** — TDD is the standard workflow

---

## TypeScript

### Zero Tolerance for Type Errors

**CRITICAL: The codebase MUST have zero TypeScript errors at all times.**

- Run `pnpm typecheck` before committing — it MUST pass
- Run `pnpm lint` before committing — it MUST pass
- CI will reject any PR with TypeScript errors
- No `// @ts-ignore` or `// @ts-expect-error` without explicit approval

### Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedSideEffectImports": true,
    "verbatimModuleSyntax": true
  }
}
```

### Absolutely No `any`

**CRITICAL: The `any` type is BANNED from this codebase.**

- Never use `any` — use `unknown` and narrow with type guards
- Never use `as any` type assertions
- No exceptions — if you think you need `any`, you need a different approach:
  - Use `unknown` and type guards
  - Use generics with constraints
  - Use discriminated unions
  - Use Zod schemas for runtime validation

```typescript
// ❌ BANNED - will fail code review
function process(data: any) { }
const result = value as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// ✅ CORRECT - use unknown and narrow
function process(data: unknown) {
  if (isValidData(data)) {
    // data is now typed
  }
}

// ✅ CORRECT - use Zod for runtime validation
const dataSchema = z.object({ name: z.string() });
function process(data: unknown) {
  const parsed = dataSchema.parse(data);
  // parsed is typed as { name: string }
}

// ✅ CORRECT - use generics
function process<T extends Record<string, unknown>>(data: T) { }
```

### Handle Potentially Undefined Values

With `noUncheckedIndexedAccess`, array/object access returns `T | undefined`:

```typescript
const items = ["a", "b", "c"];

// ❌ BAD - items[0] is string | undefined
const first: string = items[0]; // Type error!

// ✅ GOOD - handle the undefined case
const first = items[0];
if (first !== undefined) {
  console.log(first.toUpperCase());
}

// ✅ GOOD - use non-null assertion only when certain
const first = items[0]!; // Only if you KNOW it exists
```

### Type Imports

```typescript
// ✅ Good
import type { User } from "@Raptscallions/core";
import { createUser } from "./user.service";

// ❌ Bad
import { User, createUser } from "./user.service";
```

### Prefer Interfaces for Objects

```typescript
// ✅ Good - extendable
interface User {
  id: string;
  email: string;
}

// ❌ Avoid for object shapes
type User = {
  id: string;
  email: string;
};
```

### Use Type for Unions/Utilities

```typescript
// ✅ Good
type Status = "active" | "completed" | "cancelled";
type UserWithGroups = User & { groups: Group[] };
```

---

## Naming Conventions

### Files

| Type             | Convention        | Example                |
| ---------------- | ----------------- | ---------------------- |
| Route handlers   | `*.routes.ts`     | `users.routes.ts`      |
| Services         | `*.service.ts`    | `user.service.ts`      |
| Middleware       | `*.middleware.ts` | `auth.middleware.ts`   |
| Types            | `*.types.ts`      | `user.types.ts`        |
| Schemas (Zod)    | `*.schema.ts`     | `user.schema.ts`       |
| Tests            | `*.test.ts`       | `user.service.test.ts` |
| React components | `PascalCase.tsx`  | `UserCard.tsx`         |

### Variables and Functions

```typescript
// camelCase for variables and functions
const userId = "123";
function getUserById(id: string) {}

// PascalCase for types, interfaces, classes
interface UserService {}
class DatabaseClient {}

// SCREAMING_SNAKE for constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
```

### Database

```sql
-- snake_case for tables and columns
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ
);
```

---

## Error Handling

### Use Typed Errors

```typescript
// packages/core/src/errors/base.error.ts

// Error codes enum for consistent identification
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// More specific error details type (satisfies noUncheckedIndexedAccess)
export type ErrorDetails = Record<string, unknown> | string | undefined;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ErrorDetails;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// packages/core/src/errors/common.error.ts
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, ErrorCode.NOT_FOUND, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, ErrorCode.UNAUTHORIZED, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.CONFLICT, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

// packages/core/src/errors/rate-limit.error.ts
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", details?: ErrorDetails) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
  }
}
```

### Explicit Try-Catch

```typescript
// ✅ Good
async function getUser(id: string): Promise<User> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new NotFoundError("User", id);
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) throw error;

    logger.error({ error, userId: id }, "Failed to get user");
    throw new AppError("Failed to get user", "DATABASE_ERROR", 500);
  }
}

// ❌ Bad - silent failure
async function getUser(id: string): Promise<User | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user ?? null; // Caller doesn't know if error or not found
}
```

---

## API Routes

### Structure

```typescript
// apps/api/src/routes/users.routes.ts
import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { UserService } from "../services/user.service";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const userService = new UserService(app.db);

  // GET /users/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const user = await userService.getById(request.params.id);
      return reply.send(user);
    }
  );

  // POST /users
  app.post(
    "/",
    {
      preHandler: [app.authenticate, app.requireRole("admin")],
      schema: {
        body: createUserSchema,
      },
    },
    async (request, reply) => {
      const user = await userService.create(request.body);
      return reply.status(201).send(user);
    }
  );
};
```

### Response Format

```typescript
// Success
{ data: User }
{ data: User[], meta: { cursor: string, hasMore: boolean } }

// Error
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: { field: "email", message: "Invalid email format" }
}
```

---

## Services

### Pattern

```typescript
// apps/api/src/services/user.service.ts
import { db } from "@Raptscallions/db";
import { users } from "@Raptscallions/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@Raptscallions/core/errors";

export class UserService {
  constructor(private db: typeof db) {}

  async getById(id: string): Promise<User> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new NotFoundError("User", id);
    }

    return user;
  }

  async create(data: CreateUserInput): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();

    return user;
  }
}
```

### Dependencies

- Services receive dependencies via constructor
- No global singletons
- Enables testing with mocks

---

## Database

### Drizzle Queries

```typescript
// ✅ Good - explicit, readable
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
  with: {
    groups: true,
  },
});

// ✅ Good - complex query
const users = await db
  .select()
  .from(users)
  .leftJoin(groupMembers, eq(users.id, groupMembers.userId))
  .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)))
  .orderBy(asc(users.createdAt))
  .limit(20);

// ❌ Bad - raw SQL without good reason
const users = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(groupMembers).values({ userId: user.id, groupId });
  return user;
});
```

### Migrations

- One migration per change
- Descriptive names: `0001_create_users_table.sql`
- Always include down migration
- Test migrations on copy of production data

---

## Testing

### File Location

```
packages/db/src/
├── schema/
│   └── users.ts
└── __tests__/
    └── users.test.ts

apps/api/src/
├── services/
│   └── user.service.ts
└── __tests__/
    ├── services/
    │   └── user.service.test.ts
    └── integration/
        └── users.routes.test.ts
```

### Test Structure (AAA)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("UserService", () => {
  let service: UserService;
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new UserService(mockDb);
  });

  describe("getById", () => {
    it("should return user when found", async () => {
      // Arrange
      const expectedUser = { id: "123", email: "test@example.com" };
      mockDb.query.users.findFirst.mockResolvedValue(expectedUser);

      // Act
      const result = await service.getById("123");

      // Assert
      expect(result).toEqual(expectedUser);
    });

    it("should throw NotFoundError when user not found", async () => {
      // Arrange
      mockDb.query.users.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getById("123")).rejects.toThrow(NotFoundError);
    });
  });
});
```

### Coverage Requirements

| Type              | Minimum                       |
| ----------------- | ----------------------------- |
| Unit tests        | 80% line coverage             |
| Integration tests | Critical paths covered        |
| E2E tests         | Happy paths + key error cases |

### Fastify Integration Testing

When testing Fastify applications, be aware of **plugin encapsulation**. Fastify plugins scope hooks and decorators by default.

#### Plugin Encapsulation Issue

Plugins using `addHook('onRequest')` or decorators only apply to routes within that plugin's scope:

```typescript
// ❌ BAD - hooks won't apply to routes in other plugins
const myPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => { /* ... */ });
};
```

**Solution**: Wrap plugins with `fastify-plugin` to skip encapsulation:

```typescript
// ✅ GOOD - hooks apply globally
import fp from "fastify-plugin";

const myPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request) => { /* ... */ });
};

export const sessionMiddleware = fp(myPlugin, { name: "sessionMiddleware" });
```

#### Dependency Injection for Testing

Use dependency injection to make middleware testable without relying on `vi.mock()`:

```typescript
// In middleware file
export interface SessionServiceLike {
  sessionCookieName: string;
  validate: (sessionId: string) => Promise<SessionValidationResult>;
  createBlankSessionCookie: () => { name: string; value: string; attributes: Record<string, unknown> };
}

export interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike;
}

const plugin: FastifyPluginAsync<SessionMiddlewareOptions> = async (app, opts = {}) => {
  const sessionService = opts.sessionService ?? defaultSessionService;
  // Use sessionService...
};
```

In tests, inject mocks directly:

```typescript
const mockSessionService = {
  sessionCookieName: "rapt_session",
  validate: vi.fn(),
  createBlankSessionCookie: vi.fn().mockReturnValue({
    name: "rapt_session",
    value: "",
    attributes: {},
  }),
};

await app.register(sessionMiddleware, {
  sessionService: mockSessionService as SessionServiceLike,
});
```

**Why DI over vi.mock()**: Vitest's `vi.mock()` can fail for Fastify integration tests because module singletons are created before mocks are applied. Dependency injection bypasses this by passing mocks at runtime.

**Reference**: See `docs/kb/testing/fastify/plugin-encapsulation.md` for detailed patterns.

### Vitest Configuration

The project uses Vitest with a three-tier configuration strategy:

1. **Root Config** (`vitest.config.ts`) - Shared defaults for all packages
   - Global test settings
   - TypeScript path resolution
   - Coverage provider and thresholds
   - Path aliases for cross-package imports

2. **Workspace Definition** (`vitest.workspace.ts`) - Explicit package list
   - Defines which packages to test
   - Enables parallel test execution
   - Future apps added as they're created

3. **Package Configs** (e.g., `packages/core/vitest.config.ts`) - Package-specific overrides
   - Extend root config using `mergeConfig`
   - Override test patterns as needed
   - Add package name for clear output

**Running Tests:**

```bash
# All packages
pnpm test                          # Run once
pnpm test:coverage                 # With coverage
pnpm test:watch                    # Watch mode

# Single package
pnpm --filter @raptscallions/core test
```

**Adding a New Package:**

When creating a new package, add:
1. Package to `vitest.workspace.ts`
2. `vitest.config.ts` extending root config
3. Path alias to root `vitest.config.ts` and `tsconfig.json`
4. Test scripts to package `package.json`

---

## React Components

### Structure

```tsx
// apps/web/src/components/UserCard.tsx
import { type FC } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
}

export const UserCard: FC<UserCardProps> = ({ user, onSelect }) => {
  return (
    <Card onClick={() => onSelect?.(user)}>
      <CardHeader>
        <Avatar src={user.avatar} alt={user.name} />
      </CardHeader>
      <CardContent>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </CardContent>
    </Card>
  );
};
```

### Hooks

```tsx
// apps/web/src/hooks/useUser.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => api.users.getById(id),
    enabled: !!id,
  });
}
```

---

## Git Conventions

### Branch Names

```
feature/E01-T001-user-authentication
bugfix/E02-T005-session-timeout
chore/update-dependencies
```

### Commit Messages

```
feat(auth): implement login with email/password

- Add login route handler
- Implement password verification with Argon2
- Add session creation

Refs: E01-T002

---

fix(chat): prevent message loss on reconnect

The WebSocket reconnection was not replaying missed messages.
Added message queue with acknowledgment.

Fixes: E03-T010

---

test(user-service): add unit tests for createUser

- Happy path test
- Duplicate email test
- Invalid input tests

Coverage: 85% -> 92%
```

### PR Template

```markdown
## Summary

[What does this PR do?]

## Task

E01-T001: [Task title]

## Changes

- [Change 1]
- [Change 2]

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots

[If applicable]
```

---

## Logging

### Use Structured Logging

```typescript
import { logger } from "@Raptscallions/telemetry";

// ✅ Good - structured, contextual
logger.info({ userId, action: "login" }, "User logged in");
logger.error({ error, requestId }, "Request failed");

// ❌ Bad - string interpolation
logger.info(`User ${userId} logged in`);
```

### Log Levels

| Level   | Use For                               |
| ------- | ------------------------------------- |
| `trace` | Detailed debugging (disabled in prod) |
| `debug` | Development debugging                 |
| `info`  | Normal operations                     |
| `warn`  | Potential issues                      |
| `error` | Errors requiring attention            |
| `fatal` | System cannot continue                |

---

## Environment Variables

### Naming

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://...

# Auth
SESSION_SECRET=...
JWT_SECRET=...

# AI
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# Feature flags
FEATURE_OAUTH_GOOGLE=true
FEATURE_ONEROSTER_SYNC=false
```

### Validation

```typescript
// apps/api/src/config.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  // ...
});

export const config = envSchema.parse(process.env);
```

---

## Documentation

### Knowledge Base (VitePress)

The project uses VitePress for browsable, searchable documentation at `apps/docs/`.

#### Adding Documentation

When documenting implemented features:

1. **Choose the domain folder:**
   - `auth/` - Authentication, authorization, sessions, permissions
   - `database/` - PostgreSQL schemas, Drizzle ORM, migrations
   - `api/` - Fastify route handlers, middleware, services
   - `ai/` - OpenRouter client, streaming, error handling
   - `testing/` - Vitest patterns, mocking strategies
   - `contributing/` - Contribution guidelines

2. **Choose the content type:**
   - `concepts/` - Core ideas and mental models (e.g., "Session Lifecycle")
   - `patterns/` - Reusable implementation patterns (e.g., "Guard Middleware Composition")
   - `decisions/` - Architecture decision records (e.g., "Why Fastify over Express")
   - `troubleshooting/` - Problem-solution guides (e.g., "Session Cookies Not Set")

3. **Create the markdown file:**
   ```bash
   # Use kebab-case for file names
   touch apps/docs/src/auth/concepts/session-lifecycle.md
   ```

4. **Add frontmatter and content:**
   ```markdown
   ---
   title: Session Lifecycle
   description: How Lucia sessions are created, validated, and expired
   ---

   # Session Lifecycle

   Lucia sessions follow a cookie-based lifecycle with automatic extension...

   ## Creation

   Sessions are created when users authenticate via:
   - Email/password login (`POST /auth/login`)
   - OAuth callback (`GET /auth/google/callback`, etc.)

   ## Validation

   The session middleware validates on every request...
   ```

5. **Update sidebar navigation:**
   Edit `apps/docs/.vitepress/config.ts` and add link to sidebar:
   ```typescript
   {
     text: 'Concepts',
     collapsed: true,
     items: [
       { text: 'Session Lifecycle', link: '/auth/concepts/session-lifecycle' }
     ]
   }
   ```

6. **Test locally:**
   ```bash
   pnpm docs:dev
   # Open http://localhost:5173 and verify page renders
   ```

#### Documentation Standards

**Naming:**
- **Files**: kebab-case (`session-lifecycle.md`)
- **Titles**: Title Case in frontmatter (`Session Lifecycle`)
- **Max depth**: 3 levels (domain/type/article)

**Content:**
- Write for developers who haven't seen the code
- Be concise but complete
- Use runnable code examples
- Link to related docs and source files
- Include "Why" context for decisions

**Page Design Patterns:**
For detailed KB page authoring guidelines, see the [KB Page Design Patterns](/contributing/kb-page-design) guide in the knowledge base. It covers:
- Frontmatter and title patterns
- Heading hierarchy rules
- Code block conventions (highlighting, line numbers, code groups)
- Custom containers (tip, info, warning, danger)
- Cross-referencing and navigation
- VitePress-specific features

**Code Examples:**
```typescript
// ✅ Good - complete, runnable
import { UserService } from '@raptscallions/api';

const userService = new UserService(db);
const user = await userService.getById('123');

// ❌ Bad - incomplete, assumes context
userService.getById('123'); // returns user
```

#### Building and Deployment

```bash
# Development server
pnpm docs:dev

# Build for production
pnpm docs:build

# Preview production build
pnpm docs:preview

# Type check
pnpm typecheck
```

---

_End of Conventions Document_
