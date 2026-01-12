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
