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
import { classMembers } from "./class-members.js";
import { classes } from "./classes.js";

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

/**
 * Group members table - many-to-many relationship between users and groups with roles.
 *
 * This table enables role-based access control (RBAC) in the RaptScallions platform.
 * Each record represents a user's membership in a group with a specific role.
 *
 * Note: This table does NOT use soft deletes (no deleted_at field).
 * Memberships are hard-deleted when a user leaves a group.
 * Audit trail will be maintained in separate audit_log table (future).
 *
 * When users or groups are soft-deleted (deleted_at set), memberships remain.
 * When users or groups are hard-deleted, CASCADE removes memberships.
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

/**
 * Relations for group_members table.
 * Enables type-safe eager loading and joins.
 *
 * @example
 * ```typescript
 * // Eager load user and group data with membership
 * const membership = await db.query.groupMembers.findFirst({
 *   where: eq(groupMembers.id, membershipId),
 *   with: {
 *     user: true,
 *     group: true
 *   }
 * });
 * ```
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

/**
 * Relations for users table.
 * Enables querying a user's group memberships and class memberships.
 *
 * @example
 * ```typescript
 * // Get user with all their memberships
 * const user = await db.query.users.findFirst({
 *   where: eq(users.id, userId),
 *   with: {
 *     groupMembers: true,
 *     classMembers: true
 *   }
 * });
 * ```
 */
export const usersRelations = relations(users, ({ many }) => ({
  groupMembers: many(groupMembers),
  classMembers: many(classMembers),
}));

/**
 * Relations for groups table.
 * Enables querying a group's members and classes.
 *
 * @example
 * ```typescript
 * // Get group with all its members and classes
 * const group = await db.query.groups.findFirst({
 *   where: eq(groups.id, groupId),
 *   with: {
 *     members: true,
 *     classes: true
 *   }
 * });
 * ```
 */
export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  classes: many(classes),
}));
