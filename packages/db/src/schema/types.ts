import { customType } from "drizzle-orm/pg-core";

/**
 * Custom PostgreSQL ltree type for hierarchical data.
 * Used for group hierarchies (district.school.department).
 *
 * Requires PostgreSQL ltree extension:
 * CREATE EXTENSION IF NOT EXISTS ltree;
 *
 * @example
 * import { ltree } from "@raptscallions/db/schema";
 * import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
 *
 * export const groups = pgTable("groups", {
 *   id: uuid("id").primaryKey().defaultRandom(),
 *   name: varchar("name", { length: 100 }).notNull(),
 *   path: ltree("path").notNull(),
 * });
 */
export const ltree = customType<{ data: string }>({
  dataType() {
    return "ltree";
  },
});
