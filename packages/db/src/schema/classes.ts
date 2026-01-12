import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { groups } from "./groups.js";

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
 * Settings can include:
 * - Grading configuration (scale, passing grade)
 * - Theme customization (color, icon)
 * - Feature flags (discussions, peer review)
 * - Accessibility preferences (contrast, text size)
 *
 * @example
 * ```typescript
 * const newClass: NewClass = {
 *   groupId: "school-uuid",
 *   name: "Period 3 Algebra I",
 *   settings: { grading: { passingGrade: 70 } }
 * };
 * await db.insert(classes).values(newClass);
 * ```
 *
 * @example
 * ```typescript
 * // Get all classes in a school (excluding archived)
 * const activeClasses = await db.query.classes.findMany({
 *   where: and(
 *     eq(classes.groupId, schoolId),
 *     isNull(classes.deletedAt)
 *   ),
 *   with: {
 *     members: {
 *       where: eq(classMembers.role, 'teacher'),
 *       with: { user: true }
 *     }
 *   }
 * });
 * ```
 */
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

/**
 * Class type for select operations (reading from database).
 * All fields are present including auto-generated values.
 *
 * @example
 * ```typescript
 * const classData = await db.query.classes.findFirst({
 *   where: eq(classes.id, classId)
 * });
 * // classData.settings is typed as unknown (parse with Zod)
 * // classData.deletedAt is Date | null
 * ```
 */
export type Class = typeof classes.$inferSelect;

/**
 * NewClass type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 *
 * @example
 * ```typescript
 * const newClass: NewClass = {
 *   groupId: "school-uuid",
 *   name: "Advanced Chemistry",
 *   settings: { grading: { passingGrade: 70 } }
 * };
 * await db.insert(classes).values(newClass);
 * ```
 */
export type NewClass = typeof classes.$inferInsert;

// Add metadata accessor for test compatibility (matches users.ts pattern)
Object.defineProperty(classes, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in classes
          ? (classes as any)[Symbol.for("drizzle:Name")]
          : "classes",
    };
  },
  enumerable: false,
  configurable: true,
});
