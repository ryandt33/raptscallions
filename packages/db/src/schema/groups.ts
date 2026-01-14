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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name: Symbol.for("drizzle:Name") in groups
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
        ? (groups as any)[Symbol.for("drizzle:Name")]
        : "groups",
    };
  },
  enumerable: false,
  configurable: true,
});
