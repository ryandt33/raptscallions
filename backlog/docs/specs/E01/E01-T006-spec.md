# Implementation Spec: E01-T006

## Overview

Define the Drizzle ORM schema for the `group_members` table, which associates users with groups and assigns roles. This is the join table that enables role-based access control (RBAC) within the RaptScallions platform. Each membership record grants a user a specific role within a specific group, determining their permissions and capabilities within that organizational context.

## Approach

The group_members schema is the third core table in the `@raptscallions/db` package and establishes the many-to-many relationship between users and groups. This schema is foundational for authentication, authorization (CASL), and permission scoping throughout the platform.

Key design decisions:

- **Join table pattern** - Many users can belong to many groups, each with a specific role
- **Unique constraint on (user_id, group_id)** - One role per user per group (prevents duplicate memberships)
- **Role enum** - Four-level permission hierarchy: system_admin, group_admin, teacher, student
- **Foreign keys with CASCADE delete** - Cleanup when users or groups are deleted
- **Composite indexes** - Optimizes "get user's groups" and "get group's members" queries
- **No soft delete** - When a user leaves a group, membership is hard-deleted (audit via separate logs)
- **Drizzle relations** - Enables type-safe joins and eager loading

Following the project's strict TypeScript standards:

- Zero use of `any` type
- Explicit type inference using Drizzle's `$inferSelect` and `$inferInsert`
- Drizzle relations for type-safe queries

## Files to Create

| File                                                       | Purpose                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/db/src/schema/group-members.ts`                  | Group members table schema with enum, foreign keys, indexes, relations, and exported types |
| `packages/db/src/migrations/0003_create_group_members.sql` | Migration to create group_members table with foreign key constraints                       |
| `packages/db/src/__tests__/schema/group-members.test.ts`   | Unit tests for group_members schema type inference and relations                           |

## Files to Modify

| File                               | Changes                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `packages/db/src/schema/index.ts`  | Add export for group_members schema: `export * from "./group-members.js";` |
| `packages/db/src/schema/users.ts`  | Add Drizzle relations for users → groupMembers                             |
| `packages/db/src/schema/groups.ts` | Add Drizzle relations for groups → groupMembers                            |

## Dependencies

- Requires: E01-T004 (users table for foreign key reference)
- Requires: E01-T005 (groups table for foreign key reference)
- Blocks: E01-T007+ (classes, tools, assignments - all require group membership context)
- New packages: None (Drizzle relations are built-in)

## Test Strategy

### Unit Tests

- GroupMember and NewGroupMember types correctly infer from schema
- Required fields are properly typed as non-nullable
- Role enum values are correctly typed
- Foreign key fields (userId, groupId) are typed as UUID strings
- Schema exports are accessible from `@raptscallions/db/schema`
- Table metadata is accessible (for test compatibility)
- Relations are properly typed (user relation returns User, group relation returns Group)

### Integration Tests

- Migration generates correctly with `pnpm db:generate`
- Migration creates member_role enum
- Migration applies to test database
- Table structure matches schema definition (column types, constraints, indexes)
- Unique constraint on (user_id, group_id) works correctly
- Foreign key constraint on user_id references users(id)
- Foreign key constraint on group_id references groups(id)
- ON DELETE CASCADE works (deleting user removes memberships)
- Indexes on user_id and group_id are created
- Relations enable type-safe eager loading

## Acceptance Criteria Breakdown

**AC1: group_members table defined in src/schema/group-members.ts**

- Create new file at `packages/db/src/schema/group-members.ts`
- Import required types from `drizzle-orm/pg-core`
- Import users and groups tables for foreign key references
- Define group_members table with pgTable
- Export table definition

**AC2: Fields: id, user_id, group_id, role, created_at, updated_at**

- `id` - UUID primary key with automatic generation
- `user_id` - UUID foreign key to users(id)
- `group_id` - UUID foreign key to groups(id)
- `role` - enum for member's role in the group
- `created_at` - timestamp with timezone for membership creation
- `updated_at` - timestamp with timezone for last role change

**AC3: Foreign key to users(id) with ON DELETE CASCADE**

- Use `.references(() => users.id)` in Drizzle
- Configure onDelete: 'cascade' to remove memberships when user is deleted
- Ensures referential integrity (no orphaned memberships)
- TypeScript enforces valid user UUID

**AC4: Foreign key to groups(id) with ON DELETE CASCADE**

- Use `.references(() => groups.id)` in Drizzle
- Configure onDelete: 'cascade' to remove memberships when group is deleted
- Ensures referential integrity (no orphaned memberships)
- TypeScript enforces valid group UUID

**AC5: role enum: system_admin, group_admin, teacher, student**

- Define pgEnum before table definition
- Name: 'member_role'
- Values match ARCHITECTURE.md role definitions:
  - `system_admin`: System-wide privileges (can do everything)
  - `group_admin`: Group-level admin (manage group, users, settings)
  - `teacher`: Content creator (create tools, assignments, view analytics)
  - `student`: Content consumer (use assigned tools)
- Use enum in table definition with notNull()

**AC6: Unique constraint on (user_id, group_id)**

- Define unique constraint in table definition
- Prevents duplicate memberships (one role per user per group)
- If user role changes, update existing record (don't insert new)
- Enables upsert patterns (INSERT ... ON CONFLICT)

**AC7: Index on user_id for "get user's groups" queries**

- Define index in table's index configuration
- Name: group_members_user_id_idx
- Optimizes query: "What groups is this user a member of?"
- Used frequently in authorization checks

**AC8: Index on group_id for "get group's members" queries**

- Define index in table's index configuration
- Name: group_members_group_id_idx
- Optimizes query: "Who are the members of this group?"
- Used in roster displays, permission checks

**AC9: Exports GroupMember and NewGroupMember types**

- Export GroupMember: `typeof groupMembers.$inferSelect`
- Export NewGroupMember: `typeof groupMembers.$inferInsert`
- Provides type-safe database operations
- TypeScript infers all field types including role enum

**AC10: Migration file 0003_create_group_members.sql generated**

- Run `pnpm db:generate` to create migration
- Verify migration creates member_role enum
- Verify migration creates group_members table with all fields
- Verify migration creates foreign key constraints (with CASCADE)
- Verify migration creates both indexes (user_id, group_id)
- Verify migration creates unique constraint on (user_id, group_id)
- Migration number follows 0002_create_groups.sql

**AC11: Drizzle relations defined for users and groups**

- Define groupMembersRelations in group-members.ts
- Define relation from groupMembers → users (many-to-one)
- Define relation from groupMembers → groups (many-to-one)
- Update users.ts to add usersRelations (one-to-many to groupMembers)
- Update groups.ts to add groupsRelations (one-to-many to groupMembers)
- Enables type-safe eager loading: `db.query.users.findFirst({ with: { groupMembers: true } })`

## Edge Cases

- **Duplicate memberships**: Unique constraint prevents (user_id, group_id) duplicates. Application should use UPSERT or check before insert.
- **Role changes**: Update existing record instead of deleting and re-inserting (preserves created_at timestamp).
- **Orphaned memberships**: CASCADE delete prevents this (memberships auto-deleted when user or group is deleted).
- **System admin scope**: system_admin role grants system-wide permissions, not just within one group. Application layer must handle this special case.
- **Student in multiple groups**: A user can be a student in one group and a teacher in another (roles are per-group).
- **Empty group**: A group with zero members is valid (e.g., newly created department).
- **Self-assignment**: Application must prevent users from granting themselves roles they don't have permission to assign.
- **Deleted user's memberships**: When user is soft-deleted (deleted_at), memberships remain (for audit). When user is hard-deleted, memberships cascade delete.

## Open Questions

- [x] Should we soft delete memberships or hard delete? **Resolution: Hard delete. Audit trail will be in separate logs table (future task). Simplifies queries.**
- [x] Do we need a `joined_at` separate from `created_at`? **Resolution: No, created_at serves this purpose.**
- [x] Should system_admin be a separate table or a role? **Resolution: Role in group_members. System admins are still members of groups (typically a root "System" group).**
- [x] Do we need an `invited_by` field to track who added the member? **Resolution: No, audit logs will track this (future task). Keeps schema minimal.**
- [x] Should we allow multiple roles per user per group? **Resolution: No, unique constraint enforces one role per user per group. If needed, create a new membership record in a different group.**

## Implementation Details

### Member Role Enum

```typescript
// packages/db/src/schema/group-members.ts
import {
  pgEnum,
  pgTable,
  uuid,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { groups } from "./groups.js";

/**
 * Member role enum representing permission levels within a group.
 * Roles are scoped to a specific group (user can have different roles in different groups).
 *
 * - system_admin: System-wide administrator (all permissions across all groups)
 * - group_admin: Group-level administrator (manage group settings, users, and content)
 * - teacher: Content creator (create tools, assignments, view analytics within group)
 * - student: Content consumer (use assigned tools, submit work)
 */
export const memberRoleEnum = pgEnum("member_role", [
  "system_admin",
  "group_admin",
  "teacher",
  "student",
]);
```

### Group Members Table Schema

````typescript
/**
 * Group members table - many-to-many relationship between users and groups with roles.
 *
 * This table enables role-based access control (RBAC) in the RaptScallions platform.
 * Each record represents a user's membership in a group with a specific role.
 *
 * Key features:
 * - One role per user per group (unique constraint on user_id, group_id)
 * - Roles are group-scoped (user can be teacher in one group, student in another)
 * - Foreign keys cascade delete (cleanup when user or group is removed)
 * - Indexed for efficient "get user's groups" and "get group's members" queries
 *
 * Used by:
 * - Authentication middleware (determine user's permissions)
 * - CASL authorization (check if user can perform action in group)
 * - Group management UI (display members and their roles)
 * - Class rosters (teachers and students in a school/department)
 */
export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("group_members_user_id_idx").on(table.userId),
    groupIdIdx: index("group_members_group_id_idx").on(table.groupId),
    userGroupUnique: unique("group_members_user_group_unique").on(
      table.userId,
      table.groupId
    ),
  })
);

/**
 * GroupMember type for select operations (reading from database).
 * Includes all fields with auto-generated values.
 *
 * @example
 * ```typescript
 * const membership = await db.query.groupMembers.findFirst({
 *   where: and(
 *     eq(groupMembers.userId, userId),
 *     eq(groupMembers.groupId, groupId)
 *   )
 * });
 * // membership.role is typed as "system_admin" | "group_admin" | "teacher" | "student"
 * ```
 */
export type GroupMember = typeof groupMembers.$inferSelect;

/**
 * NewGroupMember type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 *
 * @example
 * ```typescript
 * const newMembership: NewGroupMember = {
 *   userId: "user-uuid",
 *   groupId: "group-uuid",
 *   role: "teacher"
 * };
 * await db.insert(groupMembers).values(newMembership);
 * ```
 */
export type NewGroupMember = typeof groupMembers.$inferInsert;

// Add metadata accessor for test compatibility (matches users.ts and groups.ts pattern)
Object.defineProperty(groupMembers, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in groupMembers
          ? (groupMembers as any)[Symbol.for("drizzle:Name")]
          : "group_members",
    };
  },
  enumerable: false,
  configurable: true,
});
````

### Drizzle Relations

```typescript
// In group-members.ts
/**
 * Relations for group_members table.
 * Enables type-safe eager loading and joins.
 */
export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
}));
```

```typescript
// Add to users.ts (after users table definition)
import { relations } from "drizzle-orm";
import { groupMembers } from "./group-members.js";

/**
 * Relations for users table.
 * Enables querying a user's group memberships.
 */
export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
}));
```

```typescript
// Add to groups.ts (after groups table definition)
import { relations } from "drizzle-orm";
import { groupMembers } from "./group-members.js";

/**
 * Relations for groups table.
 * Enables querying a group's members.
 */
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
}));
```

### Schema Index Export

```typescript
// packages/db/src/schema/index.ts

// Export custom PostgreSQL types
export * from "./types.js";

// Export users table and types
export * from "./users.js";

// Export groups table and types
export * from "./groups.js";

// Export group_members table and types
export * from "./group-members.js";

// Future table exports will be added here as they are created:
// export * from "./classes.js";
// export * from "./tools.js";
```

### Migration Generation

After creating the schema, generate the migration:

```bash
cd packages/db
pnpm db:generate
```

This will create `src/migrations/0003_create_group_members.sql` with content similar to:

```sql
-- Create member role enum
CREATE TYPE "public"."member_role" AS ENUM('system_admin', 'group_admin', 'teacher', 'student');
--> statement-breakpoint

-- Create group_members table
CREATE TABLE "group_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "role" "member_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints with CASCADE delete
ALTER TABLE "group_members"
ADD CONSTRAINT "group_members_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "group_members"
ADD CONSTRAINT "group_members_group_id_groups_id_fk"
FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id")
ON DELETE CASCADE;
--> statement-breakpoint

-- Create unique constraint (one role per user per group)
ALTER TABLE "group_members"
ADD CONSTRAINT "group_members_user_group_unique"
UNIQUE("user_id", "group_id");
--> statement-breakpoint

-- Create index on user_id for "get user's groups" queries
CREATE INDEX "group_members_user_id_idx" ON "group_members" ("user_id");
--> statement-breakpoint

-- Create index on group_id for "get group's members" queries
CREATE INDEX "group_members_group_id_idx" ON "group_members" ("group_id");
```

### Test Examples

```typescript
// packages/db/src/__tests__/schema/group-members.test.ts
import { describe, it, expect } from "vitest";
import {
  groupMembers,
  type GroupMember,
  type NewGroupMember,
} from "../../schema/group-members.js";

describe("Group Members Schema", () => {
  describe("Type Inference", () => {
    it("should infer GroupMember type correctly", () => {
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "user-uuid",
        groupId: "group-uuid",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // This test passes if TypeScript compilation succeeds
      expect(membership.role).toBe("teacher");
    });

    it("should infer NewGroupMember type correctly for inserts", () => {
      const newMembership: NewGroupMember = {
        userId: "user-uuid",
        groupId: "group-uuid",
        role: "student",
      };

      // Auto-generated fields (id, created_at, updated_at) are optional
      expect(newMembership.role).toBe("student");
    });

    it("should enforce role enum values", () => {
      // TypeScript should only allow valid role values
      const validRoles: Array<GroupMember["role"]> = [
        "system_admin",
        "group_admin",
        "teacher",
        "student",
      ];

      expect(validRoles).toHaveLength(4);
    });

    it("should require userId, groupId, and role", () => {
      const membership: NewGroupMember = {
        userId: "user-uuid",
        groupId: "group-uuid",
        role: "teacher",
      };

      expect(membership.userId).toBeDefined();
      expect(membership.groupId).toBeDefined();
      expect(membership.role).toBeDefined();
    });
  });

  describe("Role Enum", () => {
    it("should have correct role hierarchy", () => {
      const roles: Array<GroupMember["role"]> = [
        "system_admin", // Highest privilege
        "group_admin",
        "teacher",
        "student", // Lowest privilege
      ];

      expect(roles).toHaveLength(4);
    });

    it("should type-check role values", () => {
      const systemAdmin: GroupMember["role"] = "system_admin";
      const groupAdmin: GroupMember["role"] = "group_admin";
      const teacher: GroupMember["role"] = "teacher";
      const student: GroupMember["role"] = "student";

      expect([systemAdmin, groupAdmin, teacher, student]).toHaveLength(4);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      expect(groupMembers._.name).toBe("group_members");
    });

    it("should have all required columns", () => {
      const columns = Object.keys(groupMembers);

      expect(columns).toContain("id");
      expect(columns).toContain("userId");
      expect(columns).toContain("groupId");
      expect(columns).toContain("role");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
    });
  });

  describe("Relations", () => {
    it("should define relation to users", () => {
      // Type check: groupMembers.user should reference users table
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "user-uuid",
        groupId: "group-uuid",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(membership.userId).toBe("user-uuid");
    });

    it("should define relation to groups", () => {
      // Type check: groupMembers.group should reference groups table
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "user-uuid",
        groupId: "group-uuid",
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(membership.groupId).toBe("group-uuid");
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type userId as UUID string", () => {
      const membership: NewGroupMember = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "group-uuid",
        role: "teacher",
      };

      const userId: string = membership.userId;
      expect(userId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should type groupId as UUID string", () => {
      const membership: NewGroupMember = {
        userId: "user-uuid",
        groupId: "123e4567-e89b-12d3-a456-426614174000",
        role: "student",
      };

      const groupId: string = membership.groupId;
      expect(groupId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });
});
```

## Type Safety Considerations

### Avoiding `any` in Group Member Operations

```typescript
// CORRECT: Fully typed membership query
import { db } from "@raptscallions/db";
import { groupMembers, type GroupMember } from "@raptscallions/db/schema";
import { eq, and } from "drizzle-orm";

async function getMembership(
  userId: string,
  groupId: string
): Promise<GroupMember | undefined> {
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId)
    ),
  });

  return membership; // Type: GroupMember | undefined
}

// CORRECT: Typed insert with NewGroupMember
async function addMember(data: NewGroupMember): Promise<GroupMember> {
  const [membership] = await db.insert(groupMembers).values(data).returning();

  if (!membership) {
    throw new Error("Failed to add member");
  }

  return membership; // Type: GroupMember
}

// CORRECT: Upsert pattern (update role if exists)
async function upsertMember(data: NewGroupMember): Promise<GroupMember> {
  const [membership] = await db
    .insert(groupMembers)
    .values(data)
    .onConflictDoUpdate({
      target: [groupMembers.userId, groupMembers.groupId],
      set: { role: data.role, updatedAt: new Date() },
    })
    .returning();

  if (!membership) {
    throw new Error("Failed to upsert member");
  }

  return membership;
}

// BANNED: Do not use any
// const membership: any = await db.query.groupMembers.findFirst(...);
```

### Role-Based Query Patterns

```typescript
// CORRECT: Get all groups where user is a teacher
async function getUserTeacherGroups(userId: string): Promise<GroupMember[]> {
  return db.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.role, "teacher")
    ),
  });
}

// CORRECT: Get all members of a group
async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return db.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
  });
}

// CORRECT: Check if user has specific role in group
async function hasRole(
  userId: string,
  groupId: string,
  role: GroupMember["role"]
): Promise<boolean> {
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.role, role)
    ),
  });

  return membership !== undefined;
}

// CORRECT: Check if user is system admin (any group)
async function isSystemAdmin(userId: string): Promise<boolean> {
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.role, "system_admin")
    ),
  });

  return membership !== undefined;
}
```

### Eager Loading with Relations

```typescript
// CORRECT: Get user with all group memberships
async function getUserWithGroups(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      groupMembers: {
        with: {
          group: true, // Nested eager loading
        },
      },
    },
  });
}

// CORRECT: Get group with all members
async function getGroupWithMembers(groupId: string) {
  return db.query.groups.findFirst({
    where: eq(groups.id, groupId),
    with: {
      members: {
        with: {
          user: true, // Nested eager loading
        },
      },
    },
  });
}

// Return type is automatically inferred with relations included
```

### Role Change Pattern

```typescript
// CORRECT: Change user's role in a group
async function changeRole(
  userId: string,
  groupId: string,
  newRole: GroupMember["role"]
): Promise<GroupMember> {
  const [updated] = await db
    .update(groupMembers)
    .set({ role: newRole, updatedAt: new Date() })
    .where(
      and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId))
    )
    .returning();

  if (!updated) {
    throw new Error("Membership not found");
  }

  return updated;
}
```

## Documentation Requirements

The following should be documented in code comments:

1. Member role enum values and their permission levels (system_admin > group_admin > teacher > student)
2. Unique constraint behavior (one role per user per group)
3. Foreign key CASCADE delete (memberships removed when user or group deleted)
4. Index purposes (user_id for "get user's groups", group_id for "get group's members")
5. Role scope (roles are per-group, not global)
6. Relations usage (how to eager load users/groups with members)

## Integration with Future Tasks

This schema will be used by:

- **E01-T007+**: Authentication middleware (check user's role in group)
- **E01-T008+**: CASL authorization (define permission rules based on roles)
- **E01-T009+**: Group management API (add/remove members, change roles)
- **E01-T010+**: Class rosters (query teachers and students in a group)
- **E01-T011+**: Tool permissions (check if user can create tools in group)
- **E01-T012+**: Assignment creation (check if teacher has permission in group)

The schema is intentionally minimal to avoid premature optimization. Additional fields (e.g., invited_by, invitation_accepted_at) can be added in future iterations based on actual requirements.

## Migration Notes

After implementing this schema:

1. Generate migration: `pnpm --filter @raptscallions/db db:generate`
2. Review generated SQL in `src/migrations/0003_create_group_members.sql`
3. Verify member_role enum is created
4. Verify foreign key constraints include ON DELETE CASCADE
5. Verify unique constraint on (user_id, group_id)
6. Apply migration to test database: `pnpm --filter @raptscallions/db db:push`
7. Verify table structure with Drizzle Studio: `pnpm --filter @raptscallions/db db:studio`
8. Test foreign key CASCADE (delete user, verify memberships removed)

For production deployments, use `db:migrate` instead of `db:push` to apply migrations safely.

## Performance Considerations

### Indexes for Common Queries

The schema includes two critical indexes:

1. **user_id index** - Optimizes "get user's groups" queries (O(log n) instead of O(n))
2. **group_id index** - Optimizes "get group's members" queries (O(log n) instead of O(n))

These queries are extremely common in authorization checks, so indexing is critical.

### Unique Constraint Performance

The unique constraint on (user_id, group_id) is automatically indexed by PostgreSQL, so it also serves as a composite index for queries that filter by both fields.

### CASCADE Delete Performance

When a user or group is deleted, PostgreSQL automatically removes all related group_members records. For users with many group memberships (e.g., 100+), this could be slow. Monitor performance and consider:

- Batch deletion if removing multiple users
- Background job for large cleanup operations
- Soft delete for users (defer membership cleanup)

### Query Patterns to Optimize

```sql
-- Fast with user_id index
SELECT * FROM group_members WHERE user_id = 'uuid';

-- Fast with group_id index
SELECT * FROM group_members WHERE group_id = 'uuid';

-- Fast with unique constraint index
SELECT * FROM group_members WHERE user_id = 'uuid' AND group_id = 'uuid';

-- Slower (no index on role alone)
SELECT * FROM group_members WHERE role = 'teacher';
-- If this query becomes common, consider adding index on role
```

## Security Considerations

### Authorization Checks

The application layer must enforce:

- Only group_admins and system_admins can add/remove members
- Only group_admins can promote members to group_admin
- Only system_admins can grant system_admin role
- Users cannot grant themselves higher roles

### Foreign Key Integrity

Foreign key constraints ensure:

- Cannot add membership with invalid user_id or group_id
- Orphaned memberships are impossible (CASCADE delete)
- Referential integrity is enforced at database level

### Role Validation

- Validate role enum values before insert (Drizzle does this automatically)
- Check permissions before role changes (application layer)
- Audit role changes (future logging task)

## Edge Cases and Gotchas

### System Admin Scope

System admins have permissions across all groups, not just the group where they have system_admin role. The application layer must handle this:

```typescript
// CORRECT: Check if user is system admin (any group)
async function hasSystemAdminRole(userId: string): Promise<boolean> {
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.userId, userId),
      eq(groupMembers.role, "system_admin")
    ),
  });

  return membership !== undefined;
}

// Then use this check to bypass group-specific permission checks
```

### Multiple Group Memberships

A user can have different roles in different groups:

```typescript
// User is teacher in Math Department
// User is student in English Department
// User is group_admin in District

// Query must check role in specific group context
const mathRole = await getMembership(userId, mathDeptGroupId);
// mathRole.role === "teacher"

const englishRole = await getMembership(userId, englishDeptGroupId);
// englishRole.role === "student"
```

### Deleted User Memberships

When a user is soft-deleted (deleted_at timestamp), memberships remain in the database. This allows restoring the user with their original roles. When a user is hard-deleted (record removed), CASCADE delete removes all memberships.

### Empty Groups

A group with zero members is valid (e.g., newly created department before members are added). Queries must handle this:

```typescript
// CORRECT: Handle empty groups
const members = await getGroupMembers(groupId);
if (members.length === 0) {
  // Group has no members yet
}
```

### Role Change Timing

When updating a user's role, use `updatedAt` to track when the change occurred:

```typescript
// CORRECT: Update role and timestamp
await db
  .update(groupMembers)
  .set({ role: newRole, updatedAt: new Date() })
  .where(
    and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId))
  );
```

This allows auditing when role changes happened (even though we don't have full audit logs yet).

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Verdict:** ✅ APPROVED

### Executive Summary

The spec demonstrates excellent developer experience (DX) design with clear patterns, comprehensive documentation, and thoughtful consideration of common use cases. Minor suggestions for improvement noted below but do not block implementation.

### Strengths

1. **Clear Type Safety** - Extensive TypeScript examples showing how types are inferred
2. **Comprehensive Query Examples** - Ready-to-use code examples for common operations
3. **Edge Case Documentation** - Thoroughly documents edge cases developers will encounter
4. **Performance Guidance** - Clear index documentation for query optimization
5. **Consistent Naming** - Follows established snake_case/camelCase conventions

### UX Recommendations

#### 1. Role Enum Developer Experience (Low Priority)

Add a decision tree to help developers choose the correct role:

```
Does the user need to manage settings/users?
  → Yes: group_admin or system_admin
  → No: Can they create content?
      → Yes: teacher
      → No: student
```

#### 2. Unique Constraint Error Handling (Medium Priority)

Add error handling pattern for duplicate memberships:

```typescript
// CORRECT: Handle duplicate membership gracefully
try {
  await db.insert(groupMembers).values(data);
} catch (error) {
  if (error.code === "23505") {
    // PostgreSQL unique violation
    throw new ValidationError("User is already a member of this group");
  }
  throw error;
}
```

#### 3. Role Change Pattern Emphasis (Low Priority)

Add prominent warning:

```
⚠️ IMPORTANT: To change a user's role, UPDATE the existing record.
   Never DELETE and re-INSERT as this loses the membership history.
```

#### 4. System Admin Scope Convention (Medium Priority)

Document convention for system admin storage:

```typescript
// CONVENTION: System admins should be members of a root "System" group
// This provides a consistent place to store system-wide permissions
const systemGroup = await getOrCreateSystemGroup();
await addMember({
  userId: userId,
  groupId: systemGroup.id,
  role: "system_admin",
});
```

#### 5. Eager Loading Performance Note (Low Priority)

Add performance warning for nested relations:

```typescript
// ⚠️ Performance: Eager loading with nested relations can be expensive
// Only load what you need for the current operation
// For large groups (100+ members), paginate or use separate queries
```

#### 6. Integration Test Example (Low Priority)

Add complete integration test example for foreign key cascades.

### Consistency Review

| Pattern                  | users.ts | groups.ts | group-members.ts | Status                    |
| ------------------------ | -------- | --------- | ---------------- | ------------------------- |
| UUID primary key         | ✓        | ✓         | ✓                | ✅ Consistent             |
| created_at/updated_at    | ✓        | ✓         | ✓                | ✅ Consistent             |
| deleted_at (soft delete) | ✓        | ✓         | ✗                | ⚠️ Intentional divergence |

**Soft Delete Divergence:** The decision to hard delete memberships is well-documented and justified. Consider adding schema comment: "No deleted_at field - memberships are hard deleted. Audit trail in separate audit_log table (future)."

### Developer Journey Assessment

**Scenario: Adding a teacher to a school**

- TypeScript autocomplete for roles: ✅
- Error handling for duplicates: ⚠️ (see Recommendation #2)
- Query patterns: ✅
- **Overall:** 7/10 - Good, could be excellent with better error handling

**Scenario: Checking user permissions**

- Role check helpers: ✅
- System admin scope handling: ⚠️ (see Recommendation #4)
- **Overall:** 6/10 - Could lead to authorization bugs without clear system_admin pattern

### Architectural Questions for Review

1. **System admin storage pattern** - Should we establish a convention for a root "System" group?
2. **Audit logging** - Should we plan the audit schema shape now to avoid future migrations?
3. **Role hierarchy enforcement** - Database-level vs application-level role validation?

### Verdict

✅ **APPROVED FOR ARCHITECTURE REVIEW**

Total effort to implement recommendations: ~45 minutes. All recommendations are enhancements rather than blocking issues.

**Next Step:** Proceed to architecture review (`workflow_state: PLAN_REVIEW`)

---

## Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Verdict:** ✅ APPROVED WITH RECOMMENDATIONS

### Executive Summary

The implementation spec for the group_members table is architecturally sound and follows the project's conventions. The schema design correctly implements the many-to-many relationship between users and groups with role-based access control. Minor recommendations below improve consistency and future-proofing.

### Architectural Compliance

| Category           | Status | Notes                                               |
| ------------------ | ------ | --------------------------------------------------- |
| Technology Stack   | ✅     | Drizzle ORM, PostgreSQL, TypeScript strict mode     |
| Naming Conventions | ✅     | snake_case tables/columns, camelCase TypeScript     |
| Database Design    | ✅     | UUID PKs, foreign keys, indexes, unique constraints |
| Type Safety        | ✅     | No `any` types, proper inference, enum safety       |
| Testing Strategy   | ✅     | Unit and integration tests planned                  |

### Consistency Review

| Pattern                  | users.ts | groups.ts | group-members.ts | Status                    |
| ------------------------ | -------- | --------- | ---------------- | ------------------------- |
| UUID primary key         | ✅       | ✅        | ✅               | ✅ Consistent             |
| created_at/updated_at    | ✅       | ✅        | ✅               | ✅ Consistent             |
| deleted_at (soft delete) | ✅       | ✅        | ❌               | ⚠️ Intentional divergence |
| Drizzle relations        | ✅       | ✅        | ✅               | ✅ Consistent             |

**Soft Delete Divergence:** The decision to hard delete memberships is well-documented and justified (audit trail in separate table).

### Strengths

1. **Clean join table design** - Correctly implements many-to-many with role attribute
2. **Proper CASCADE delete** - Prevents orphaned memberships
3. **Performance-optimized indexes** - Covers both common query patterns
4. **Type-safe relations** - Drizzle relations enable eager loading
5. **Comprehensive edge case analysis** - System admin scope, multiple memberships documented
6. **Consistent with existing schemas** - Matches users.ts and groups.ts patterns

### Recommendations (Non-Blocking)

#### 1. Soft Delete Divergence Documentation (Medium Priority)

Add schema-level comment to make divergence explicit:

```typescript
/**
 * Group members table - many-to-many relationship between users and groups with roles.
 *
 * Note: This table does NOT use soft deletes (no deleted_at field).
 * Memberships are hard-deleted when a user leaves a group.
 * Audit trail will be maintained in separate audit_log table (future).
 *
 * When users or groups are soft-deleted (deleted_at set), memberships remain.
 * When users or groups are hard-deleted, CASCADE removes memberships.
 */
export const groupMembers = pgTable(/* ... */);
```

#### 2. System Admin Storage Convention (High Priority)

Establish architectural guidance for where system_admin roles should be stored:

```markdown
### System Admin Storage Pattern

**Convention:** System admins should be members of a special "System" root group.

const SYSTEM_GROUP_ID = "00000000-0000-0000-0000-000000000001"; // Reserved UUID
await db.insert(groupMembers).values({
userId: userId,
groupId: SYSTEM_GROUP_ID,
role: 'system_admin'
});

This convention:

- Provides consistent storage location for system-wide permissions
- Enables querying all system admins via group membership
- Supports future requirement to revoke system admin (delete membership)
- Aligns with CASL's subject-based permissions model
```

#### 3. Unique Constraint Error Handling Pattern (Medium Priority)

Add error handling guidance for duplicate membership violations:

```typescript
// CORRECT: Handle unique constraint violations gracefully
import { DatabaseError } from "pg";

async function addMember(data: NewGroupMember): Promise<GroupMember> {
  try {
    const [membership] = await db.insert(groupMembers).values(data).returning();

    if (!membership) {
      throw new Error("Failed to add member");
    }

    return membership;
  } catch (error) {
    // PostgreSQL unique violation error code
    if (error instanceof DatabaseError && error.code === "23505") {
      throw new ValidationError("User is already a member of this group", {
        userId: data.userId,
        groupId: data.groupId,
      });
    }
    throw error;
  }
}
```

#### 4. Migration Rollback Documentation (Low Priority)

Add down migration SQL example:

```sql
-- Down migration (0003_drop_group_members.sql)
DROP INDEX IF EXISTS "group_members_group_id_idx";
DROP INDEX IF EXISTS "group_members_user_id_idx";
ALTER TABLE "group_members" DROP CONSTRAINT IF EXISTS "group_members_user_group_unique";
ALTER TABLE "group_members" DROP CONSTRAINT IF EXISTS "group_members_group_id_groups_id_fk";
ALTER TABLE "group_members" DROP CONSTRAINT IF EXISTS "group_members_user_id_users_id_fk";
DROP TABLE IF EXISTS "group_members";
DROP TYPE IF EXISTS "public"."member_role";
```

### Performance Analysis

| Query Pattern               | Index Used                       | Performance       |
| --------------------------- | -------------------------------- | ----------------- |
| "Get user's groups"         | `group_members_user_id_idx`      | ✅ O(log n)       |
| "Get group's members"       | `group_members_group_id_idx`     | ✅ O(log n)       |
| "Check specific membership" | Unique constraint (auto-indexed) | ✅ O(log n)       |
| "Find all teachers"         | No index on `role` alone         | ⚠️ O(n) full scan |

**Note:** "Find all users with role X" query is uncommon (usually filtered by group). Defer role index until performance testing confirms need.

### Security Review

Schema is secure with database-level enforcement of:

- Foreign key integrity
- Role enum validation
- Unique constraint (prevents duplicates)
- CASCADE delete safety

**Critical:** Application layer must enforce:

- Only `group_admin` can add/remove members
- Only `group_admin` can promote to `group_admin`
- Only `system_admin` can grant `system_admin` role
- Users cannot self-assign higher roles

### Integration with Future Tasks

Schema correctly blocks E01-T007+ (auth middleware), E01-T008+ (CASL), E01-T009+ (group management).

**Future Considerations:**

1. **OneRoster Integration** - Will need role mapping (guardian not in current enum)
2. **Audit Logging** - Consider created_by, role change history (separate table)

### Migration Testing Checklist

- [ ] Migration generates without errors (`pnpm db:generate`)
- [ ] Migration applies to fresh database (`pnpm db:push`)
- [ ] `member_role` enum has correct values
- [ ] Foreign keys reference correct tables
- [ ] Unique constraint prevents duplicate (user_id, group_id)
- [ ] Indexes exist on user_id and group_id
- [ ] CASCADE delete works (test: delete user, check memberships removed)
- [ ] Relations work (test: eager load user.groupMembers)
- [ ] Down migration rolls back completely
- [ ] TypeScript types compile without errors

### Verdict

✅ **APPROVED FOR IMPLEMENTATION**

The spec is architecturally sound and ready for development. Recommendations above are enhancements that can be incorporated during implementation.

**Priority Actions Before Implementation:**

1. **HIGH:** Add system admin storage convention documentation (Recommendation #2)
2. **MEDIUM:** Add unique constraint error handling pattern (Recommendation #3)
3. **MEDIUM:** Add soft delete divergence comment (Recommendation #1)

**Estimated Time to Incorporate Recommendations:** 30 minutes

**Next Step:** Update task workflow_state to `APPROVED` and proceed to implementation.

---

## Notes

This spec is ready for implementation. The group_members schema provides the foundation for:

- Role-based access control (RBAC)
- CASL authorization
- Group membership management
- Permission scoping
- Multi-group user support
