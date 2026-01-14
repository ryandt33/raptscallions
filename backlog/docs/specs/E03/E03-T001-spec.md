# E03-T001: Classes and class_members schemas - Implementation Specification

**Status:** Draft
**Epic:** E03 - Classes and Class Management
**Created:** 2026-01-12
**Analyst:** analyst agent

---

## 1. Overview

### 1.1 Purpose

Define Drizzle ORM schemas for `classes` and `class_members` tables to support teaching groups within the RaptScallions platform. Classes represent teaching groups (like "Period 3 Algebra I") within a school or department, while class_members tracks the roster of teachers and students in each class.

### 1.2 Context

This task builds upon the existing hierarchical group structure (Districts → Schools → Departments) established in E01-T005. Classes are organizational units **within** groups (typically at the school or department level) that:

- Contain rosters of specific teachers and students
- Have tools assigned to them (future: E03-T003)
- Track assignments and submissions (future)
- Support multiple teachers per class (co-teaching)
- Enable students to be in multiple classes

### 1.3 Goals

- Define type-safe Drizzle schemas for classes and class memberships
- Establish foreign key relationships with groups and users
- Create proper indexes for roster queries
- Follow established patterns from users/groups/group-members schemas
- Provide comprehensive test coverage

### 1.4 Non-Goals

- Class service layer (E03-T003)
- Class API routes (E03-T004)
- Assignment or tool assignment functionality
- Class settings/configuration beyond basic JSONB field
- Class roster management UI

---

## 2. Architecture

### 2.1 Data Model

```
groups (existing)
    ↓ 1:N
classes
    ↓ N:M
class_members ← N:1 → users (existing)
```

**Key Relationships:**

1. **groups → classes**: One-to-many (a group can have many classes)
2. **classes ↔ class_members**: One-to-many (a class has many members)
3. **users ↔ class_members**: One-to-many (a user can be in many classes)
4. **class_members unique constraint**: (class_id, user_id) - one role per user per class

### 2.2 Schema Definitions

#### 2.2.1 class_role Enum

```typescript
export const classRoleEnum = pgEnum("class_role", ["teacher", "student"]);
```

**Design Notes:**

- Only two roles: `teacher` and `student` (unlike group_members which has 4 roles)
- Multiple teachers allowed per class (co-teaching support)
- No admin roles at class level (managed at group level)
- Role determines permissions within class context (future CASL integration)

#### 2.2.2 classes Table

```typescript
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    settings: jsonb("settings").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    groupIdIdx: index("classes_group_id_idx").on(table.groupId),
  })
);
```

**Field Specifications:**

| Field        | Type         | Constraints                         | Notes                                       |
| ------------ | ------------ | ----------------------------------- | ------------------------------------------- |
| `id`         | UUID         | PRIMARY KEY, auto-generated         | Uses `gen_random_uuid()`                    |
| `group_id`   | UUID         | NOT NULL, FK to groups(id), CASCADE | Class belongs to one group                  |
| `name`       | VARCHAR(100) | NOT NULL                            | Display name (e.g., "Period 3 Algebra I")   |
| `settings`   | JSONB        | NOT NULL, DEFAULT '{}'              | Extensible config (future: grading, themes) |
| `created_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT now()             | Audit trail                                 |
| `updated_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT now()             | Modified timestamp                          |
| `deleted_at` | TIMESTAMPTZ  | NULL                                | Soft delete support                         |

**Indexes:**

- `classes_group_id_idx` (B-tree): Optimizes "get all classes in a group" queries

**Soft Delete:**

- Classes support soft delete via `deleted_at` timestamp
- Allows archiving classes without losing historical data
- Cascade behavior: When group is deleted, all classes are deleted (respects soft delete)

#### 2.2.3 class_members Table

```typescript
export const classMembers = pgTable(
  "class_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: classRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    classIdIdx: index("class_members_class_id_idx").on(table.classId),
    userIdIdx: index("class_members_user_id_idx").on(table.userId),
    uniqueMembership: unique("class_members_class_user_unique").on(
      table.classId,
      table.userId
    ),
  })
);
```

**Field Specifications:**

| Field        | Type        | Constraints                          | Notes                       |
| ------------ | ----------- | ------------------------------------ | --------------------------- |
| `id`         | UUID        | PRIMARY KEY, auto-generated          | Uses `gen_random_uuid()`    |
| `class_id`   | UUID        | NOT NULL, FK to classes(id), CASCADE | Member belongs to one class |
| `user_id`    | UUID        | NOT NULL, FK to users(id), CASCADE   | Member is one user          |
| `role`       | class_role  | NOT NULL                             | 'teacher' or 'student'      |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()              | When user joined class      |

**Indexes:**

- `class_members_class_id_idx` (B-tree): Optimizes "get all members of a class" (roster queries)
- `class_members_user_id_idx` (B-tree): Optimizes "get all classes for a user" (schedule queries)

**Constraints:**

- `class_members_class_user_unique`: UNIQUE(class_id, user_id) - prevents duplicate memberships
  - A user can only have ONE role per class
  - To change roles, UPDATE the existing record (don't create new one)

**Design Decision - No updated_at:**

- Unlike group_members, class_members does NOT have `updated_at`
- Reason: Role changes in classes are rare and can be tracked via audit log (future)
- Simplifies schema and aligns with "minimal viable fields" principle
- If role changes become common, can add `updated_at` in future migration

**No Soft Delete:**

- Class memberships do NOT support soft delete (no `deleted_at`)
- When a student/teacher leaves a class, the record is hard-deleted
- Rationale: Audit trail will be in separate `audit_log` table (future)
- Matches group_members pattern

### 2.3 Type Exports

```typescript
// packages/db/src/schema/classes.ts
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

// packages/db/src/schema/class-members.ts
export type ClassMember = typeof classMembers.$inferSelect;
export type NewClassMember = typeof classMembers.$inferInsert;
```

**Type Inference:**

- `Class`: Includes all fields (id, timestamps) - for SELECT operations
- `NewClass`: Omits auto-generated fields (id, created_at, updated_at) - for INSERT operations
- `ClassMember`: Includes all fields - for SELECT operations
- `NewClassMember`: Omits auto-generated fields (id, created_at) - for INSERT operations

### 2.4 Drizzle Relations

```typescript
// packages/db/src/schema/classes.ts
export const classesRelations = relations(classes, ({ one, many }) => ({
  group: one(groups, {
    fields: [classes.groupId],
    references: [groups.id],
  }),
  members: many(classMembers),
}));

// packages/db/src/schema/class-members.ts
export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [classMembers.userId],
    references: [users.id],
  }),
}));

// Update users relations (in users.ts)
export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
  classMembers: many(classMembers), // NEW
}));

// Update groups relations (in groups.ts)
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  classes: many(classes), // NEW
}));
```

**Relation Examples:**

```typescript
// Get class with group and all members
const classData = await db.query.classes.findFirst({
  where: eq(classes.id, classId),
  with: {
    group: true,
    members: {
      with: {
        user: true,
      },
    },
  },
});

// Get user with all class memberships
const userData = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    classMembers: {
      with: {
        class: true,
      },
    },
  },
});

// Get group with all classes
const groupData = await db.query.groups.findFirst({
  where: eq(groups.id, groupId),
  with: {
    classes: true,
  },
});
```

---

## 3. Implementation Plan

### 3.1 File Structure

```
packages/db/src/
├── schema/
│   ├── classes.ts          # NEW - classes table schema
│   ├── class-members.ts    # NEW - class_members table schema
│   ├── groups.ts           # MODIFY - add classes relation
│   ├── users.ts            # MODIFY - add classMembers relation
│   └── index.ts            # MODIFY - export new schemas
├── migrations/
│   └── 0005_create_classes.sql  # NEW - migration file
└── __tests__/
    └── schema/
        ├── classes.test.ts       # NEW - classes schema tests
        └── class-members.test.ts # NEW - class_members schema tests
```

### 3.2 Implementation Steps

#### Step 1: Create classes.ts schema file

**Location:** `packages/db/src/schema/classes.ts`

**Implementation:**

1. Import Drizzle types and existing schemas
2. Define `classes` table with all fields
3. Add index on `group_id`
4. Export `Class` and `NewClass` types
5. Add metadata accessor for test compatibility
6. Define `classesRelations` for bidirectional queries

**Pattern:** Follow `groups.ts` structure exactly

- Use same field naming conventions (snake_case in DB, camelCase in TypeScript)
- Include comprehensive JSDoc comments
- Export types immediately after table definition

#### Step 2: Create class-members.ts schema file

**Location:** `packages/db/src/schema/class-members.ts`

**Implementation:**

1. Import Drizzle types and existing schemas
2. Define `classRoleEnum` with 'teacher' and 'student' values
3. Define `classMembers` table with all fields
4. Add indexes on `class_id` and `user_id`
5. Add unique constraint on `(class_id, user_id)`
6. Export `ClassMember` and `NewClassMember` types
7. Add metadata accessor for test compatibility
8. Define `classMembersRelations` for bidirectional queries

**Pattern:** Follow `group-members.ts` structure exactly

- Comprehensive JSDoc explaining role semantics
- Document unique constraint behavior
- Explain CASCADE delete behavior

#### Step 3: Update existing schema files

**File:** `packages/db/src/schema/users.ts`

- Add `classMembers: many(classMembers)` to `usersRelations`
- Import `classMembers` table

**File:** `packages/db/src/schema/groups.ts`

- Add `classes: many(classes)` to `groupsRelations`
- Import `classes` table

**File:** `packages/db/src/schema/index.ts`

- Add `export * from "./classes.js";`
- Add `export * from "./class-members.js";`

#### Step 4: Create migration file

**Location:** `packages/db/src/migrations/0005_create_classes.sql`

**Contents:**

```sql
-- Create class_role enum
CREATE TYPE "public"."class_role" AS ENUM('teacher', 'student');

-- Create classes table
CREATE TABLE "classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

-- Create class_members table
CREATE TABLE "class_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "class_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "classes"
  ADD CONSTRAINT "classes_group_id_groups_id_fk"
  FOREIGN KEY ("group_id")
  REFERENCES "public"."groups"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "class_members"
  ADD CONSTRAINT "class_members_class_id_classes_id_fk"
  FOREIGN KEY ("class_id")
  REFERENCES "public"."classes"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "class_members"
  ADD CONSTRAINT "class_members_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "public"."users"("id")
  ON DELETE cascade
  ON UPDATE no action;

-- Create indexes
CREATE INDEX "classes_group_id_idx" ON "classes" USING btree ("group_id");
CREATE INDEX "class_members_class_id_idx" ON "class_members" USING btree ("class_id");
CREATE INDEX "class_members_user_id_idx" ON "class_members" USING btree ("user_id");

-- Add unique constraint
ALTER TABLE "class_members"
  ADD CONSTRAINT "class_members_class_user_unique"
  UNIQUE("class_id", "user_id");
```

**Note:** Use Drizzle's `drizzle-kit generate` to auto-generate this migration for accuracy

#### Step 5: Create classes.test.ts

**Location:** `packages/db/src/__tests__/schema/classes.test.ts`

**Test Coverage:**

1. **Type Inference** - Verify `Class` and `NewClass` types
2. **Schema Definition** - Verify table name and columns
3. **Schema Exports** - Verify exports are defined
4. **Foreign Keys** - Verify `group_id` is typed correctly
5. **Type Safety** - Verify required fields
6. **Soft Delete** - Verify `deleted_at` field exists
7. **Settings Field** - Verify JSONB settings field
8. **Edge Cases**:
   - Class with no members
   - Class with multiple teachers
   - Class with deleted_at (archived class)
   - Settings with different configurations

**Pattern:** Follow `groups.test.ts` structure exactly

- AAA pattern (Arrange/Act/Assert)
- Comprehensive JSDoc for each test
- Test both happy path and edge cases

#### Step 6: Create class-members.test.ts

**Location:** `packages/db/src/__tests__/schema/class-members.test.ts`

**Test Coverage:**

1. **Type Inference** - Verify `ClassMember` and `NewClassMember` types
2. **Role Enum** - Verify 'teacher' and 'student' values
3. **Schema Definition** - Verify table name and columns
4. **Schema Exports** - Verify exports are defined
5. **Foreign Keys** - Verify `class_id` and `user_id` types
6. **Type Safety** - Verify required fields
7. **Edge Cases**:
   - User in multiple classes with different roles
   - Multiple teachers in same class
   - Class with only students (no teacher yet)
   - Unique constraint on (class_id, user_id)
   - User with both group_member and class_member roles

**Pattern:** Follow `group-members.test.ts` structure exactly

- Test all enum values
- Test foreign key relationships
- Test unique constraint behavior (type-level)

---

## 4. Testing Strategy

### 4.1 Test Coverage Requirements

**Target:** 100% line coverage for schema definitions (types are compile-time verified)

### 4.2 Test Organization

```typescript
describe("Classes Schema", () => {
  describe("Type Inference", () => { ... });
  describe("Schema Definition", () => { ... });
  describe("Schema Exports", () => { ... });
  describe("Foreign Key Fields", () => { ... });
  describe("Type Safety", () => { ... });
  describe("Settings Field", () => { ... });
  describe("Soft Delete", () => { ... });
  describe("Edge Cases", () => { ... });
});

describe("Class Members Schema", () => {
  describe("Type Inference", () => { ... });
  describe("Role Enum", () => { ... });
  describe("Schema Definition", () => { ... });
  describe("Schema Exports", () => { ... });
  describe("Foreign Key Fields", () => { ... });
  describe("Type Safety", () => { ... });
  describe("Edge Cases", () => { ... });
  describe("Relations Type Checking", () => { ... });
});
```

### 4.3 Running Tests

```bash
# All db package tests
pnpm --filter @raptscallions/db test

# Specific schema tests
pnpm --filter @raptscallions/db test classes
pnpm --filter @raptscallions/db test class-members

# With coverage
pnpm --filter @raptscallions/db test:coverage
```

---

## 5. Validation Criteria

### 5.1 Acceptance Criteria Mapping

| AC   | Requirement                                                              | Validation Method                    |
| ---- | ------------------------------------------------------------------------ | ------------------------------------ |
| AC1  | classes table with id, group_id FK, name, settings (jsonb), timestamps   | Code review + schema inspection      |
| AC2  | class_members table with id, class_id FK, user_id FK, role enum          | Code review + schema inspection      |
| AC3  | class_role enum: 'teacher', 'student'                                    | Code review + test verification      |
| AC4  | Foreign keys with CASCADE delete                                         | Migration file inspection            |
| AC5  | Unique constraint on (class_id, user_id)                                 | Migration file inspection            |
| AC6  | Indexes on class_id and user_id for roster queries                       | Migration file inspection            |
| AC7  | TypeScript types exported (Class, NewClass, ClassMember, NewClassMember) | Code review + test verification      |
| AC8  | Migration file 0005_create_classes.sql                                   | File existence + SQL review          |
| AC9  | Drizzle relations defined for bidirectional queries                      | Code review + manual query test      |
| AC10 | Tests verify schema constraints and relations                            | Test suite passes with 100% coverage |

### 5.2 Code Quality Checks

**Before submitting:**

1. ✅ `pnpm typecheck` passes (zero TypeScript errors)
2. ✅ `pnpm lint` passes (zero ESLint warnings)
3. ✅ `pnpm --filter @raptscallions/db test` passes (all tests green)
4. ✅ Test coverage ≥ 100% for new schema files
5. ✅ Migration generates without errors: `pnpm --filter @raptscallions/db db:generate`
6. ✅ Migration applies cleanly: `pnpm --filter @raptscallions/db db:push` (on test database)

---

## 6. Technical Considerations

### 6.1 Database Performance

**Index Strategy:**

- `classes_group_id_idx`: Optimizes "get all classes in group" (common query)
- `class_members_class_id_idx`: Optimizes roster queries (very common)
- `class_members_user_id_idx`: Optimizes "get user's schedule" (common)

**Unique Constraint:**

- `class_members_class_user_unique`: Prevents accidental duplicate enrollments
- Index is automatically created for unique constraint (no separate index needed)

**Query Performance Estimates:**

- Get all classes in a group: O(log N) + result size (B-tree index scan)
- Get class roster: O(log N) + roster size (index scan + join)
- Get user's classes: O(log N) + class count (index scan + join)

### 6.2 Soft Delete Implications

**Classes soft delete:**

- When `deleted_at IS NOT NULL`, class is "archived"
- Class members remain (for historical reporting)
- Queries MUST filter: `WHERE deleted_at IS NULL` (or use `isNull(classes.deletedAt)`)
- Service layer (E03-T003) will handle this filtering

**Class members NO soft delete:**

- Hard delete when user leaves class
- Simpler queries (no deleted_at filter needed)
- Audit trail handled separately (future)

### 6.3 CASCADE Delete Behavior

**Scenario 1: User deleted**

- CASCADE deletes all class_members records for that user
- User automatically removed from all classes
- Follows same pattern as group_members

**Scenario 2: Group deleted**

- CASCADE deletes all classes in that group
- CASCADE then deletes all class_members for those classes
- Two-level cascade works correctly in PostgreSQL

**Scenario 3: Class deleted**

- CASCADE deletes all class_members for that class
- All rosters cleared automatically

**Important:** Soft-deleting a group (setting `deleted_at`) does NOT trigger CASCADE. Only hard deletes trigger CASCADE.

### 6.4 Settings Field Design

**Initial Implementation:**

- Empty JSONB object `{}` by default
- No schema validation at database level
- Future: Define Zod schema for settings validation in service layer

**Potential Settings (future):**

```typescript
{
  "grading": {
    "scale": "standard" | "weighted",
    "passingGrade": 70
  },
  "theme": {
    "color": "#0066cc",
    "icon": "book"
  },
  "features": {
    "enableDiscussions": true,
    "enablePeerReview": false
  }
}
```

### 6.5 Co-Teaching Support

**Multiple Teachers:**

- No limit on number of teachers per class
- Each teacher is a separate `class_members` record with role='teacher'
- All teachers have equal permissions (no "primary teacher" concept initially)
- Future: Could add `is_primary` flag or `teacher_role` field for distinctions

**Query Example:**

```typescript
// Get all teachers for a class
const teachers = await db.query.classMembers.findMany({
  where: and(
    eq(classMembers.classId, classId),
    eq(classMembers.role, "teacher")
  ),
  with: {
    user: true,
  },
});
```

---

## 7. Migration Strategy

### 7.1 Migration Generation

```bash
# Generate migration from schema changes
cd packages/db
pnpm db:generate

# This will create: src/migrations/0005_create_classes.sql
```

### 7.2 Migration Application

**Development:**

```bash
# Apply migration to local database
pnpm --filter @raptscallions/db db:push
```

**Production:**

```bash
# Apply migrations in order (Drizzle handles sequencing)
pnpm --filter @raptscallions/db db:migrate
```

### 7.3 Rollback Plan

**If migration fails:**

1. Identify the failed statement in 0005_create_classes.sql
2. Create rollback migration: 0006_rollback_classes.sql
3. Rollback SQL (drop in reverse order):

```sql
-- Drop constraints and indexes
ALTER TABLE "class_members" DROP CONSTRAINT IF EXISTS "class_members_class_user_unique";
DROP INDEX IF EXISTS "class_members_user_id_idx";
DROP INDEX IF EXISTS "class_members_class_id_idx";
DROP INDEX IF EXISTS "classes_group_id_idx";

-- Drop foreign keys
ALTER TABLE "class_members" DROP CONSTRAINT IF EXISTS "class_members_user_id_users_id_fk";
ALTER TABLE "class_members" DROP CONSTRAINT IF EXISTS "class_members_class_id_classes_id_fk";
ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_group_id_groups_id_fk";

-- Drop tables
DROP TABLE IF EXISTS "class_members";
DROP TABLE IF EXISTS "classes";

-- Drop enum
DROP TYPE IF EXISTS "public"."class_role";
```

---

## 8. Future Considerations

### 8.1 Planned Enhancements

**Not in this task, but designed to support:**

1. **Class Schedules** (future table)

   - Meeting times, days of week
   - Link to classes table

2. **Class Settings Validation** (E03-T003)

   - Zod schema for settings JSONB
   - Service layer validation

3. **Audit Log** (future epic)

   - Track class creation, roster changes, role changes
   - Separate `audit_log` table

4. **Class Hierarchies** (future)

   - Parent/child classes (e.g., lecture + lab sections)
   - Use self-referential FK or ltree if needed

5. **Class Templates** (future)
   - Pre-defined class structures
   - Copy settings/tools from template

### 8.2 Migration Path

**If role enum needs expansion:**

```sql
-- Add new role to enum
ALTER TYPE "class_role" ADD VALUE 'teaching_assistant';

-- Enum modification is append-only in PostgreSQL
-- Cannot remove or reorder enum values
-- Must create new enum and migrate data if removal needed
```

**If unique constraint needs modification:**

```sql
-- Drop old constraint
ALTER TABLE "class_members" DROP CONSTRAINT "class_members_class_user_unique";

-- Add new constraint (e.g., if allowing multiple roles per user)
-- (This would be a breaking change requiring data migration)
```

---

## 9. Documentation Requirements

### 9.1 Code Documentation

**Required JSDoc for:**

- Each table definition (comprehensive comment block)
- Each enum definition (explain values and semantics)
- Each exported type (with usage examples)
- Each relation definition (with query examples)

**Example:**

````typescript
/**
 * Classes table - teaching groups within schools/departments.
 *
 * Classes represent specific teaching groups (like "Period 3 Algebra I")
 * that belong to a group (school or department). Each class has a roster
 * of teachers and students tracked in the class_members table.
 *
 * Key features:
 * - Belongs to one group (typically school or department level)
 * - Supports multiple teachers per class (co-teaching)
 * - Settings stored as JSONB for extensibility
 * - Soft delete support via deleted_at
 *
 * @example
 * ```typescript
 * const newClass: NewClass = {
 *   groupId: "school-uuid",
 *   name: "Period 3 Algebra I",
 *   settings: {}
 * };
 * await db.insert(classes).values(newClass);
 * ```
 */
export const classes = pgTable(...);
````

### 9.2 Migration Documentation

**Migration file should include:**

- Comments explaining each section
- Statement breakpoints for Drizzle parsing
- Proper ordering (tables before constraints)

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk                                   | Severity | Mitigation                                                   |
| -------------------------------------- | -------- | ------------------------------------------------------------ |
| Migration fails on apply               | Medium   | Test on local database first, have rollback plan ready       |
| Unique constraint too restrictive      | Low      | Design allows role changes via UPDATE (not new record)       |
| JSONB settings lacks validation        | Low      | Service layer will handle validation (E03-T003)              |
| CASCADE delete unintended side effects | Medium   | Comprehensive documentation, integration tests               |
| Performance issues with large rosters  | Low      | Proper indexes in place, can add composite indexes if needed |

### 10.2 Dependency Risks

| Dependency                        | Risk | Mitigation                                       |
| --------------------------------- | ---- | ------------------------------------------------ |
| groups table must exist           | High | groups table already exists (E01-T005 completed) |
| users table must exist            | High | users table already exists (E01-T004 completed)  |
| Drizzle ORM version compatibility | Low  | Using stable Drizzle 0.29+                       |
| PostgreSQL ltree extension        | N/A  | Not used in classes (only in groups)             |

---

## 11. Appendix

### 11.1 SQL Schema Reference

**Complete schema for reference:**

```sql
-- Enum definition
CREATE TYPE class_role AS ENUM ('teacher', 'student');

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Class members table
CREATE TABLE class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role class_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_members_class_user_unique UNIQUE (class_id, user_id)
);

-- Indexes
CREATE INDEX classes_group_id_idx ON classes(group_id);
CREATE INDEX class_members_class_id_idx ON class_members(class_id);
CREATE INDEX class_members_user_id_idx ON class_members(user_id);
```

### 11.2 Example Queries

**Get all classes in a school:**

```typescript
const schoolClasses = await db.query.classes.findMany({
  where: and(eq(classes.groupId, schoolId), isNull(classes.deletedAt)),
  with: {
    members: {
      where: eq(classMembers.role, "teacher"),
      with: { user: true },
    },
  },
});
```

**Get user's class schedule:**

```typescript
const userSchedule = await db.query.classMembers.findMany({
  where: eq(classMembers.userId, userId),
  with: {
    class: {
      with: { group: true },
    },
  },
});
```

**Add student to class:**

```typescript
await db.insert(classMembers).values({
  classId: "class-uuid",
  userId: "student-uuid",
  role: "student",
});
```

**Change user's role in class:**

```typescript
await db
  .update(classMembers)
  .set({ role: "teacher" })
  .where(
    and(eq(classMembers.classId, classId), eq(classMembers.userId, userId))
  );
```

---

## 12. Sign-off

**Analyst:** analyst agent
**Date:** 2026-01-12
**Status:** Ready for review

**Next Steps:**

1. Architect review (architecture agent)
2. Developer assignment (TDD developer agent)
3. Implementation (E03-T001)
4. Code review (reviewer agent)
5. QA validation (qa agent)

---

## 13. UX Review

**Reviewer:** designer agent
**Date:** 2026-01-12
**Verdict:** APPROVED with recommendations

### 13.1 User Experience Analysis

#### 13.1.1 Data Model User Flow ✅ PASS

**Assessment:** The data model effectively supports the core user journeys:

1. **Teacher creating a class:** Simple path (group → class → add name/settings)
2. **Adding students to roster:** Direct class_members relationship
3. **Co-teaching support:** Multiple teacher records naturally supported
4. **Student viewing schedule:** Efficient user_id → classMembers → classes query

**Strengths:**

- Natural hierarchy matches mental model (School → Classes → Students/Teachers)
- Role enum ('teacher', 'student') is intuitive and matches K-12 terminology
- Settings JSONB provides extensibility without schema changes

#### 13.1.2 Accessibility Considerations ✅ PASS

**Assessment:** Schema design supports accessibility requirements:

1. **Soft delete on classes:** Preserves historical data for screen reader navigation of past courses
2. **Explicit role enum:** Clear role identification supports ARIA labeling in UI
3. **Unique constraint:** Prevents confusing duplicate memberships that could cause navigation issues

**Recommendations:**

- When implementing UI (future), ensure class names are descriptive for screen readers
- Settings JSONB should support future accessibility preferences (text size, contrast)

#### 13.1.3 Naming and Terminology ✅ PASS

**Assessment:** Naming conventions are user-friendly:

1. **"Classes" vs "Courses":** ✅ "Classes" matches K-12 terminology better than "Courses"
2. **"class_members" vs "enrollments":** ✅ "Members" is inclusive of both teachers and students
3. **Role names:** ✅ 'teacher' and 'student' are clear and unambiguous
4. **"settings" field:** ✅ Generic name allows future flexibility

**Note:** No changes needed - terminology aligns with target user base (K-12 educators)

#### 13.1.4 Error Prevention ⚠️ MINOR ISSUE

**Issue:** Unique constraint on (class_id, user_id) prevents duplicate memberships, but the spec doesn't address the UX of changing roles.

**User Scenario:**

- A teaching assistant is initially added as 'student'
- Later needs to be promoted to 'teacher'
- Without clear guidance, UI developer might try INSERT (fails) instead of UPDATE

**Recommendation:**

```typescript
// Add to section 6.5 "Co-Teaching Support"
/**
 * Role Change Pattern (for UI implementation):
 *
 * ❌ Don't create new record:
 * await db.insert(classMembers).values({ classId, userId, role: 'teacher' });
 * // Fails with unique constraint violation
 *
 * ✅ Update existing record:
 * await db.update(classMembers)
 *   .set({ role: 'teacher' })
 *   .where(and(
 *     eq(classMembers.classId, classId),
 *     eq(classMembers.userId, userId)
 *   ));
 */
```

**Impact:** LOW - Already documented in section 11.2 (Example Queries), but should be emphasized earlier

#### 13.1.5 Consistency with Platform Patterns ✅ PASS

**Assessment:** Schema follows established patterns:

1. **Foreign key naming:** Consistent with groups/group_members (groupId, userId)
2. **Timestamp fields:** Matches users/groups pattern (createdAt, updatedAt, deletedAt)
3. **Index naming:** Consistent convention (table_column_idx)
4. **Soft delete:** Matches groups table pattern (classes have deletedAt, members don't)

**Strengths:**

- Developers will find patterns familiar
- UI components can be reused (roster view similar to group members view)
- Reduces cognitive load for new contributors

#### 13.1.6 Multi-User Scenarios ✅ PASS

**Assessment:** Schema handles complex real-world scenarios:

1. **Co-teaching:** ✅ Multiple teachers per class supported
2. **Student in multiple classes:** ✅ Many-to-many relationship works
3. **Teacher teaching multiple classes:** ✅ Same user_id, different class_id records
4. **Teacher who is also a student:** ✅ Supported (different roles in different classes)

**Edge case well-handled:**

```typescript
// User is teacher in one class, student in another
[
  { classId: "algebra-1", userId: "john", role: "teacher" },
  { classId: "professional-development", userId: "john", role: "student" },
];
```

#### 13.1.7 Performance Impact on UX ⚠️ CONSIDERATION

**Assessment:** Index strategy supports fast UI rendering:

1. **Roster view:** class_members_class_id_idx enables fast roster loading
2. **Student schedule:** class_members_user_id_idx enables fast "my classes" view
3. **Group class list:** classes_group_id_idx enables fast school-wide class browsing

**Concern:** Large rosters (100+ students) with nested relations

```typescript
// Potential performance issue
const classData = await db.query.classes.findFirst({
  where: eq(classes.id, classId),
  with: {
    members: {
      with: {
        user: true, // N+1 query risk?
      },
    },
  },
});
```

**Recommendation:**

- Drizzle should handle this efficiently with JOIN
- UI should paginate rosters if > 50 students
- Consider adding guidance in future service layer spec (E03-T003):
  ```typescript
  // Service layer should implement pagination
  async getClassRoster(classId: string, { limit = 50, cursor }: PaginationOpts)
  ```

**Impact:** LOW - Addressed by proper indexes; pagination is UI concern (future)

#### 13.1.8 Settings Field Extensibility ✅ PASS

**Assessment:** JSONB settings field supports future UX enhancements:

**Potential future settings (well-architected for):**

```typescript
{
  "display": {
    "icon": "book",           // Class icon in UI
    "color": "#0066cc"        // Theme color
  },
  "features": {
    "discussions": true,      // Feature toggles
    "peerReview": false
  },
  "grading": {
    "scale": "standard",      // Grading configuration
    "passingGrade": 70
  },
  "accessibility": {          // NEW: Accessibility preferences
    "highContrast": false,
    "textSize": "medium"
  }
}
```

**Strength:** No schema migration needed for UI/UX improvements

### 13.2 Recommendations Summary

#### Must Fix

None - schema is solid from UX perspective

#### Should Consider

1. **Emphasize role change pattern** (Section 6.5)

   - Add explicit "Role Change Pattern" subsection with ✅/❌ examples
   - Helps UI developers avoid constraint violations
   - **Priority:** LOW (already documented elsewhere)

2. **Document roster pagination strategy** (Section 6.1)
   - Add note about pagination recommendation for large rosters
   - Reference for future service layer implementation
   - **Priority:** LOW (out of scope for this task)

#### Nice to Have

3. **Add accessibility settings example** (Section 6.4)
   - Expand "Potential Settings" to include accessibility object
   - Future-proofs for WCAG compliance
   - **Priority:** VERY LOW (informational only)

### 13.3 Verdict

**APPROVED** - This schema design provides an excellent foundation for intuitive, accessible, and performant class management UX.

**Rationale:**

- Data model matches user mental models (School → Classes → Roster)
- Terminology is clear and appropriate for K-12 context
- Supports complex real-world scenarios (co-teaching, multiple enrollments)
- Follows consistent patterns with existing schemas
- Proper indexes ensure fast UI rendering
- Settings JSONB enables future UX improvements without migrations

**Recommendation:** Proceed to architecture review. The minor suggestions are enhancements, not blockers.

**Next step:** Architecture review (architect agent)

---

## 14. Architecture Review

**Reviewer:** Architecture Agent
**Date:** 2026-01-12
**Verdict:** **APPROVED** ✅

### 14.1 Executive Summary

The implementation specification for classes and class_members schemas is architecturally sound and follows established patterns from the existing codebase. The data model correctly implements the hierarchical organization (Groups → Classes → Members), uses appropriate PostgreSQL features, and maintains consistency with prior schema designs (users, groups, group_members, sessions).

**Key Strengths:**

- Proper use of Drizzle ORM patterns established in E01 tasks
- Appropriate CASCADE delete behavior for referential integrity
- Correct index strategy for query optimization
- JSONB settings field provides extensibility without schema migrations
- Soft delete on classes (matches groups pattern)
- Well-documented relations for bidirectional queries

**Blockers:** None

**Recommendations:** Minor documentation enhancements only (optional)

### 14.2 Architecture Compliance

#### Technology Stack ✅ PASS

- Drizzle ORM 0.29+ with proper type inference patterns
- PostgreSQL 16 features (UUID, JSONB, timestamptz)
- TypeScript strict mode with `$inferSelect`/`$inferInsert`
- No use of banned patterns (`any` type, Prisma, etc.)

#### Naming Conventions ✅ PASS

- Tables: `snake_case` plural (`classes`, `class_members`)
- Columns: `snake_case` (`group_id`, `created_at`)
- Indexes: `{table}_{column}_idx` pattern
- TypeScript types: PascalCase (`Class`, `NewClass`)

#### Pattern Consistency ✅ PASS

Perfect consistency with established patterns from:

- E01-T004 (users schema)
- E01-T005 (groups schema with ltree)
- E01-T006 (group_members join table)
- E02-T002 (sessions schema)

### 14.3 Data Model Architecture

#### Entity Relationships ✅ PASS

```
groups (1) ─────< (N) classes (1) ─────< (N) class_members >────┐
                                                                 │
                                                        (N) <──── users
```

- **groups → classes (1:N):** Foreign key with CASCADE delete, indexed
- **classes ↔ class_members (1:N):** Foreign key with CASCADE delete, indexed
- **users ↔ class_members (1:N):** Foreign key with CASCADE delete, indexed
- **Unique constraint:** `(class_id, user_id)` prevents duplicate memberships

#### CASCADE Delete Behavior ✅ PASS

Three scenarios correctly implemented:

1. User deleted → CASCADE deletes all class_members
2. Group deleted → CASCADE deletes classes → CASCADE deletes class_members
3. Class deleted → CASCADE deletes class_members

**Critical Note:** Soft-deleting a group (setting `deleted_at`) does NOT trigger CASCADE. Service layer MUST filter soft-deleted entities in queries.

#### Soft Delete Design ✅ PASS

- `classes`: Has `deleted_at` (archive for historical reporting) ✅
- `class_members`: No `deleted_at` (hard delete, audit trail separate) ✅
- Matches pattern: entities have soft delete, join tables don't ✅

#### Index Strategy ✅ PASS

All common queries have supporting indexes:

- `classes_group_id_idx` - "Get all classes in group" (HIGH frequency)
- `class_members_class_id_idx` - "Get class roster" (VERY HIGH frequency)
- `class_members_user_id_idx` - "Get user's schedule" (HIGH frequency)
- Unique constraint implicitly indexed - No duplicate enrollments

Query performance: O(log N) + result size for all common operations ✅

### 14.4 Security & Performance

#### Type Safety ✅ PASS

- Proper Drizzle type inference (no `any` usage)
- Strict TypeScript compliance
- Parameterized queries (SQL injection prevention)

#### Authorization Patterns ⚠️ FUTURE CONSIDERATION

- Users have `member_role` in groups AND `class_role` in classes
- Permission resolution logic needed for CASL integration (future epic)
- Schema design correctly supports multiple role contexts ✅

#### Performance ✅ PASS

- Optimal index strategy for common queries
- Bulk insert support for large rosters
- Pagination recommended for rosters > 50 students (service layer concern)

### 14.5 Migration Strategy

#### Migration Ordering ✅ PASS

Correct dependency order:

1. Create enum → 2. Create tables → 3. Add FK constraints → 4. Create indexes

Rollback reverses correctly.

#### Migration File Naming ✅ PASS

`0005_create_classes.sql` follows sequential numbering convention

#### Generation Method ⚠️ RECOMMENDATION

Spec includes hand-written SQL. **Recommend using Drizzle Kit auto-generation:**

```bash
cd packages/db
pnpm db:generate
# Review and commit generated file
```

**Rationale:** Auto-generation ensures consistency, prevents human error

### 14.6 Testing Strategy

#### Test Coverage ✅ PASS

- Target: 100% line coverage (achievable for schema files)
- AAA pattern (Arrange/Act/Assert)
- Comprehensive edge cases documented

#### Test Organization ✅ PASS

- Follows `groups.test.ts` and `group-members.test.ts` structure
- Separate describe blocks for type inference, schema definition, edge cases
- Tests verify enum values, foreign keys, unique constraints

### 14.7 Recommendations

#### MUST FIX (Blockers)

**None.** Specification is ready for implementation.

#### SHOULD CONSIDER (Medium Priority)

1. **Add Soft Delete Query Pattern Guidance**

   - **Where:** Section 6.2 "Soft Delete Implications"
   - **What:** Document service layer pattern for filtering soft-deleted groups

   ```typescript
   // CRITICAL: Always filter soft-deleted groups when loading classes
   const activeClasses = await db.query.classes.findMany({
     where: and(eq(classes.groupId, groupId), isNull(classes.deletedAt)),
     with: {
       group: {
         where: isNull(groups.deletedAt), // Don't forget this!
       },
     },
   });
   ```

   - **Impact:** Medium (prevents common service layer bug)

2. **Use Drizzle Kit for Migration**

   - **Where:** Section 7.1
   - **What:** Emphasize `drizzle-kit generate` over hand-written SQL
   - **Impact:** Medium (best practice)

3. **Document Permission Precedence**
   - **Where:** Add subsection 6.6 "Permission Model"
   - **What:** How group-level and class-level roles interact for CASL
   - **Impact:** Low (future concern, good to document now)

#### NICE TO HAVE (Low Priority)

- Pagination guidance for large rosters (service layer concern)
- Composite index analysis (optimization detail)

### 14.8 Risk Assessment

| Risk                         | Severity | Mitigation Status                         |
| ---------------------------- | -------- | ----------------------------------------- |
| Migration fails              | LOW      | Proper ordering, rollback plan ✅         |
| Unique constraint issues     | VERY LOW | Design allows role changes via UPDATE ✅  |
| CASCADE delete unintended    | LOW      | Comprehensive docs, tested pattern ✅     |
| Large roster performance     | LOW      | Proper indexes, pagination possible ✅    |
| Soft delete filter forgotten | MEDIUM   | Document in service layer spec (E03-T003) |

### 14.9 Final Verdict

**APPROVED** ✅

**Conditions:** None (recommendations are optional enhancements)

**Rationale:**

- Architecturally sound and consistent with existing patterns
- Type-safe with proper Drizzle inference
- Performant with appropriate indexes
- Extensible via JSONB settings
- Comprehensive documentation and test strategy
- No architectural blockers identified

**Next Steps:**

1. Analyst: Address optional recommendations if desired
2. PM: Assign to TDD developer agent
3. Developer: Implement with TDD (tests first)
4. Reviewer: Code review against this approval
5. QA: Validate acceptance criteria

**Sign-off:**

- **Architect:** Architecture Agent
- **Date:** 2026-01-12
- **Status:** APPROVED for implementation ✅
