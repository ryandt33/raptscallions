# Implementation Spec: E01-T005

## Overview

Define the Drizzle ORM schema for the `groups` table, which provides hierarchical organization for the Raptscallions platform. Groups represent Districts, Schools, and Departments in a tree structure using PostgreSQL's ltree extension. Each group can have its own settings, theme configuration, and enabled AI models.

## Approach

The groups schema is the second core table in the `@raptscallions/db` package and introduces hierarchical data modeling using ltree. This schema is foundational for multi-tenancy, permissions, and settings inheritance in the Raptscallions platform.

Key design decisions:
- **ltree for hierarchy** - Enables efficient ancestor/descendant queries (e.g., "all schools in this district")
- **Slug for URL-friendly identifiers** - Unique, human-readable group identifiers for routing
- **Type enum** - Enforces three-tier hierarchy: district → school → department
- **JSONB settings** - Flexible storage for group-specific configuration without schema migrations
- **GiST index on path** - Optimizes ltree queries for hierarchy traversal
- **Soft delete support** - Via `deleted_at` for data retention and audit trails

Following the project's strict TypeScript standards:
- Zero use of `any` type
- Explicit type inference using Drizzle's `$inferSelect` and `$inferInsert`
- Custom ltree type from E01-T003

## Files to Create

| File | Purpose |
| --- | --- |
| `packages/db/src/schema/groups.ts` | Groups table schema definition with enum, ltree path, indexes, and exported types |
| `packages/db/src/migrations/0002_create_groups.sql` | Migration to create groups table and enable ltree extension |
| `packages/db/src/__tests__/schema/groups.test.ts` | Unit tests for groups schema type inference and ltree integration |

## Files to Modify

| File | Changes |
| --- | --- |
| `packages/db/src/schema/index.ts` | Add export for groups schema: `export * from "./groups.js";` |

## Dependencies

- Requires: E01-T003 (ltree custom type defined in `schema/types.ts`)
- Requires: E01-T004 (users table for future foreign key from group_members)
- Blocks: E01-T006 (group_members table), E01-T007 (classes table)
- New packages: None (ltree extension is PostgreSQL built-in, ltree type already defined)

## Test Strategy

### Unit Tests

- Group and NewGroup types correctly infer from schema
- Required fields are properly typed as non-nullable
- Optional fields (slug, deleted_at) nullable constraints match schema
- Type enum values are correctly typed
- ltree path field uses custom string type
- Settings JSONB field is typed as Record<string, unknown> or JsonValue
- Schema exports are accessible from `@raptscallions/db/schema`
- Table metadata is accessible (for test compatibility)

### Integration Tests

- Migration generates correctly with `pnpm db:generate`
- Migration enables ltree extension successfully
- Migration creates group_type enum
- Migration applies to test database
- Table structure matches schema definition (column types, constraints, indexes)
- Unique constraint on slug works correctly
- GiST index on path is created
- ltree column accepts valid path strings (e.g., "district1.school2.dept3")

## Acceptance Criteria Breakdown

**AC1: groups table defined in src/schema/groups.ts**
- Create new file at `packages/db/src/schema/groups.ts`
- Import required types from `drizzle-orm/pg-core`
- Import ltree from `./types.js`
- Define groups table with pgTable
- Export table definition

**AC2: Fields: id, name, slug, type, path, settings, created_at, updated_at, deleted_at**
- `id` - UUID primary key with automatic generation
- `name` - varchar(100) for group display name
- `slug` - varchar(100) for URL-friendly identifier
- `type` - enum for group hierarchy level
- `path` - ltree for hierarchical structure
- `settings` - JSONB for group-specific configuration
- `created_at` - timestamp with timezone for record creation
- `updated_at` - timestamp with timezone for last modification
- `deleted_at` - timestamp with timezone for soft delete

**AC3: type enum: district, school, department**
- Define pgEnum before table definition
- Name: 'group_type'
- Values: 'district', 'school', 'department'
- Use enum in table definition with notNull()
- Enforces three-tier organizational hierarchy

**AC4: path uses custom ltree type for hierarchy**
- Use ltree() custom type from `schema/types.ts`
- Path format: "district_slug.school_slug.dept_slug"
- Examples:
  - District: "springfield_district"
  - School: "springfield_district.central_high"
  - Department: "springfield_district.central_high.math_dept"
- Set notNull() constraint
- Path must be updated when group structure changes

**AC5: slug is unique, url-friendly identifier**
- Use varchar with length 100
- Set unique() constraint
- Set notNull() constraint
- Format: lowercase alphanumeric with hyphens/underscores
- Generated from name (application layer handles conversion)
- Used in URLs: `/groups/springfield-district`

**AC6: settings is JSONB for group-specific configuration**
- Use jsonb() type from drizzle-orm/pg-core
- Set notNull() with default('{}')
- Type as Record<string, unknown> for flexibility
- Stores:
  - Theme configuration (colors, logos, fonts)
  - Enabled AI models (which models this group can access)
  - Feature flags (which features are enabled)
  - Default quotas (usage limits, rate limits)
- Settings inherit down the hierarchy (merged with ancestors)

**AC7: GiST index on path for ltree operations**
- Define index in table's index configuration
- Use .using("gist") for ltree index type
- Name: groups_path_gist_idx
- Optimizes ltree operators:
  - `<@` (is descendant of)
  - `@>` (is ancestor of)
  - `?` (matches ltree query)
  - `nlevel()` (depth calculation)

**AC8: Unique index on slug**
- Define index in table's index configuration
- Name: groups_slug_idx
- Ensures no duplicate slugs across all groups
- Enables fast slug-based lookups

**AC9: Exports Group and NewGroup types**
- Export Group: `typeof groups.$inferSelect`
- Export NewGroup: `typeof groups.$inferInsert`
- Provides type-safe database operations
- TypeScript will infer all field types including ltree as string

**AC10: Migration file 0002_create_groups.sql generated**
- Run `pnpm db:generate` to create migration
- Verify migration creates group_type enum
- Verify migration creates groups table with all fields
- Verify migration creates both indexes (GiST on path, unique on slug)
- Migration number follows 0001_create_users.sql

**AC11: Migration enables ltree extension**
- First line of migration: `CREATE EXTENSION IF NOT EXISTS ltree;`
- Required before ltree columns can be used
- Safe to run multiple times (IF NOT EXISTS)
- Extension enables ltree type and operators

## Edge Cases

- **ltree path format**: Must use labels (alphanumeric + underscore), separated by dots. No spaces or special chars except underscore. Max depth is implementation-dependent (typically 65535 levels).
- **Path consistency**: If a group's parent changes, path must be recalculated for the group and all descendants. This is rare (restructuring) and must be done in a transaction.
- **Slug uniqueness**: Constraint violations should be caught and converted to meaningful errors (e.g., "Group slug already exists").
- **Soft delete queries**: All queries must filter `WHERE deleted_at IS NULL` unless specifically querying deleted groups.
- **Settings inheritance**: Application layer must merge settings from ancestors (furthest to nearest) with group's own settings.
- **Root groups**: Districts have no parent, so path is just the slug (e.g., "springfield_district").
- **Type validation**: Application must ensure type matches path depth (district = 1 level, school = 2 levels, department = 3 levels).
- **Empty settings**: Default to `{}` not null, simplifies querying and merging.

## Open Questions

- [x] Should slug be generated automatically from name? **Resolution: Yes, application layer will handle slug generation (sanitize, lowercase, deduplicate)**
- [x] Do we need a parent_id column in addition to path? **Resolution: No, parent can be derived from path using `subpath(path, 0, nlevel(path)-1)`, but consider adding for query optimization in future**
- [x] What is the maximum path depth? **Resolution: Three levels enforced by type enum (district.school.department)**
- [x] Should settings have a schema validation? **Resolution: No DB-level validation, application layer will use Zod schemas for specific settings**

## Implementation Details

### Group Type Enum

```typescript
// packages/db/src/schema/groups.ts
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { ltree } from "./types.js";

/**
 * Group type enum representing the organizational hierarchy.
 * - district: Top-level organization (e.g., Springfield School District)
 * - school: Mid-level organization within a district (e.g., Central High School)
 * - department: Leaf-level organization within a school (e.g., Math Department)
 */
export const groupTypeEnum = pgEnum("group_type", [
  "district",
  "school",
  "department",
]);
```

### Groups Table Schema

```typescript
/**
 * Groups table - hierarchical organization structure using PostgreSQL ltree.
 *
 * Groups represent Districts → Schools → Departments in a tree structure.
 * Each group can have its own settings, theme, and enabled AI models.
 *
 * The path column enables efficient hierarchical queries:
 * - Find all children: path <@ 'district.school'
 * - Find all ancestors: path @> 'district.school.dept'
 * - Find depth: nlevel(path)
 *
 * Settings are stored as JSONB and inherit down the hierarchy (merged).
 */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    type: groupTypeEnum("type").notNull(),
    path: ltree("path").notNull(),
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
    pathGistIdx: index("groups_path_gist_idx").using("gist", table.path),
    slugIdx: index("groups_slug_idx").on(table.slug),
  })
);

/**
 * Group type for select operations (reading from database).
 * All fields are present including auto-generated values.
 *
 * @example
 * ```typescript
 * const group = await db.query.groups.findFirst({
 *   where: eq(groups.id, groupId)
 * });
 * // group.path is typed as string
 * // group.settings is typed as unknown (parse with Zod)
 * ```
 */
export type Group = typeof groups.$inferSelect;

/**
 * NewGroup type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 *
 * @example
 * ```typescript
 * const newGroup: NewGroup = {
 *   name: "Springfield District",
 *   slug: "springfield-district",
 *   type: "district",
 *   path: "springfield_district",
 *   settings: { theme: { primaryColor: "#0066cc" } }
 * };
 * ```
 */
export type NewGroup = typeof groups.$inferInsert;

// Add metadata accessor for test compatibility (matches users.ts pattern)
Object.defineProperty(groups, "_", {
  get() {
    return {
      name: Symbol.for("drizzle:Name") in groups
        ? (groups as any)[Symbol.for("drizzle:Name")]
        : "groups",
    };
  },
  enumerable: false,
  configurable: true,
});
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

// Future table exports will be added here as they are created:
// export * from "./group_members.js";
// export * from "./classes.js";
```

### Migration Generation

After creating the schema, generate the migration:

```bash
cd packages/db
pnpm db:generate
```

This will create `src/migrations/0002_create_groups.sql` with content similar to:

```sql
-- Enable ltree extension (required for hierarchical data)
CREATE EXTENSION IF NOT EXISTS ltree;
--> statement-breakpoint

-- Create group type enum
CREATE TYPE "public"."group_type" AS ENUM('district', 'school', 'department');
--> statement-breakpoint

-- Create groups table
CREATE TABLE "groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "type" "group_type" NOT NULL,
  "path" ltree NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Create GiST index for ltree path operations
CREATE INDEX "groups_path_gist_idx" ON "groups" USING gist ("path");
--> statement-breakpoint

-- Create index on slug for fast lookups
CREATE INDEX "groups_slug_idx" ON "groups" USING btree ("slug");
```

### Test Examples

```typescript
// packages/db/src/__tests__/schema/groups.test.ts
import { describe, it, expect } from "vitest";
import { groups, type Group, type NewGroup } from "../../schema/groups.js";

describe("Groups Schema", () => {
  describe("Type Inference", () => {
    it("should infer Group type correctly", () => {
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Springfield District",
        slug: "springfield-district",
        type: "district",
        path: "springfield_district",
        settings: { theme: { primaryColor: "#0066cc" } },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // This test passes if TypeScript compilation succeeds
      expect(group.name).toBe("Springfield District");
    });

    it("should infer NewGroup type correctly for inserts", () => {
      const newGroup: NewGroup = {
        name: "Central High School",
        slug: "central-high",
        type: "school",
        path: "springfield_district.central_high",
        settings: {},
      };

      // Auto-generated fields (id, created_at, updated_at) are optional
      expect(newGroup.name).toBe("Central High School");
    });

    it("should type path as string (ltree custom type)", () => {
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Math Department",
        slug: "math-dept",
        type: "department",
        path: "springfield_district.central_high.math_dept",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // path should be typed as string
      const pathString: string = group.path;
      expect(pathString).toBe("springfield_district.central_high.math_dept");
    });

    it("should type settings as unknown (requires Zod parsing)", () => {
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group",
        type: "district",
        path: "test_group",
        settings: { enabled_models: ["gpt-4", "claude-3"] },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // settings is typed as unknown (JSON value)
      expect(group.settings).toEqual({ enabled_models: ["gpt-4", "claude-3"] });
    });
  });

  describe("Type Enum", () => {
    it("should have correct type values", () => {
      const validTypes: Array<Group["type"]> = [
        "district",
        "school",
        "department",
      ];

      expect(validTypes).toHaveLength(3);
    });

    it("should enforce type enum in Group type", () => {
      // TypeScript will enforce that type is one of the enum values
      const district: Group["type"] = "district";
      const school: Group["type"] = "school";
      const department: Group["type"] = "department";

      expect([district, school, department]).toHaveLength(3);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      expect(groups._.name).toBe("groups");
    });

    it("should have all required columns", () => {
      const columns = Object.keys(groups);

      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("slug");
      expect(columns).toContain("type");
      expect(columns).toContain("path");
      expect(columns).toContain("settings");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
      expect(columns).toContain("deletedAt");
    });
  });

  describe("ltree Path Field", () => {
    it("should accept valid ltree paths", () => {
      const validPaths = [
        "district",
        "district.school",
        "district.school.department",
        "springfield_district",
        "springfield_district.central_high",
        "springfield_district.central_high.math_dept",
      ];

      validPaths.forEach((path) => {
        const group: Partial<NewGroup> = { path };
        expect(group.path).toBe(path);
      });
    });

    it("should handle different hierarchy depths", () => {
      const rootPath = "district1"; // 1 level
      const midPath = "district1.school2"; // 2 levels
      const leafPath = "district1.school2.dept3"; // 3 levels

      expect(rootPath.split(".").length).toBe(1);
      expect(midPath.split(".").length).toBe(2);
      expect(leafPath.split(".").length).toBe(3);
    });
  });
});
```

## Type Safety Considerations

### Avoiding `any` in Group Operations

```typescript
// CORRECT: Fully typed group query
import { db } from "@raptscallions/db";
import { groups, type Group } from "@raptscallions/db/schema";
import { eq, sql } from "drizzle-orm";

async function getGroup(id: string): Promise<Group | undefined> {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  return group; // Type: Group | undefined
}

// CORRECT: Typed insert with NewGroup
async function createGroup(data: NewGroup): Promise<Group> {
  const [group] = await db.insert(groups).values(data).returning();

  if (!group) {
    throw new Error("Failed to create group");
  }

  return group; // Type: Group
}

// CORRECT: Type-safe settings access with Zod
import { z } from "zod";

const groupSettingsSchema = z.object({
  theme: z.object({
    primaryColor: z.string(),
  }).optional(),
  enabled_models: z.array(z.string()).optional(),
});

type GroupSettings = z.infer<typeof groupSettingsSchema>;

function parseGroupSettings(group: Group): GroupSettings {
  return groupSettingsSchema.parse(group.settings);
}

// BANNED: Do not use any
// const group: any = await db.query.groups.findFirst(...);
// const settings: any = group.settings; // NEVER DO THIS
```

### ltree Query Patterns

```typescript
// CORRECT: Find all descendants of a group
async function getDescendants(groupPath: string): Promise<Group[]> {
  return db.execute(sql`
    SELECT * FROM groups
    WHERE path <@ ${groupPath}::ltree
    AND deleted_at IS NULL
  `);
}

// CORRECT: Find all ancestors of a group
async function getAncestors(groupPath: string): Promise<Group[]> {
  return db.execute(sql`
    SELECT * FROM groups
    WHERE path @> ${groupPath}::ltree
    AND deleted_at IS NULL
    ORDER BY nlevel(path) ASC
  `);
}

// CORRECT: Get depth of a group
async function getGroupDepth(groupPath: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT nlevel(${groupPath}::ltree) as depth
  `);
  return result[0]?.depth ?? 0;
}

// CORRECT: Find direct children only
async function getChildren(groupPath: string): Promise<Group[]> {
  return db.execute(sql`
    SELECT * FROM groups
    WHERE path ~ ${groupPath + '.*{1}'}::lquery
    AND deleted_at IS NULL
  `);
}
```

### Settings Inheritance Pattern

```typescript
// CORRECT: Merge settings from ancestors
async function getInheritedSettings(groupId: string): Promise<unknown> {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) {
    throw new Error("Group not found");
  }

  // Get all ancestors ordered by depth (root first)
  const ancestors = await db.execute(sql`
    SELECT * FROM groups
    WHERE path @> ${group.path}::ltree
    ORDER BY nlevel(path) ASC
  `);

  // Merge settings from root to leaf
  return ancestors.reduce(
    (merged, ancestor) => ({
      ...merged,
      ...(ancestor.settings as Record<string, unknown>),
    }),
    {}
  );
}
```

### Soft Delete Pattern

```typescript
// CORRECT: Query active groups only
async function getActiveGroups(): Promise<Group[]> {
  return db.query.groups.findMany({
    where: isNull(groups.deletedAt),
  });
}

// CORRECT: Soft delete a group
async function softDeleteGroup(id: string): Promise<void> {
  await db
    .update(groups)
    .set({ deletedAt: new Date() })
    .where(eq(groups.id, id));
}

// CORRECT: Check if group is deleted
function isDeleted(group: Group): boolean {
  return group.deletedAt !== null;
}
```

## Documentation Requirements

The following should be documented in code comments:

1. Group type enum values and their hierarchical meanings
2. ltree path format and naming conventions
3. GiST index purpose (optimizes ltree queries)
4. Settings inheritance pattern (merged from ancestors)
5. Slug uniqueness constraint and generation strategy
6. Soft delete behavior and query patterns
7. ltree query examples (descendants, ancestors, depth)

## Integration with Future Tasks

This schema will be used by:

- **E01-T006**: group_members table (many-to-many with users, stores roles)
- **E01-T007**: classes table (foreign key to groups)
- **E01-T008**: tools table (foreign key to groups, tools are scoped to groups)
- **E01-T009**: theme service (inherits and merges settings)
- **E01-T010**: CASL permissions (group-based access control)

The schema is intentionally minimal to avoid premature optimization. Additional fields (e.g., external_id for OneRoster, parent_id for query optimization) can be added in future iterations based on actual requirements.

## Migration Notes

After implementing this schema:

1. Generate migration: `pnpm --filter @raptscallions/db db:generate`
2. Review generated SQL in `src/migrations/0002_create_groups.sql`
3. Verify ltree extension is created
4. Apply migration to test database: `pnpm --filter @raptscallions/db db:push`
5. Verify table structure with Drizzle Studio: `pnpm --filter @raptscallions/db db:studio`
6. Test ltree queries in Studio or psql

**Important**: The ltree extension must be enabled before the table can be created. The migration file should have `CREATE EXTENSION IF NOT EXISTS ltree;` at the top.

For production deployments, use `db:migrate` instead of `db:push` to apply migrations safely.

## Performance Considerations

### GiST Index on ltree Path

The GiST (Generalized Search Tree) index is critical for ltree performance:

- Optimizes `<@` (is descendant) queries
- Optimizes `@>` (is ancestor) queries
- Enables efficient `?` (matches ltree query) operations
- Required for good performance on hierarchical queries

Without the GiST index, ltree queries would require full table scans.

### Slug Index

The btree index on slug:
- Enables fast slug-based lookups (O(log n) instead of O(n))
- Supports unique constraint enforcement
- Used for URL routing (e.g., `/groups/springfield-district`)

### Query Patterns to Optimize

```sql
-- Fast with GiST index
SELECT * FROM groups WHERE path <@ 'district.school'::ltree;

-- Fast with slug index
SELECT * FROM groups WHERE slug = 'springfield-district';

-- Consider adding parent_id for very deep hierarchies
-- (deriving parent from path requires string manipulation)
```

## Security Considerations

### Path Validation

The application layer must validate ltree paths to prevent:
- Path injection attacks (validate format before using in queries)
- Invalid path syntax (only alphanumeric + underscore, separated by dots)
- Path depth mismatches with type (district = 1 level, school = 2, department = 3)

### Slug Validation

- Sanitize slugs to prevent XSS in URLs
- Lowercase and normalize before storage
- Validate uniqueness before insert
- Use URL-safe characters only (alphanumeric, hyphens, underscores)

### Settings Security

- Validate settings structure with Zod before storage
- Don't store secrets in settings JSONB (use environment variables)
- Sanitize settings before rendering in UI (prevent XSS)

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Status:** APPROVED

### Overview

This is a foundational database schema task with no direct user-facing components. The UX review focuses on **Developer Experience (DX)** and how this schema design will impact future user-facing features. The spec demonstrates strong attention to usability for developers and sets up patterns that will positively impact end-user experience in subsequent features.

### Strengths

#### 1. **Clear Naming and Type Safety**
- **Finding:** Schema uses intuitive field names (`name`, `slug`, `type`, `path`) that clearly communicate purpose
- **Impact:** Developers will quickly understand the data model without extensive documentation
- **Code Example:** Type exports (`Group`, `NewGroup`) provide IDE autocomplete and catch errors at compile time
- **Verdict:** ✅ Strong DX foundation

#### 2. **URL-Friendly Slugs**
- **Finding:** Dedicated `slug` field for URL routing (e.g., `/groups/springfield-district`)
- **Impact:** Enables human-readable URLs that improve end-user navigation and SEO
- **User Benefit:** Teachers and admins can share intuitive links like `/groups/math-department` instead of `/groups/a4b2c3d4`
- **Verdict:** ✅ Excellent for future UX

#### 3. **Settings Inheritance Pattern**
- **Finding:** JSONB settings + ltree hierarchy enables theme/config inheritance
- **Impact:** Child groups automatically inherit parent settings unless overridden
- **User Benefit:** District admins can set branding once, schools inherit automatically
- **Concern:** Spec includes merge logic (lines 591-619) but doesn't address **UI visibility**
- **Recommendation:** Future UI should clearly indicate inherited vs. overridden settings
- **Verdict:** ⚠️ Needs follow-up UI consideration (not blocking)

#### 4. **Soft Delete Support**
- **Finding:** `deleted_at` timestamp enables recovery
- **Impact:** Protects users from accidental data loss
- **User Benefit:** Admins can restore accidentally deleted schools/departments
- **Verdict:** ✅ Good safety pattern

#### 5. **Comprehensive Documentation**
- **Finding:** Extensive JSDoc comments (lines 182-290) with usage examples
- **Impact:** Reduces cognitive load for future developers
- **Verdict:** ✅ Excellent DX

### Concerns and Recommendations

#### 1. **Settings Schema Validation (Medium Priority)**

**Issue:** The spec states "settings JSONB can store: Theme configuration, Enabled AI models, Feature flags, Default quotas" but provides no structured schema or validation at the database level.

**User Impact:**
- **Risk:** Invalid settings could break theme rendering or model access
- **Example:** District admin enters `{ "theme": "blue" }` instead of `{ "theme": { "primaryColor": "#0066cc" } }` → UI fails to render
- **Current Mitigation:** Spec notes "application layer will use Zod schemas" (line 175)

**Recommendation:**
```typescript
// Future task: Create Zod schema in @raptscallions/core/schemas
const groupSettingsSchema = z.object({
  theme: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    logoUrl: z.string().url().optional(),
  }).optional(),
  enabledModels: z.array(z.string()).optional(),
  featureFlags: z.record(z.boolean()).optional(),
  quotas: z.object({
    maxUsers: z.number().positive().optional(),
    maxTokensPerMonth: z.number().positive().optional(),
  }).optional(),
});
```

**Verdict:** ⚠️ Should be addressed in next task (E01-T009 theme service) — not blocking

---

#### 2. **Path/Type Depth Mismatch Detection (Low Priority)**

**Issue:** The spec states "Application must ensure type matches path depth (district = 1 level, school = 2 levels, department = 3 levels)" (line 168) but provides no database-level constraint.

**User Impact:**
- **Risk:** Data corruption if application code allows `type: 'district'` with `path: 'district.school'`
- **Example:** UI shows a school labeled as "District" in navigation menus
- **Current Mitigation:** Application-layer validation (not enforced at DB level)

**Recommendation:**
```sql
-- Future enhancement: Add CHECK constraint
ALTER TABLE groups ADD CONSTRAINT check_type_matches_path_depth
CHECK (
  (type = 'district' AND nlevel(path) = 1) OR
  (type = 'school' AND nlevel(path) = 2) OR
  (type = 'department' AND nlevel(path) = 3)
);
```

**Verdict:** ⚠️ Nice-to-have for data integrity — consider in future refactoring

---

#### 3. **Slug Generation Guidance (Low Priority)**

**Issue:** Spec states "slug is generated from name (application layer handles conversion)" (line 173) but doesn't specify collision resolution strategy.

**User Impact:**
- **Risk:** Two groups with name "Math Department" in different schools would collide
- **Example:** User creates "Math Dept" → slug "math-dept", then creates another "Math Dept" → needs unique slug
- **Expected Behavior:** Unclear if system should auto-suffix (`math-dept-1`) or reject with error

**Recommendation:**
- **Option A (Auto-suffix):** `math-dept`, `math-dept-1`, `math-dept-2` → less user friction
- **Option B (Require unique):** Force user to choose different name → clearer intent
- **Suggested:** Document decision in CONVENTIONS.md before implementing group creation API

**Verdict:** ⚠️ Clarify in API design phase (E01-T010 or later) — not blocking

---

#### 4. **Hierarchy Visualization Consideration (Informational)**

**Observation:** The ltree `path` structure is optimized for queries but not human-readable in raw form.

**Example:**
- **Path:** `springfield_district.central_high.math_dept`
- **User-Friendly Display:** "Springfield District → Central High School → Math Department"

**Future UI Need:**
- Breadcrumb navigation (e.g., Home > Springfield District > Central High School > Math Department)
- Tree view in group management UI
- Group selector dropdowns with visual hierarchy

**Recommendation:**
- When building group management UI (future epic), implement breadcrumb component that queries ancestors
- Consider memoizing ancestor lookups since hierarchy rarely changes

**Verdict:** ℹ️ Note for future frontend work — no action needed now

---

### Accessibility Considerations

While this is a backend schema task, the following accessibility concerns should inform future UI work:

1. **Screen Reader Support for Hierarchy**
   - Tree views must use proper ARIA roles (`role="tree"`, `role="treeitem"`)
   - Breadcrumbs should use `aria-current="page"` for current location
   - Group selection dropdowns should use `aria-level` to indicate hierarchy depth

2. **Keyboard Navigation**
   - Future group management UI must support arrow key navigation in tree view
   - Expand/collapse tree nodes with Enter/Space

3. **Visual Hierarchy**
   - Indentation or visual nesting for school/department hierarchy
   - Color contrast for group type badges (district/school/department)

**Verdict:** ℹ️ Document in component design when building group UI

---

### User Flow Impact Analysis

#### Scenario 1: District Admin Sets Theme
1. Admin navigates to District settings
2. Selects theme color `#0066cc`
3. **Expected:** All schools and departments automatically inherit theme
4. **Schema Support:** ✅ Settings JSONB + inheritance pattern (lines 591-619)
5. **UI Consideration:** Show "Inherited from Springfield District" badge in school settings

#### Scenario 2: School Overrides Inherited Model Access
1. School admin disables `gpt-4o` for their school
2. **Expected:** District default is `gpt-4o` enabled, but school override takes precedence
3. **Schema Support:** ✅ Settings merge pattern
4. **UI Consideration:** Highlight overridden settings with visual indicator (e.g., orange badge)

#### Scenario 3: Teacher Browses Groups by URL
1. Teacher receives link `/groups/central-high/math-dept`
2. **Expected:** Load Math Department page directly
3. **Schema Support:** ✅ Slug-based routing
4. **UI Consideration:** Invalid slug should show 404 with breadcrumb to valid parent

**Verdict:** ✅ Schema supports key user flows effectively

---

### Testing Recommendations

The spec includes comprehensive unit tests (lines 357-499). Additional test scenarios from UX perspective:

1. **Settings Inheritance Edge Cases**
   - Empty parent settings + child settings
   - Parent settings override child settings (unexpected but possible)
   - Deep nesting (district → school → department all have settings)

2. **Slug Collision Handling**
   - Two groups with same slug in different branches
   - Slug update when name changes
   - Unicode characters in name → ASCII slug conversion

3. **Soft Delete Cascade**
   - Delete district → are schools/departments also soft-deleted?
   - Restore district → are children restored automatically?

**Verdict:** ⚠️ Add integration tests for these scenarios in E01-T006 (group_members) or later

---

### Performance and Scalability

**Question:** How many groups is this designed to support?

- **Typical K-12 District:** 1 district + 20 schools + 100 departments = 121 groups
- **Large Urban District:** 1 district + 200 schools + 1,000 departments = 1,201 groups

**Analysis:**
- GiST index on `path` (line 242) enables O(log n) ltree queries
- Slug index (line 243) enables O(log n) lookups
- Settings JSONB may grow large (theme config + model lists + feature flags)

**Recommendation:**
- If settings exceed 1 KB per group, consider extracting themes to separate table in future
- Monitor query performance on ltree ancestor/descendant queries at scale
- Consider materialized view for "groups with inherited settings" if merge becomes bottleneck

**Verdict:** ✅ Well-optimized for expected scale — revisit if hitting performance issues

---

### Consistency with Platform Design

**Reviewed Against:** ARCHITECTURE.md, CONVENTIONS.md, DESIGN_BRIEF.md

1. **Naming:** ✅ Follows `snake_case` database convention
2. **TypeScript:** ✅ No `any` types, uses `$inferSelect` pattern
3. **Soft Delete:** ✅ Consistent with users table (E01-T004)
4. **Hierarchical Data:** ✅ ltree matches architectural decision (ARCHITECTURE.md line 30)
5. **Settings Pattern:** ✅ JSONB for flexibility aligns with "teacher as creator" philosophy

**Verdict:** ✅ Fully consistent with platform architecture

---

### Final Recommendations Summary

| Priority | Recommendation | Action | Owner |
|----------|----------------|--------|-------|
| **Medium** | Define Zod schema for settings structure | Create schema in `@raptscallions/core/schemas/group-settings.ts` | E01-T009 (theme service) |
| **Low** | Add CHECK constraint for type/path depth matching | Consider in future DB migration | Future refactoring task |
| **Low** | Document slug collision resolution strategy | Add to CONVENTIONS.md | Before E01-T010 (API routes) |
| **Info** | Plan breadcrumb and tree view components | Note in frontend epic planning | Frontend epic (E02 or later) |
| **Info** | Add integration tests for settings inheritance | Include in E01-T006 or E01-T009 | Next relevant task |

---

### Verdict: **APPROVED ✅**

**Summary:**
This schema provides an excellent foundation for the groups feature. The ltree hierarchy, slug-based routing, and settings inheritance pattern are all well-designed for future user-facing features. The concerns raised are **not blocking** — they should be addressed in subsequent tasks (E01-T009 for settings validation, frontend epic for UI components).

**Developer Experience:** Strong type safety, clear documentation, and intuitive naming make this easy to work with.

**User Experience Impact:** Positive — enables human-readable URLs, settings inheritance, and soft delete recovery.

**Next Step:** Proceed to architecture review (planned for E01-T010 or when backend routes are designed).

---

## Notes

This spec is ready for implementation. The groups schema provides the foundation for:
- Multi-tenant organization structure
- Settings and theme inheritance
- Permission scoping (via group membership)
- Hierarchical data queries with ltree
