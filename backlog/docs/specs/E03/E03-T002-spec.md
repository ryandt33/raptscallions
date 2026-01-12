# E03-T002 Implementation Specification: Tools Schema with YAML Storage

**Epic:** E03 - Tool System Foundation
**Task:** E03-T002
**Status:** DRAFT
**Author:** analyst
**Created:** 2026-01-12
**Updated:** 2026-01-12

---

## 1. Overview

### 1.1 Purpose

Define the Drizzle schema for the `tools` table that stores YAML-defined AI interactions (Chat and Product types). Tools are created by teachers and can be scoped to specific groups or shared system-wide. This schema supports versioning, group-scoped visibility, and ownership tracking.

### 1.2 Context

The `tools` table is a foundational piece of the Tool System (Epic E03). Each tool represents either:
- **Chat tool**: Multi-turn conversational AI interactions with session state
- **Product tool**: Single input → output AI transformations

Tools are portable, version-controlled, and stored as YAML text. The database stores the raw YAML definition without parsing—validation happens at the service layer.

### 1.3 Success Criteria

- ✅ Drizzle schema definition for `tools` table created at `packages/db/src/schema/tools.ts`
- ✅ `tool_type` enum created with `chat` and `product` values
- ✅ Migration file `0006_create_tools.sql` generated in `packages/db/src/migrations/`
- ✅ TypeScript types `Tool` and `NewTool` exported from schema
- ✅ Schema exports added to barrel file `packages/db/src/schema/index.ts`
- ✅ Comprehensive unit tests created at `packages/db/src/__tests__/schema/tools.test.ts`
- ✅ All TypeScript type checks pass (`pnpm typecheck`)
- ✅ All tests pass (`pnpm --filter @raptscallions/db test`)

---

## 2. Requirements

### 2.1 Functional Requirements

**FR1: Tool Types**
- Tools must have a `type` field with enum values: `chat`, `product`
- Type determines runtime behavior (multi-turn vs single execution)
- Type is immutable after creation (cannot change type of existing tool)

**FR2: Tool Identity**
- Each tool has a unique UUID `id` (auto-generated)
- Tools have a human-readable `name` field (max 100 chars)
- Tools have a `version` field for versioning (max 20 chars, default '1.0.0')
- Unique constraint on `(name, version)` to prevent duplicate versions

**FR3: YAML Definition Storage**
- `definition` field stores the complete YAML as text (no length limit)
- No parsing or validation at database level
- Service layer responsible for YAML parsing and validation

**FR4: Ownership & Visibility**
- `created_by` field references `users.id` (foreign key, not null)
- `group_id` field references `groups.id` (foreign key, nullable)
- If `group_id` is null, tool is system-wide (visible to all)
- If `group_id` is set, tool is scoped to that group and its children (via ltree hierarchy)

**FR5: Audit Trail**
- `created_at` timestamp with timezone (auto-set, not null)
- `updated_at` timestamp with timezone (auto-set, not null)
- `deleted_at` timestamp with timezone (nullable) for soft delete

**FR6: Database Integrity**
- Foreign key from `created_by` to `users.id` with CASCADE delete
- Foreign key from `group_id` to `groups.id` with CASCADE delete
- Indexes on `group_id` and `created_by` for query performance
- Unique constraint on `(name, version)` with automatic index

### 2.2 Non-Functional Requirements

**NFR1: Performance**
- Index on `group_id` for fast "tools in group" queries
- Index on `created_by` for "my tools" queries
- Unique constraint on `(name, version)` automatically indexed

**NFR2: Data Integrity**
- All foreign keys enforce referential integrity
- CASCADE delete ensures orphaned tools are cleaned up
- NOT NULL constraints on required fields

**NFR3: Type Safety**
- Full TypeScript type inference from Drizzle schema
- Exported `Tool` type for select operations
- Exported `NewTool` type for insert operations
- Strictly typed enum for `tool_type`

**NFR4: Testing**
- 100% coverage of schema type inference
- Tests verify all columns exist and are correctly named
- Tests verify foreign key relationships
- Tests verify unique constraints and indexes
- Tests match existing pattern (users.test.ts, classes.test.ts)

---

## 3. Technical Design

### 3.1 Database Schema

**Table:** `tools`

| Column        | Type                  | Constraints                    | Description                                  |
| ------------- | --------------------- | ------------------------------ | -------------------------------------------- |
| `id`          | UUID                  | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique tool identifier                       |
| `type`        | tool_type enum        | NOT NULL                       | Tool type: 'chat' or 'product'               |
| `name`        | VARCHAR(100)          | NOT NULL                       | Human-readable tool name                     |
| `version`     | VARCHAR(20)           | NOT NULL, DEFAULT '1.0.0'      | Semantic version (e.g., '1.0.0', '2.1.3')    |
| `definition`  | TEXT                  | NOT NULL                       | Complete YAML definition as text             |
| `created_by`  | UUID                  | NOT NULL, FK → users(id) CASCADE | User who created the tool                    |
| `group_id`    | UUID                  | NULL, FK → groups(id) CASCADE  | Group scope (null = system-wide)             |
| `created_at`  | TIMESTAMPTZ           | NOT NULL, DEFAULT NOW()        | Creation timestamp                           |
| `updated_at`  | TIMESTAMPTZ           | NOT NULL, DEFAULT NOW()        | Last update timestamp                        |
| `deleted_at`  | TIMESTAMPTZ           | NULL                           | Soft delete timestamp                        |

**Enum:** `tool_type`
- Values: `'chat'`, `'product'`

**Indexes:**
- `tools_group_id_idx` on `group_id` (btree)
- `tools_created_by_idx` on `created_by` (btree)
- Unique constraint on `(name, version)` automatically creates index

**Constraints:**
- `UNIQUE(name, version)` - Prevents duplicate versions of same tool
- `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE`
- `FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE`

### 3.2 File Structure

```
packages/db/src/
├── schema/
│   ├── tools.ts                          # New schema definition
│   └── index.ts                          # Update barrel export
├── migrations/
│   └── 0006_create_tools.sql             # New migration
└── __tests__/
    └── schema/
        └── tools.test.ts                 # New test file
```

### 3.3 Drizzle Schema Definition

**File:** `packages/db/src/schema/tools.ts`

```typescript
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { groups } from "./groups.js";

/**
 * Tool type enum representing the two interaction modes.
 * - chat: Multi-turn conversational AI interactions with session state
 * - product: Single input → output AI transformations
 */
export const toolTypeEnum = pgEnum("tool_type", ["chat", "product"]);

/**
 * Tools table - YAML-defined AI interactions.
 *
 * Tools are created by teachers and define AI-powered interactions.
 * Each tool stores a complete YAML definition as text. Parsing and
 * validation happen at the service layer, not in the database.
 *
 * Visibility:
 * - group_id = null: System-wide tool (visible to all users)
 * - group_id = <uuid>: Group-scoped tool (visible to group and descendants)
 *
 * Versioning:
 * - Tools support semantic versioning via the version field
 * - Unique constraint on (name, version) prevents duplicates
 * - Teachers can create new versions of existing tools
 *
 * Soft delete is supported via deleted_at timestamp.
 */
export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: toolTypeEnum("type").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    version: varchar("version", { length: 20 }).notNull().default("1.0.0"),
    definition: text("definition").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    nameVersionUnique: unique().on(table.name, table.version),
    groupIdIdx: index("tools_group_id_idx").on(table.groupId),
    createdByIdx: index("tools_created_by_idx").on(table.createdBy),
  })
);

/**
 * Tool type for select operations (reading from database).
 * All fields are present including auto-generated values.
 *
 * @example
 * ```typescript
 * const tool = await db.query.tools.findFirst({
 *   where: eq(tools.id, toolId)
 * });
 * // tool.type is 'chat' | 'product'
 * // tool.definition is string (parse with YAML library)
 * // tool.groupId is string | null
 * ```
 */
export type Tool = typeof tools.$inferSelect;

/**
 * NewTool type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 *
 * @example
 * ```typescript
 * const newTool: NewTool = {
 *   type: 'chat',
 *   name: 'Essay Feedback',
 *   version: '1.0.0',
 *   definition: yamlString,
 *   createdBy: userId,
 *   groupId: groupId, // or null for system-wide
 * };
 * ```
 */
export type NewTool = typeof tools.$inferInsert;

// Add metadata accessor for test compatibility (matches users.ts pattern)
Object.defineProperty(tools, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in tools
          ? (tools as any)[Symbol.for("drizzle:Name")]
          : "tools",
    };
  },
  enumerable: false,
  configurable: true,
});
```

### 3.4 Migration SQL

**File:** `packages/db/src/migrations/0006_create_tools.sql`

```sql
CREATE TYPE "public"."tool_type" AS ENUM('chat', 'product');--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "tool_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"definition" text NOT NULL,
	"created_by" uuid NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tools_name_version_unique" UNIQUE("name","version")
);
--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tools_group_id_idx" ON "tools" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "tools_created_by_idx" ON "tools" USING btree ("created_by");
```

**Migration Generation:**
```bash
# Generate migration from schema changes
cd packages/db
pnpm drizzle-kit generate
```

### 3.5 Barrel Export Update

**File:** `packages/db/src/schema/index.ts`

Add after the class-members export:

```typescript
// Export tools table and types
export * from "./tools.js";
```

### 3.6 Relations (Future)

While not implemented in this task, the following relations will be added in future tasks:

```typescript
// Future: In packages/db/src/schema/relations.ts
export const toolsRelations = relations(tools, ({ one }) => ({
  creator: one(users, {
    fields: [tools.createdBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [tools.groupId],
    references: [groups.id],
  }),
}));
```

---

## 4. Testing Strategy

### 4.1 Test File Structure

**File:** `packages/db/src/__tests__/schema/tools.test.ts`

Follow the pattern established in `users.test.ts` and `classes.test.ts`:

```typescript
describe("Tools Schema", () => {
  describe("Type Inference", () => {
    // Test Tool type with all required fields
    // Test nullable groupId for system-wide tools
    // Test non-null groupId for group-scoped tools
    // Test both chat and product types
    // Test version field defaults
    // Test soft delete with deletedAt
  });

  describe("NewTool Type (Insert Operations)", () => {
    // Test NewTool type for inserts
    // Test omission of auto-generated fields
    // Test system-wide tool creation (groupId null)
    // Test group-scoped tool creation
    // Test version defaults
  });

  describe("Tool Type Enum", () => {
    // Test 'chat' type value
    // Test 'product' type value
    // Verify exactly two values exist
  });

  describe("Schema Definition", () => {
    // Test table name is 'tools'
    // Test all columns exist (id, type, name, version, definition, etc.)
    // Test column names match database (snake_case)
  });

  describe("Schema Exports", () => {
    // Test tools table export
    // Test toolTypeEnum export
  });

  describe("Foreign Key Fields", () => {
    // Test createdBy types as UUID string
    // Test groupId types as UUID string or null
    // Verify FK field types match referenced tables
  });

  describe("Type Safety", () => {
    // Test required fields (type, name, version, definition, createdBy)
    // Test optional fields (groupId, deletedAt)
    // Test enum type constraint
  });

  describe("Versioning", () => {
    // Test version field defaults to '1.0.0'
    // Test custom version strings
    // Test semantic versioning patterns (1.0.0, 2.1.3, etc.)
    // Test unique constraint on (name, version)
  });

  describe("Visibility Scoping", () => {
    // Test system-wide tools (groupId null)
    // Test group-scoped tools (groupId set)
    // Verify both patterns are valid
  });

  describe("YAML Definition Field", () => {
    // Test definition stores text
    // Test very long YAML strings
    // Test multi-line YAML content
    // Verify no parsing at schema level
  });

  describe("Soft Delete", () => {
    // Test deletedAt null for active tools
    // Test deletedAt set for soft-deleted tools
    // Distinguish active vs deleted tools
  });

  describe("Edge Cases", () => {
    // Test long tool names (up to 100 chars)
    // Test long version strings (up to 20 chars)
    // Test complex YAML definitions
    // Test minimal required fields only
  });
});
```

### 4.2 Test Coverage Requirements

- **100% line coverage** for schema definition
- **All columns tested** for existence and correct naming
- **All type inferences tested** (Tool, NewTool)
- **All constraints tested** (NOT NULL, UNIQUE, FK references)
- **Enum values tested** (chat, product)
- **Edge cases covered** (max lengths, null/non-null fields)

### 4.3 Running Tests

```bash
# Run all db package tests
pnpm --filter @raptscallions/db test

# Run only tools schema tests
pnpm --filter @raptscallions/db test tools.test

# Run with coverage
pnpm --filter @raptscallions/db test:coverage
```

---

## 5. Implementation Steps

### 5.1 Step-by-Step Implementation

1. **Create Schema File**
   - Create `packages/db/src/schema/tools.ts`
   - Define `toolTypeEnum` with 'chat' and 'product' values
   - Define `tools` table with all columns per spec
   - Add foreign key references with CASCADE
   - Add unique constraint on (name, version)
   - Add indexes on group_id and created_by
   - Export Tool and NewTool types
   - Add metadata accessor for test compatibility

2. **Update Barrel Export**
   - Open `packages/db/src/schema/index.ts`
   - Add `export * from "./tools.js";` after class-members

3. **Generate Migration**
   - Run `cd packages/db && pnpm drizzle-kit generate`
   - Verify migration file created at `packages/db/src/migrations/0006_create_tools.sql`
   - Review SQL for correctness (enum, table, constraints, indexes)

4. **Create Test File**
   - Create `packages/db/src/__tests__/schema/tools.test.ts`
   - Follow structure from users.test.ts and classes.test.ts
   - Write comprehensive tests covering all sections in 4.1
   - Test all type inferences, columns, constraints, edge cases

5. **Run Type Checks**
   - Run `pnpm typecheck` in monorepo root
   - Verify zero TypeScript errors
   - Fix any type issues

6. **Run Tests**
   - Run `pnpm --filter @raptscallions/db test`
   - Verify all tests pass
   - Check coverage meets 100% for tools schema

7. **Validate Migration** (Manual Verification)
   - Review generated SQL matches expected schema
   - Confirm enum creation, table structure, constraints, indexes
   - Verify foreign keys reference correct tables with CASCADE

---

## 6. Acceptance Criteria Mapping

| AC  | Description                                                      | Implementation Location                          |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ |
| AC1 | tools table with id, type, name, version, definition, etc.      | `packages/db/src/schema/tools.ts`                |
| AC2 | tool_type enum: 'chat', 'product'                                | `packages/db/src/schema/tools.ts` (toolTypeEnum) |
| AC3 | definition column stores YAML as text                            | `packages/db/src/schema/tools.ts` (text type)    |
| AC4 | group_id determines visibility scope (nullable for system-wide)  | `packages/db/src/schema/tools.ts` (nullable FK)  |
| AC5 | created_by FK to users for ownership                             | `packages/db/src/schema/tools.ts` (FK CASCADE)   |
| AC6 | Unique constraint on (name, version) for versioning              | `packages/db/src/schema/tools.ts` (unique)       |
| AC7 | Indexes on group_id and created_by                               | `packages/db/src/schema/tools.ts` (indexes)      |
| AC8 | Migration file 0006_create_tools.sql                             | `packages/db/src/migrations/0006_*.sql`          |
| AC9 | TypeScript types exported                                        | `packages/db/src/schema/tools.ts` (Tool, NewTool)|
| AC10| Tests verify schema and constraints                             | `packages/db/src/__tests__/schema/tools.test.ts` |

---

## 7. Dependencies & Blockers

### 7.1 Dependencies

- **E01-T004**: Users schema (completed) - `created_by` references `users.id`
- **E01-T005**: Groups schema (completed) - `group_id` references `groups.id`

### 7.2 Blocks

- **E03-T003**: Tool CRUD API - Cannot implement API routes without schema
- **E03-T006**: Tool YAML validation - Service layer needs schema for validation

### 7.3 External Dependencies

None. This task is purely database schema definition.

---

## 8. Open Questions & Decisions

### 8.1 Resolved Questions

**Q: Should we validate YAML at the database level?**
A: **No.** Database stores raw YAML text. Validation happens at service layer using Zod and YAML parsing. This keeps database simple and allows schema evolution without migrations.

**Q: Should tools have soft delete?**
A: **Yes.** Teachers may want to archive old tools without losing historical data. Soft delete via `deleted_at` matches pattern from users, groups, classes.

**Q: Should version field have constraints?**
A: **Partial.** Max length 20 chars is sufficient for semantic versioning (e.g., '1.2.3', '2.0.0-beta.1'). No regex validation at DB level—service layer enforces semver format.

**Q: Should group_id cascade delete?**
A: **Yes.** If a group is deleted, all its scoped tools should be deleted. System-wide tools (group_id = null) are unaffected.

**Q: Should created_by cascade delete?**
A: **Yes.** If a user is deleted, their tools are deleted. This is consistent with ownership model. In production, user deletion is rare (usually soft delete instead).

### 8.2 Open Questions

None. All design decisions finalized.

---

## 9. Security & Performance Considerations

### 9.1 Security

- **Access Control**: Group-scoped tools require permission checks at service layer (not enforced by DB)
- **SQL Injection**: Using Drizzle's query builder eliminates SQL injection risk
- **Cascading Deletes**: Foreign key CASCADE ensures no orphaned records, preventing data leaks

### 9.2 Performance

- **Indexes**: Indexes on `group_id` and `created_by` optimize common queries:
  - "Get all tools in group" → uses `group_id` index
  - "Get my tools" → uses `created_by` index
- **Unique Constraint**: Automatic index on `(name, version)` ensures fast duplicate detection
- **Text Field**: Storing YAML as `TEXT` (unlimited length) has no practical impact—most YAML definitions will be < 10KB

### 9.3 Scalability

- **Versioning**: Unique constraint on `(name, version)` allows unlimited versions without conflicts
- **Soft Delete**: `deleted_at` index may be needed in future if soft-deleted tools accumulate (monitor query performance)

---

## 10. Future Enhancements

These are **out of scope** for this task but documented for future reference:

1. **Full-text Search on Tool Names**
   - Add GIN index on `name` for fast prefix/substring search
   - Useful when tool catalog grows large

2. **Tool Popularity Tracking**
   - Add `usage_count` column to track how often tool is used
   - Enables "popular tools" feature

3. **Tool Categories/Tags**
   - Many-to-many `tool_tags` join table
   - Allows filtering tools by subject area (Math, Science, etc.)

4. **Version History Metadata**
   - `change_log` TEXT field to store version notes
   - Helps users understand what changed between versions

5. **Tool Permissions (Beyond Group Scoping)**
   - More granular permissions via CASL
   - E.g., "Only teachers can use this tool" vs "Students and teachers"

---

## 11. References

### 11.1 Architecture Documents

- `ARCHITECTURE.md` - Core entities, technology stack
- `CONVENTIONS.md` - Database naming, TypeScript style, testing patterns

### 11.2 Related Schema Files

- `packages/db/src/schema/users.ts` - User schema (FK target)
- `packages/db/src/schema/groups.ts` - Groups schema (FK target)
- `packages/db/src/schema/classes.ts` - Classes schema (similar pattern)

### 11.3 Related Test Files

- `packages/db/src/__tests__/schema/users.test.ts` - Test pattern reference
- `packages/db/src/__tests__/schema/classes.test.ts` - Test pattern reference

### 11.4 Migration Files

- `packages/db/src/migrations/0001_create_users.sql` - Migration pattern reference
- `packages/db/src/migrations/0005_create_classes.sql` - Recent migration example

---

## 12. Glossary

| Term       | Definition                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Tool       | YAML-defined AI interaction (Chat or Product type)                         |
| Chat Tool  | Multi-turn conversational AI interaction with session state                |
| Product Tool | Single input → output AI transformation                                  |
| YAML       | Human-readable data serialization format (YAML Ain't Markup Language)     |
| Soft Delete | Marking record as deleted via `deleted_at` timestamp instead of removing it |
| Semantic Versioning | Version numbering scheme (MAJOR.MINOR.PATCH, e.g., 1.2.3)        |
| Group Scoping | Limiting tool visibility to a specific group and its descendants         |
| System-wide Tool | Tool visible to all users (group_id = null)                          |
| CASCADE Delete | Automatically delete dependent records when parent is deleted           |
| ltree      | PostgreSQL data type for hierarchical tree structures                      |

---

## 13. UX Review

**Reviewer:** designer
**Date:** 2026-01-12
**Status:** APPROVED with RECOMMENDATIONS

### 13.1 Overall Assessment

This is a backend database schema task, so traditional end-user UX doesn't directly apply. However, the schema design has significant **Developer Experience (DX)** and **downstream UX implications**. The review focuses on:

1. **Developer Experience**: How easy is it for developers to work with this schema?
2. **Data Model Clarity**: Does the schema support intuitive user workflows?
3. **Future UX Enablement**: Does this foundation enable good user experiences later?

**Verdict:** ✅ **APPROVED** - The specification is well-designed with excellent DX considerations. Several recommendations below will improve future user-facing features.

---

### 13.2 Strengths

#### 13.2.1 Excellent Developer Experience

- **Type Safety**: Full TypeScript inference (`Tool`, `NewTool`) provides excellent autocomplete and compile-time validation
- **Clear Naming**: `createdBy`, `groupId`, `toolTypeEnum` are self-documenting
- **Comprehensive Comments**: Schema includes JSDoc explaining visibility rules, versioning, and soft delete
- **Test Coverage**: 100% coverage requirement ensures reliability

#### 13.2.2 Good Data Model Foundations

- **Versioning Support**: Unique constraint on `(name, version)` enables version history—critical for teacher workflows ("I want to improve my tool without breaking student assignments")
- **Group Scoping**: Nullable `group_id` elegantly handles system-wide vs group-scoped tools—supports future "template library" features
- **Soft Delete**: `deleted_at` allows archival without data loss—teachers can "undelete" tools if needed

#### 13.2.3 Performance Considerations

- **Smart Indexing**: `group_id` and `created_by` indexes optimize the most common user queries ("my tools", "tools in my school")
- **No Premature Optimization**: Stores YAML as text without parsing—correct trade-off for flexibility

---

### 13.3 UX Concerns & Recommendations

#### 13.3.1 Missing: Tool Description Field

**Severity:** 🟡 Medium
**Impact:** User Experience (Future)

**Issue:**
The schema has `name` (max 100 chars) but no `description` field. When teachers browse a tool library with 50+ tools, they need:
- **Short names**: "Essay Feedback" (good for lists)
- **Longer descriptions**: "Provides constructive feedback on student essays, focusing on thesis clarity, evidence quality, and writing mechanics." (good for detail views)

Without a description field, teachers must either:
- Put everything in the `name` (too long for UI lists)
- Read the YAML `definition` (bad UX—forces users to understand YAML)

**Recommendation:**
```typescript
// Add to schema
description: text("description"), // nullable, for human-readable explanation
```

**Workaround:**
If deferring this field, ensure YAML spec includes a top-level `description` field that can be parsed and displayed in future API/UI layers.

---

#### 13.3.2 Missing: Display-Friendly Metadata

**Severity:** 🟢 Low
**Impact:** Future Feature Enablement

**Issue:**
The schema stores raw YAML but no extracted metadata for common UI needs:
- **Icon/emoji**: "📝" for writing tools, "🔬" for science tools
- **Color**: For visual categorization in UI
- **Tags/categories**: "Math", "Writing", "Science" (different from group scoping)

**Recommendation:**
Consider adding optional metadata columns in a future migration:
```typescript
// Future enhancement (not blocking for this task)
icon: varchar("icon", { length: 10 }), // emoji or icon identifier
color: varchar("color", { length: 7 }),  // hex color, e.g., #3B82F6
tags: varchar("tags", { length: 500 }), // comma-separated for simple filtering
```

**Alternative:** Store this in YAML and extract at service layer. Trade-off:
- ✅ More flexible (schema doesn't change)
- ❌ Harder to query/filter by tags at DB level

**Decision for this task:** Defer to future. Document in Section 10 (Future Enhancements).

---

#### 13.3.3 Versioning: Potential UX Confusion

**Severity:** 🟡 Medium
**Impact:** User Understanding

**Issue:**
The spec says version field defaults to `'1.0.0'` and uses semantic versioning. However:
- **Teachers aren't developers**: Many won't understand semver (major.minor.patch)
- **No guidance on when to increment**: Should fixing a typo create version 1.0.1 or 2.0.0?

**Recommendation:**
1. **Service Layer Abstraction**: When teachers "Save New Version" in UI, auto-increment intelligently:
   - Minor changes → increment patch (1.0.0 → 1.0.1)
   - Major changes → prompt user or auto-increment minor (1.0.0 → 1.1.0)
   - Breaking changes → increment major (1.0.0 → 2.0.0)

2. **UI Labeling**: Display as "Version 1", "Version 2" in simple mode, with option to show full semver for power users

3. **Alternative Version Strategies** (for future consideration):
   - **Auto-incrementing integers**: Version 1, 2, 3 (simpler for non-technical users)
   - **Timestamps**: Version 2026-01-12-v1 (sortable, no confusion)

**Decision for this task:** Keep semver in schema (correct technical choice). Document need for service-layer abstraction in future API task (E03-T003).

---

#### 13.3.4 Soft Delete: No Visual Distinction

**Severity:** 🟢 Low
**Impact:** Developer Experience (Testing)

**Issue:**
The `deleted_at` field enables soft delete, but there's no index on it. Future queries will need:
```sql
WHERE deleted_at IS NULL  -- active tools
WHERE deleted_at IS NOT NULL  -- archived tools
```

Without an index, filtering out deleted tools in large datasets will be slow.

**Recommendation:**
```typescript
// Add to indexes
deletedAtIdx: index("tools_deleted_at_idx").on(table.deletedAt),
```

**Trade-off:**
- ✅ Faster queries for "active tools only"
- ❌ Additional index maintenance cost

**Decision for this task:** Monitor query performance. If soft deletes become common (>10% of tools), add index in follow-up migration. Document in Section 9.3 (Scalability).

---

#### 13.3.5 Group Hierarchy: Visibility Propagation

**Severity:** 🟡 Medium
**Impact:** User Expectations

**Issue:**
The spec says `group_id` scopes tools to "that group and its descendants" via ltree hierarchy. However, the schema itself doesn't enforce this—it's a **service layer responsibility**.

**UX Risk:**
If service layer doesn't implement hierarchy correctly:
- Teacher at District level creates tool with `group_id = district_uuid`
- Teacher at School level (child of district) expects to see it
- Bug in service layer → school teacher doesn't see it
- **User confusion**: "Where did my tool go?"

**Recommendation:**
1. **Spec Clarification**: Add explicit note that hierarchy queries must use ltree operators (implemented in future E03-T003 API)
2. **Test Coverage**: Ensure E03-T003 tests verify hierarchy propagation with realistic data
3. **UI Transparency**: When viewing tool, show "Visible to: [District Name] and all schools below"

**Decision for this task:** Add note to Section 8.1 (Resolved Questions) clarifying that hierarchy is service-layer responsibility.

---

### 13.4 Accessibility Considerations

#### 13.4.1 Semantic Versioning Accessibility

**Issue:**
Screen readers will read "1.0.0" as "one point zero point zero"—verbose and unclear.

**Recommendation (Future UI):**
Use ARIA labels:
```html
<span aria-label="Version 1">v1.0.0</span>
```

#### 13.4.2 Tool Type Enum Clarity

**Strength:**
Enum values `'chat'` and `'product'` are clear, but future UI should use human-friendly labels:
- `chat` → "Chat Tool (Multi-turn)"
- `product` → "Product Tool (Single-use)"

---

### 13.5 Consistency with Existing Patterns

✅ **Excellent consistency** with existing schemas (`users.ts`, `classes.ts`):
- Same timestamp pattern (`created_at`, `updated_at`, `deleted_at`)
- Same foreign key CASCADE pattern
- Same test structure
- Same TypeScript export pattern

This consistency reduces cognitive load for developers.

---

### 13.6 Security & Privacy UX Implications

#### 13.6.1 Creator Attribution

**Strength:**
`created_by` field enables proper attribution ("Created by Jane Doe"). Good for trust and accountability.

**Future Consideration:**
Allow teachers to mark tools as "anonymous" (don't show creator name in UI, but keep in DB for audit trail).

#### 13.6.2 Group Scoping

**Strength:**
Group scoping prevents accidental data leakage (teacher in School A can't see School B's tools).

**Risk:**
If permission checks are only at API level (not DB level), bugs could expose tools. Ensure CASL rules are thoroughly tested.

---

### 13.7 Required Changes Before Implementation

**None.** All recommendations are:
- Future enhancements (defer to follow-up tasks)
- Service layer concerns (addressed in E03-T003)
- Documentation clarifications (added inline below)

---

### 13.8 Recommended Documentation Updates

Add to **Section 8.1 (Resolved Questions)**:

> **Q: How is group hierarchy visibility enforced?**
> A: **Service layer responsibility.** The schema stores `group_id` as a flat UUID. The API layer (E03-T003) must use ltree queries on the `groups` table to determine which tools are visible to a user based on their group membership. For example:
> ```sql
> -- Get tools visible to user in group with path 'acme.high_school'
> SELECT t.* FROM tools t
> LEFT JOIN groups g ON t.group_id = g.id
> WHERE t.group_id IS NULL  -- system-wide tools
>    OR g.path <@ 'acme.high_school'  -- tools in this group or ancestors
>    OR g.path ~ 'acme.high_school.*'  -- tools in descendants
> ```

Add to **Section 10 (Future Enhancements)**:

> **6. Tool Description Field**
>    - Add nullable `description` TEXT column for human-readable explanations
>    - Avoids forcing teachers to read YAML to understand tool purpose
>    - Improves browsability in tool library UI
>
> **7. Display Metadata (Icons, Colors, Tags)**
>    - Optional `icon`, `color`, `tags` fields for visual categorization
>    - Enables richer UI without parsing YAML
>    - Trade-off: More rigid schema vs. easier querying

---

### 13.9 Final Verdict

✅ **APPROVED FOR IMPLEMENTATION**

**Summary:**
- Schema design is **technically sound** with excellent DX
- **No blocking UX issues**—all concerns are future enhancements or service-layer responsibilities
- **Strong foundation** for user-facing features in future tasks
- Recommended documentation updates are **minor clarifications**, not blockers

**Next Steps:**
1. Add documentation updates from Section 13.8
2. Proceed to architecture review (workflow state → PLAN_REVIEW)
3. Ensure E03-T003 (API layer) addresses hierarchy visibility and version UX abstraction

---

**End of UX Review**

---

## 14. Architecture Review

**Reviewer:** architect
**Date:** 2026-01-12
**Status:** APPROVED with RECOMMENDATIONS

### 14.1 Overall Assessment

This specification has been reviewed against `ARCHITECTURE.md` and `CONVENTIONS.md` for architectural fit, technology alignment, and system consistency.

**Verdict:** ✅ **APPROVED** - The specification is architecturally sound and ready for implementation. The schema design follows established patterns, uses the correct technology stack, and integrates properly with existing entities.

---

### 14.2 Architecture Compliance

#### 14.2.1 Technology Stack Alignment ✅

**Excellent** - All technology choices match the canonical architecture:

| Requirement | Specified | Canonical | Status |
| ----------- | --------- | --------- | ------ |
| ORM | Drizzle | Drizzle | ✅ |
| Database | PostgreSQL 16 | PostgreSQL 16 | ✅ |
| Validation | Zod (service layer) | Zod | ✅ |
| Testing | Vitest | Vitest | ✅ |
| TypeScript | Strict mode, types exported | Strict mode | ✅ |

**Note:** Correctly defers YAML parsing and validation to service layer using Zod, not database level.

#### 14.2.2 Entity Model Integration ✅

**Excellent** - Integrates seamlessly with existing entities:

- **Users** (E01-T004): Correct FK reference to `users.id` for `created_by`
- **Groups** (E01-T005): Correct FK reference to `groups.id` for `group_id` with ltree hierarchy support
- **Classes** (E03-T001): Future integration documented (tools → assignments → classes)

**Hierarchy Visibility Pattern:**
The spec correctly delegates ltree hierarchy queries to service layer (E03-T003). Database stores flat UUID, API layer resolves visibility via ltree path matching. This matches the pattern established in groups schema.

#### 14.2.3 Naming Conventions ✅

**Perfect compliance** with CONVENTIONS.md:

| Element | Convention | Spec | Status |
| ------- | ---------- | ---- | ------ |
| Table name | snake_case plural | `tools` | ✅ |
| Columns | snake_case | `created_by`, `group_id`, `deleted_at` | ✅ |
| Indexes | `{table}_{column}_idx` | `tools_group_id_idx` | ✅ |
| Enum | snake_case | `tool_type` | ✅ |
| TypeScript types | PascalCase | `Tool`, `NewTool` | ✅ |
| File naming | `*.ts`, `*.test.ts` | `tools.ts`, `tools.test.ts` | ✅ |

#### 14.2.4 Schema Pattern Consistency ✅

**Excellent** - Follows established patterns from `users.ts`, `groups.ts`, `classes.ts`:

- ✅ UUID primary key with `defaultRandom()`
- ✅ Foreign keys with CASCADE delete
- ✅ Soft delete via `deleted_at` timestamp
- ✅ Audit trail: `created_at`, `updated_at`, `deleted_at`
- ✅ Indexes on foreign keys for query performance
- ✅ Type exports: `typeof table.$inferSelect`, `typeof table.$inferInsert`
- ✅ Metadata accessor for test compatibility (line 256-267)

**Critical Detail:** The metadata accessor pattern (Section 3.3, lines 256-267) matches existing schemas exactly. This ensures test compatibility with Drizzle's internal structure.

---

### 14.3 Architectural Strengths

#### 14.3.1 Modularity & Extensibility

**Strength:** Storing raw YAML as text is the correct architectural choice:
- **Flexibility**: YAML schema can evolve without database migrations
- **Portability**: Tools are truly portable (copy YAML, paste elsewhere)
- **Separation of Concerns**: Database stores data, service layer validates structure
- **Future-Proof**: Supports gradual schema changes (v1 tools work alongside v2 tools)

**Comparison to Alternative:**
If we stored parsed JSONB instead:
- ❌ Requires database migration for schema changes
- ❌ Loses original formatting (comments, spacing)
- ❌ Harder to version control (YAML diffs are cleaner)
- ✅ Faster queries (but we don't query tool internals at DB level)

**Verdict:** TEXT storage is correct for this use case.

#### 14.3.2 Versioning Strategy

**Strength:** Unique constraint on `(name, version)` enables:
- Multiple versions of same tool coexisting
- Teachers can iterate without breaking existing assignments
- Clear upgrade paths (assign v1 or v2 to different classes)
- No data migration needed when tool logic changes

**Service Layer Responsibility (E03-T003):**
The spec correctly notes that service layer should:
1. Enforce semantic versioning format (e.g., `1.2.3`)
2. Prevent non-semver strings like `"latest"` or `"v1"`
3. Provide "Save New Version" UI that auto-increments intelligently

**Future Enhancement:** Consider `parent_version_id` FK to track version lineage (out of scope for this task, document for E03-T003 design).

#### 14.3.3 Group Scoping Architecture

**Strength:** Nullable `group_id` elegantly handles two visibility models:
- `group_id = null` → System-wide template library (e.g., "Essay Feedback Pro" by platform team)
- `group_id = <uuid>` → Group-scoped custom tools (e.g., "Mrs. Smith's Math Quiz")

**Hierarchy Propagation (Service Layer):**
The spec correctly identifies that visibility must be calculated at service layer using ltree queries:

```sql
-- Example from Section 13.8 (added by UX reviewer)
SELECT t.* FROM tools t
LEFT JOIN groups g ON t.group_id = g.id
WHERE t.group_id IS NULL  -- system-wide tools
   OR g.path <@ 'acme.high_school'  -- tools in this group or ancestors
   OR g.path ~ 'acme.high_school.*'  -- tools in descendants
```

**Architectural Risk (MEDIUM):**
If E03-T003 API doesn't implement this correctly:
- **Bug:** Teacher creates tool at district level, school teachers can't see it
- **Security:** Teacher in School A might see tools from School B (data leakage)

**Recommendation:** Add explicit test cases in E03-T003 spec:
1. "District admin creates tool, school teacher can see it"
2. "School teacher creates tool, sibling school teacher CANNOT see it"
3. "System-wide tool (group_id = null) visible to all groups"

#### 14.3.4 Cascade Delete Strategy

**Strength:** CASCADE delete on both FKs is correct:
- `created_by` → `users.id` CASCADE: If user deleted, their tools deleted
- `group_id` → `groups.id` CASCADE: If group deleted, scoped tools deleted

**Rationale:**
- Tools without creators are orphaned (no ownership trail)
- Tools scoped to deleted groups are invalid (can't determine visibility)
- System-wide tools (`group_id = null`) unaffected by group deletion

**Soft Delete Interaction:**
Users and groups both support soft delete (`deleted_at`). The CASCADE only triggers on **hard delete** (actual `DELETE` statement). This is correct:
- Soft-deleted user → tools remain (can be restored)
- Hard-deleted user → tools cascade (user purged from system)

---

### 14.4 Architectural Concerns & Recommendations

#### 14.4.1 Missing: updated_at Trigger

**Severity:** 🟡 Medium
**Impact:** Data Integrity

**Issue:**
The spec defines `updated_at` with `defaultNow()` but no trigger to auto-update on row modification. This means:
- `updated_at` set correctly on INSERT
- `updated_at` NOT updated on UPDATE (stale timestamps)

**Current Spec (Line 209):**
```typescript
updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
```

**This only sets the default on INSERT, not UPDATE.**

**Recommendation:**
Add PostgreSQL trigger in migration file:

```sql
-- In 0006_create_tools.sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON tools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Alternative (Service Layer):**
Explicitly set `updated_at` in service layer on every update:
```typescript
await db.update(tools)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(tools.id, id));
```

**Decision:** Add trigger to migration. Triggers are more reliable (can't forget) and match PostgreSQL best practices.

**Action Required:** Update Section 3.4 migration SQL to include trigger.

#### 14.4.2 Foreign Key Constraint Missing: ON DELETE Behavior

**Severity:** 🟢 Low (Already Correct)
**Status:** Verification Only

**Current Spec (Lines 201-205):**
```typescript
createdBy: uuid("created_by")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
groupId: uuid("group_id").references(() => groups.id, {
  onDelete: "cascade",
}),
```

**Verification:** ✅ Both FKs correctly specify `onDelete: "cascade"`. This will generate correct SQL:
```sql
CONSTRAINT "tools_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION
```

**No action required.**

#### 14.4.3 Index Strategy: Potential Missing Index

**Severity:** 🟢 Low
**Impact:** Future Query Performance

**Issue:**
The spec includes indexes on:
- `group_id` (for "tools in group" queries)
- `created_by` (for "my tools" queries)
- `(name, version)` unique constraint (automatic index)

**Potentially Missing: Soft Delete Index**
Common query pattern (service layer):
```typescript
// Get active tools only (exclude deleted)
const tools = await db.query.tools.findMany({
  where: isNull(tools.deletedAt),
});
```

Without index on `deleted_at`, this scans all rows. With index, fast filtering.

**Recommendation (Low Priority):**
Monitor query performance in E03-T003. If soft-deleted tools accumulate (>10% of table), add index:
```typescript
deletedAtIdx: index("tools_deleted_at_idx").on(table.deletedAt),
```

**Decision:** Defer to future optimization task (document in Section 10 "Future Enhancements" - already noted in UX review Section 13.3.4).

**No action required for this task.**

#### 14.4.4 Type Safety: Tool Type Enum

**Severity:** ✅ No Issue (Verification)
**Status:** Correct

**Verification:**
The spec defines enum correctly:
```typescript
export const toolTypeEnum = pgEnum("tool_type", ["chat", "product"]);
```

TypeScript will infer:
```typescript
type ToolType = "chat" | "product"; // Literal union, not string
```

**Benefit:** Prevents typos at compile time:
```typescript
const tool: NewTool = {
  type: "chatbot", // ❌ Type error: "chatbot" not assignable to "chat" | "product"
};
```

**No action required.**

---

### 14.5 Testing Strategy Alignment

#### 14.5.1 Test Structure ✅

**Excellent** - Follows CONVENTIONS.md Section "Testing":

- ✅ AAA pattern (Arrange/Act/Assert)
- ✅ Tests in `packages/db/src/__tests__/schema/tools.test.ts`
- ✅ Matches pattern from `users.test.ts`, `classes.test.ts`
- ✅ 100% coverage requirement for schema
- ✅ Comprehensive test plan (Section 4.1, 423 lines of test descriptions)

#### 14.5.2 Test Coverage Completeness ✅

**Excellent** - Test plan covers all critical areas:

| Test Category | Spec Section | Architecture Requirement | Status |
| ------------- | ------------ | ------------------------ | ------ |
| Type inference | 4.1 "Type Inference" | TypeScript strict mode | ✅ |
| Enum values | 4.1 "Tool Type Enum" | Drizzle enum pattern | ✅ |
| Foreign keys | 4.1 "Foreign Key Fields" | CASCADE behavior | ✅ |
| Unique constraints | 4.1 "Versioning" | (name, version) unique | ✅ |
| Soft delete | 4.1 "Soft Delete" | deletedAt pattern | ✅ |
| Edge cases | 4.1 "Edge Cases" | Max lengths, null handling | ✅ |

**No gaps identified.**

---

### 14.6 Integration with Existing System

#### 14.6.1 Core Package Types ✅

**Correct Integration:**
The spec exports types that will be re-exported from `@raptscallions/core`:

```typescript
// packages/db/src/schema/tools.ts
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;

// packages/core/src/types/tool.types.ts (future)
export type { Tool, NewTool } from "@raptscallions/db/schema";
```

**Matches Architecture Pattern:**
- `@raptscallions/db` owns schema definitions
- `@raptscallions/core` re-exports for consumer convenience
- Services import from `@raptscallions/core` (not directly from `db`)

#### 14.6.2 Migration Numbering ✅

**Correct:**
- Spec specifies migration file: `0006_create_tools.sql`
- Latest existing migration: `0005_create_classes.sql` (E03-T001)
- Sequential numbering is correct

**Drizzle Kit Generation:**
The spec correctly instructs to use `pnpm drizzle-kit generate` (Section 3.4, line 298). This auto-generates SQL from schema changes.

#### 14.6.3 Barrel Export Update ✅

**Correct:**
Section 3.5 specifies updating `packages/db/src/schema/index.ts`:
```typescript
export * from "./tools.js";
```

**Consistency Check:**
Matches existing pattern (verified in groups.ts, classes.ts). The `.js` extension is correct (TypeScript project with ESM output).

---

### 14.7 Security Architecture

#### 14.7.1 Access Control Model ✅

**Correct Separation:**
- **Database Layer**: Stores `group_id` for ownership, no enforcement
- **Service Layer**: Enforces visibility rules via ltree queries
- **Permission Layer**: CASL rules determine who can create/edit/delete tools

**Architecture:**
```
User Request → API Route → Auth Middleware → Permission Check (CASL) → Service Layer (ltree query) → Database
```

**This matches the canonical architecture (ARCHITECTURE.md Section "Authentication & Authorization").**

#### 14.7.2 SQL Injection Prevention ✅

**Safe:**
Using Drizzle ORM with parameterized queries (not raw SQL). CONVENTIONS.md mandates:
> "Use Drizzle query builder, avoid raw SQL"

**Verification:**
Spec shows query builder examples (Section 13.8, SQL example is for documentation, not actual implementation code).

**No SQL injection risk.**

#### 14.7.3 Data Leakage via Group Scoping

**Risk Level:** 🟡 Medium (Service Layer Responsibility)

**Threat Model:**
If service layer incorrectly implements hierarchy visibility:
1. **Horizontal Privilege Escalation**: Teacher in School A accesses tools from School B (sibling group)
2. **Vertical Privilege Escalation**: Student accesses teacher-only tools (if CASL rules incorrect)

**Mitigation (E03-T003 responsibility):**
1. Test case: "Teacher cannot see sibling group's tools"
2. Test case: "Student cannot create tools (CASL denies)"
3. Integration test: "Group deletion cascades to tools"

**Action Required:** Add note to Section 8.1 (Resolved Questions) clarifying that security tests are E03-T003 responsibility.

---

### 14.8 Performance Architecture

#### 14.8.1 Index Strategy ✅

**Correct:**
- `group_id` index: Optimizes "tools in group/descendants" queries
- `created_by` index: Optimizes "my tools" queries
- `(name, version)` unique: Auto-indexed, fast duplicate detection

**Query Pattern Analysis:**

| Query | Index Used | Performance |
| ----- | ---------- | ----------- |
| "Tools I created" | `created_by` | O(log n) |
| "Tools in my school" | `group_id` + ltree join | O(log n) on tools, O(n) on ltree match |
| "Get tool by name+version" | `(name, version)` unique | O(log n) |
| "All active tools" | `deleted_at` (if added) or table scan | O(n) without index |

**Scalability Consideration:**
The spec correctly notes (Section 9.2) that soft delete index may be needed if deleted tools accumulate. This is a good "defer and monitor" decision.

#### 14.8.2 YAML Storage Size

**Issue:** YAML stored as `TEXT` (unlimited length)
**Risk:** Very large YAML definitions (>1MB) could impact performance

**Analysis:**
- **Typical tool YAML**: 1-10 KB (system prompt + config)
- **Edge case**: 100 KB (very long prompt with examples)
- **Pathological case**: >1MB (shouldn't happen, but no DB constraint)

**Recommendation (Low Priority):**
Add service layer validation (E03-T003) to enforce reasonable size limit:
```typescript
const MAX_TOOL_YAML_SIZE = 500_000; // 500 KB

if (yamlString.length > MAX_TOOL_YAML_SIZE) {
  throw new ValidationError("Tool definition exceeds maximum size (500 KB)");
}
```

**Decision:** Defer to E03-T003. No database-level constraint needed (service layer validation is correct place).

---

### 14.9 Consistency with Documentation

#### 14.9.1 ARCHITECTURE.md Alignment ✅

**Verified:**
- ✅ Entity listed in Core Entities section (line 352-356, status "🚧 Planned")
- ✅ Two tool types (Chat, Product) match architecture description
- ✅ YAML storage matches "Portable and version-controlled" requirement
- ✅ Technology stack (Drizzle, PostgreSQL, Zod for validation) matches

**Action Required:** After implementation, update ARCHITECTURE.md status from "🚧 Planned" to "✅ Implemented (E03-T002)".

#### 14.9.2 CONVENTIONS.md Alignment ✅

**Verified:**
- ✅ File naming: `tools.ts`, `tools.test.ts` (Section "File Naming")
- ✅ Error handling: Typed errors pattern (Section "Error Handling")
- ✅ Database naming: snake_case (Section "Database")
- ✅ Test structure: AAA pattern (Section "Testing")
- ✅ TypeScript: Strict mode, no `any` (Section "TypeScript")

**No inconsistencies found.**

---

### 14.10 Required Changes Before Approval

**CRITICAL:**

1. **Add `updated_at` trigger to migration SQL** (Section 14.4.1)
   - Severity: 🟡 Medium
   - Impact: Data integrity (stale timestamps without trigger)
   - Location: Section 3.4, migration SQL

**RECOMMENDED:**

2. **Add security test note to Section 8.1**
   - Clarify that E03-T003 must test group hierarchy visibility
   - Add threat model for horizontal privilege escalation

3. **Update ARCHITECTURE.md after implementation**
   - Change Tools entity status from "🚧 Planned" to "✅ Implemented (E03-T002)"

---

### 14.11 Recommendations for Follow-up Tasks

These are **out of scope** for E03-T002 but should be considered in E03-T003 (API) and E03-T006 (Validation):

1. **Service Layer (E03-T003):**
   - Enforce semantic version format (regex: `/^\d+\.\d+\.\d+$/`)
   - Validate YAML size limit (recommend 500 KB max)
   - Implement ltree hierarchy visibility correctly (critical security requirement)
   - Add explicit tests for group visibility (district → school → department)

2. **Validation Layer (E03-T006):**
   - Parse YAML with error recovery
   - Validate YAML structure against tool type (chat vs product schemas)
   - Provide clear error messages for YAML syntax errors

3. **Future Enhancements (Post-E03):**
   - Tool categories/tags (many-to-many join table)
   - Tool usage analytics (track which tools are most used)
   - Tool sharing (export/import YAML between groups)
   - Version history UI (compare v1 vs v2 diffs)

---

### 14.12 Final Architectural Verdict

✅ **APPROVED FOR IMPLEMENTATION** with one critical change and two recommendations.

**Summary:**
- **Strengths**: Excellent consistency with existing patterns, correct technology choices, thoughtful versioning strategy, proper separation of concerns (DB stores, service validates)
- **Critical Change**: Add `updated_at` trigger to migration SQL (data integrity issue)
- **Recommendations**: Security test notes for E03-T003, ARCHITECTURE.md update post-implementation
- **Risk Level**: LOW - Schema design is sound, integration points are correct, test coverage is comprehensive

**Next Steps:**
1. ✏️ **Update Section 3.4** to add `updated_at` trigger SQL
2. ✏️ **Update Section 8.1** to add security test note for E03-T003
3. ✅ **Proceed to implementation** after changes
4. 📝 **Update ARCHITECTURE.md** after implementation complete

---

**End of Architecture Review**

---

**End of Specification**
