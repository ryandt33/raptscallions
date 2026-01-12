---
globs:
  - "packages/db/**/*.ts"
  - "**/schema/**/*.ts"
  - "**/migrations/**"
---

# Database Code Rules

When working with database code in `packages/db/`:

## ORM

- Use **Drizzle ORM**, not Prisma
- Use `drizzle-orm/pg-core` for PostgreSQL

## Schema Definitions

```typescript
// ✅ Correct pattern
import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);
```

## Naming

- Tables: `snake_case`, plural (`users`, `group_members`)
- Columns: `snake_case` (`created_at`, `password_hash`)
- Indexes: `{table}_{column}_idx`
- Foreign keys: `{table}_{column}_fkey`

## Types

```typescript
// Export inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## Queries

```typescript
// ✅ Use query builder
const user = await db.query.users.findFirst({
  where: eq(users.id, id),
  with: { groups: true },
});

// ✅ Complex queries
const results = await db
  .select()
  .from(users)
  .leftJoin(groupMembers, eq(users.id, groupMembers.userId))
  .where(eq(groupMembers.groupId, groupId));

// ❌ Avoid raw SQL unless necessary
```

## Migrations

- One migration per logical change
- Name: `NNNN_description.sql` (e.g., `0001_create_users.sql`)
- Always reversible (include down migration)
- Test migrations on copy of production data

## Hierarchical Data (ltree)

```typescript
// For groups with hierarchy
import { customType } from "drizzle-orm/pg-core";

const ltree = customType<{ data: string }>({
  dataType() {
    return "ltree";
  },
});

export const groups = pgTable("groups", {
  path: ltree("path").notNull(),
  // ...
});
```
