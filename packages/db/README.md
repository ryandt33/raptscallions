# @raptscallions/db

Database package for RaptScallions, providing Drizzle ORM schema definitions, migrations, and a configured PostgreSQL client.

## Features

- **Drizzle ORM 0.29+** - Type-safe database operations with SQL-like syntax
- **PostgreSQL 16** - With ltree extension for hierarchical data
- **Connection Pooling** - Configured for production workloads
- **Type Inference** - Full TypeScript types inferred from schema
- **Migration Management** - Drizzle Kit for schema versioning
- **Environment Validation** - Zod-based configuration validation

## Installation

This package is part of the RaptScallions monorepo and uses pnpm workspaces.

```bash
pnpm install
```

## Setup

### 1. Database Requirements

PostgreSQL 16 with the ltree extension:

```sql
CREATE EXTENSION IF NOT EXISTS ltree;
```

### 2. Environment Variables

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/raptscallions
DATABASE_POOL_MIN=2      # Optional, defaults to 2
DATABASE_POOL_MAX=10     # Optional, defaults to 10
```

### 3. Validate Environment

```typescript
import { validateDbEnv } from "@raptscallions/db";

// At application startup - fails fast if DATABASE_URL is missing
const dbEnv = validateDbEnv();
```

## Usage

### Database Client

```typescript
import { db } from "@raptscallions/db";
import { users } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

// Query builder (recommended)
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { groups: true },
});

// Select query
const allUsers = await db.select().from(users);

// Insert
const [newUser] = await db
  .insert(users)
  .values({
    email: "new@example.com",
    name: "New User",
  })
  .returning();

// Update
await db
  .update(users)
  .set({ name: "Updated Name" })
  .where(eq(users.id, userId));

// Delete
await db.delete(users).where(eq(users.id, userId));

// Transaction
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(groupMembers).values({ userId: user.id, groupId });
  return user;
});
```

### Custom ltree Type

The package includes a custom PostgreSQL ltree type for hierarchical data (used for group hierarchies):

```typescript
import { ltree } from "@raptscallions/db/schema";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  path: ltree("path").notNull(),
});

// Example path: 'district_123.school_456.dept_789'
```

### Raw Postgres Client

For cases where direct postgres access is needed:

```typescript
import { queryClient } from "@raptscallions/db";

// Raw SQL queries
const result = await queryClient`SELECT NOW()`;
```

### Database Type

Type the database client for dependency injection:

```typescript
import type { Database } from "@raptscallions/db";

class UserService {
  constructor(private db: Database) {}

  async getById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }
}
```

## Migrations

### Generate Migration

After adding or modifying schema:

```bash
pnpm --filter @raptscallions/db db:generate
```

This creates a SQL migration file in `src/migrations/`.

### Apply Migrations

```bash
pnpm --filter @raptscallions/db db:migrate
```

### Push Schema (Development Only)

Directly push schema changes without creating migration files:

```bash
pnpm --filter @raptscallions/db db:push
```

**Warning:** Only use in development. Production should use migrations.

### Drizzle Studio

Explore your database with a GUI:

```bash
pnpm --filter @raptscallions/db db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio`.

## Schema Definitions

### File Structure

```
packages/db/src/
├── schema/
│   ├── index.ts         # Barrel export for all schemas
│   ├── types.ts         # Custom PostgreSQL types (ltree)
│   └── users.ts         # Users table schema
├── migrations/          # Generated SQL migrations
│   └── 0001_create_users.sql
├── client.ts            # Database client configuration
├── env.ts               # Environment validation
└── index.ts             # Package exports
```

### Naming Conventions

- **Tables:** snake_case, plural (`users`, `group_members`)
- **Columns:** snake_case (`created_at`, `password_hash`)
- **Indexes:** `{table}_{column}_idx`
- **Foreign keys:** `{table}_{column}_fkey`

### Users Table

The users table is the foundational entity for authentication and authorization:

```typescript
import { users, type User, type NewUser } from "@raptscallions/db/schema";

// Create a user with email/password
const newUser = await db
  .insert(users)
  .values({
    email: "user@example.com",
    name: "Jane Doe",
    passwordHash: hashedPassword,
    status: "pending_verification",
  })
  .returning();

// Create an OAuth user (no password)
const oauthUser = await db
  .insert(users)
  .values({
    email: "oauth@example.com",
    name: "OAuth User",
    // passwordHash omitted - null for OAuth users
    status: "active",
  })
  .returning();

// Query active users only (soft delete pattern)
import { isNull } from "drizzle-orm";

const activeUsers = await db.query.users.findMany({
  where: isNull(users.deletedAt),
});

// Soft delete a user
await db
  .update(users)
  .set({ deletedAt: new Date() })
  .where(eq(users.id, userId));
```

#### User Status Enum

Users have one of three status values:

- **`active`** - Normal user account, can log in and use the system
- **`suspended`** - Account disabled by admin, cannot log in
- **`pending_verification`** - New account awaiting email verification (default)

#### Authentication Patterns

The schema supports two authentication methods:

1. **Email/Password**: `passwordHash` contains Argon2 hash
2. **OAuth**: `passwordHash` is null (Google, Microsoft, Clever)

#### Soft Delete Pattern

All user queries should filter out soft-deleted users:

```typescript
import { isNull } from "drizzle-orm";

// Always include this in queries unless specifically querying deleted users
where: isNull(users.deletedAt);
```

### Type Inference

Export inferred types from schema:

```typescript
import { pgEnum, pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

// User status enum
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending_verification",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }), // Nullable for OAuth
  status: userStatusEnum("status").notNull().default("pending_verification"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## Connection Pooling

The database client is configured with sensible defaults:

| Setting           | Default | Description                                              |
| ----------------- | ------- | -------------------------------------------------------- |
| `max`             | 10      | Maximum connections in pool                              |
| `idle_timeout`    | 30s     | Close idle connections after 30 seconds                  |
| `connect_timeout` | 2s      | Connection timeout                                       |
| `prepare`         | false   | Disabled for connection pooler compatibility (PgBouncer) |

Pool size follows the rule: `(cpu_cores * 2) + spindle_count`. Default of 10 works for typical cloud instances.

## Configuration

### Environment Schema

```typescript
import { dbEnvSchema, type DbEnv } from "@raptscallions/db";

const env = dbEnvSchema.parse(process.env);
// env is typed as DbEnv
```

### Drizzle Config

Configuration for drizzle-kit is in `drizzle.config.ts`:

```typescript
{
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
}
```

## Error Handling

### Missing DATABASE_URL

The client will throw a clear error if `DATABASE_URL` is not set:

```
Error: DATABASE_URL environment variable is required.
Please set it in your environment or .env file.
```

### Connection Failures

Connection errors are thrown with meaningful context. Always wrap database operations in try-catch:

```typescript
try {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
} catch (error) {
  logger.error({ error, userId }, "Failed to fetch user");
  throw new AppError("Database query failed", "DATABASE_ERROR", 500);
}
```

## Testing

The package includes comprehensive tests:

```bash
# Run tests
pnpm --filter @raptscallions/db test

# Run tests in watch mode
pnpm --filter @raptscallions/db test:watch
```

### Test Coverage

- Custom ltree type implementation
- Environment validation with valid/invalid inputs
- Client exports and type safety
- Schema type inference

## Development

### Build

```bash
pnpm --filter @raptscallions/db build
```

### Watch Mode

```bash
pnpm --filter @raptscallions/db dev
```

### Clean

```bash
pnpm --filter @raptscallions/db clean
```

## Scripts

| Script        | Description                            |
| ------------- | -------------------------------------- |
| `build`       | Compile TypeScript to dist/            |
| `dev`         | Watch mode for development             |
| `clean`       | Remove build artifacts                 |
| `test`        | Run test suite                         |
| `test:watch`  | Run tests in watch mode                |
| `db:generate` | Generate migration from schema changes |
| `db:migrate`  | Apply pending migrations               |
| `db:push`     | Push schema directly (dev only)        |
| `db:studio`   | Open Drizzle Studio GUI                |

## Dependencies

### Runtime

- `drizzle-orm@^0.29.0` - ORM framework
- `postgres@^3.4.0` - PostgreSQL driver (porsager/postgres)
- `zod@^3.22.4` - Schema validation

### Development

- `drizzle-kit@^0.20.0` - Migration tooling
- `dotenv@^16.3.0` - Environment variable loading
- `typescript@^5.3.0` - TypeScript compiler
- `vitest@^1.1.0` - Testing framework

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md) - System architecture
- [Conventions](../../docs/CONVENTIONS.md) - Database conventions and patterns
- [Drizzle ORM Documentation](https://orm.drizzle.team/) - Official Drizzle docs
- [PostgreSQL ltree](https://www.postgresql.org/docs/current/ltree.html) - ltree extension docs

## License

[License information to be added]
