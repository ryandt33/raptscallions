import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { classes } from "./classes.js";
import { groups } from "./groups.js";
import { users } from "./users.js";

/**
 * Class role enum representing membership types within a class.
 * - teacher: Instructor with full permissions for the class
 * - student: Learner with limited permissions, can use assigned tools
 *
 * Unlike group roles (which include system_admin and group_admin),
 * class roles are simpler and focused on teaching/learning relationships.
 * Multiple teachers per class are supported for co-teaching scenarios.
 */
export const classRoleEnum = pgEnum("class_role", ["teacher", "student"]);

/**
 * Class members table - many-to-many relationship between users and classes with roles.
 *
 * This table tracks the roster of teachers and students in each class.
 * Each record represents a user's membership in a class with a specific role.
 *
 * Key features:
 * - One role per user per class (unique constraint on class_id, user_id)
 * - Supports co-teaching (multiple teachers in one class)
 * - Students can be in multiple classes
 * - Users can have different roles in different classes
 * - NO soft delete (hard delete only, audit trail separate)
 * - NO updated_at field (role changes are rare, tracked in audit log if needed)
 *
 * Cascade delete behavior:
 * - When a user is deleted → all their class memberships are deleted
 * - When a class is deleted → all its memberships are deleted
 * - When a group is deleted → classes cascade → memberships cascade
 *
 * Role change pattern:
 * To change a user's role in a class, UPDATE the existing record (don't create new):
 * ```typescript
 * // ✅ Correct: Update existing membership
 * await db.update(classMembers)
 *   .set({ role: 'teacher' })
 *   .where(and(
 *     eq(classMembers.classId, classId),
 *     eq(classMembers.userId, userId)
 *   ));
 *
 * // ❌ Incorrect: Creating new record will fail with unique constraint violation
 * await db.insert(classMembers).values({
 *   classId, userId, role: 'teacher'
 * });
 * ```
 *
 * Used by:
 * - Class roster management
 * - Permission checks (CASL authorization)
 * - Assignment distribution (who gets assigned what)
 * - Analytics (student progress tracking)
 *
 * @example
 * ```typescript
 * // Add student to class
 * await db.insert(classMembers).values({
 *   classId: "class-uuid",
 *   userId: "student-uuid",
 *   role: "student"
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Get all teachers for a class
 * const teachers = await db.query.classMembers.findMany({
 *   where: and(
 *     eq(classMembers.classId, classId),
 *     eq(classMembers.role, 'teacher')
 *   ),
 *   with: {
 *     user: true
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Get user's class schedule
 * const userSchedule = await db.query.classMembers.findMany({
 *   where: eq(classMembers.userId, userId),
 *   with: {
 *     class: {
 *       with: { group: true }
 *     }
 *   }
 * });
 * ```
 */
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

/**
 * ClassMember type for select operations (reading from database).
 * Includes all fields with auto-generated values.
 *
 * @example
 * ```typescript
 * const membership = await db.query.classMembers.findFirst({
 *   where: and(
 *     eq(classMembers.classId, classId),
 *     eq(classMembers.userId, userId)
 *   )
 * });
 * // membership.role is typed as "teacher" | "student"
 * ```
 */
export type ClassMember = typeof classMembers.$inferSelect;

/**
 * NewClassMember type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at.
 *
 * @example
 * ```typescript
 * const newMembership: NewClassMember = {
 *   classId: "class-uuid",
 *   userId: "user-uuid",
 *   role: "student"
 * };
 * await db.insert(classMembers).values(newMembership);
 * ```
 */
export type NewClassMember = typeof classMembers.$inferInsert;

// Add metadata accessor for test compatibility (matches users.ts and groups.ts pattern)
Object.defineProperty(classMembers, "_", {
  get() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name:
        Symbol.for("drizzle:Name") in classMembers
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
          ? (classMembers as any)[Symbol.for("drizzle:Name")]
          : "class_members",
    };
  },
  enumerable: false,
  configurable: true,
});

/**
 * Relations for class_members table.
 * Enables type-safe eager loading and joins.
 *
 * @example
 * ```typescript
 * // Eager load user and class data with membership
 * const membership = await db.query.classMembers.findFirst({
 *   where: eq(classMembers.id, membershipId),
 *   with: {
 *     user: true,
 *     class: true
 *   }
 * });
 * ```
 */
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

/**
 * Relations for classes table.
 * Enables type-safe eager loading and joins.
 *
 * @example
 * ```typescript
 * // Eager load group and all members with a class
 * const classData = await db.query.classes.findFirst({
 *   where: eq(classes.id, classId),
 *   with: {
 *     group: true,
 *     members: {
 *       with: {
 *         user: true
 *       }
 *     }
 *   }
 * });
 * ```
 */
export const classesRelations = relations(classes, ({ one, many }) => ({
  group: one(groups, {
    fields: [classes.groupId],
    references: [groups.id],
  }),
  members: many(classMembers),
}));
