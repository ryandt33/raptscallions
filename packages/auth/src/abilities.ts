import { AbilityBuilder, createMongoAbility, subject } from "@casl/ability";

import type {
  AppAbility,
  BuildAbilityContext,
  GroupPath,
} from "./types.js";

/**
 * Build CASL ability instance for a user based on their group memberships.
 *
 * @param context - User and their group memberships
 * @returns AppAbility instance with user's permissions
 *
 * @example
 * ```typescript
 * const memberships = await db.query.groupMembers.findMany({
 *   where: eq(groupMembers.userId, user.id)
 * });
 *
 * const ability = buildAbility({ user, memberships });
 *
 * if (ability.can('create', 'Tool')) {
 *   // User can create tools
 * }
 * ```
 */
// CASL's MongoDB query operators ($in, etc.) require complex typing that doesn't directly match TypeScript's Record types
// Using 'any' here is safe because CASL validates these internally and the query structure is correct
/* eslint-disable @typescript-eslint/no-explicit-any */
export function buildAbility({
  user,
  memberships,
}: BuildAbilityContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // System admin bypass - can do everything
  const isSystemAdmin = memberships.some((m) => m.role === "system_admin");
  if (isSystemAdmin) {
    can("manage", "all");
    return build();
  }

  // Group admin permissions
  const groupAdminGroups = memberships
    .filter((m) => m.role === "group_admin")
    .map((m) => m.groupId);

  if (groupAdminGroups.length > 0) {
    // Can manage groups they administer (hierarchy handled in helper)
    can("manage", "Group", { id: { $in: groupAdminGroups } } as any);

    // Can manage users in their groups
    can("manage", "User", { groupId: { $in: groupAdminGroups } } as any);

    // Can manage classes in their groups
    can("manage", "Class", { groupId: { $in: groupAdminGroups } } as any);

    // Can read all tools in their groups
    can("read", "Tool", { groupId: { $in: groupAdminGroups } } as any);

    // Can manage assignments in their groups
    can("manage", "Assignment", { groupId: { $in: groupAdminGroups } } as any);
  }

  // Teacher permissions
  const teacherGroups = memberships
    .filter((m) => m.role === "teacher")
    .map((m) => m.groupId);

  if (teacherGroups.length > 0) {
    // Can create tools in their groups
    can("create", "Tool", { groupId: { $in: teacherGroups } } as any);

    // Can manage their own tools
    can(["read", "update", "delete"], "Tool", { createdBy: user.id } as any);

    // Can create assignments in their groups
    can("create", "Assignment", { groupId: { $in: teacherGroups } } as any);

    // Can manage their own assignments
    can(["read", "update", "delete"], "Assignment", { createdBy: user.id } as any);

    // Can read classes in their groups
    can("read", "Class", { groupId: { $in: teacherGroups } } as any);

    // Can read users in their groups
    can("read", "User", { groupId: { $in: teacherGroups } } as any);

    // Can read sessions for their tools
    can("read", "Session", { toolCreatedBy: user.id } as any);
  }

  // Student permissions (everyone gets these)
  // Students can read tools assigned to them
  can("read", "Tool", { assignedTo: user.id } as any);

  // Students can read assignments assigned to them
  can("read", "Assignment", { assignedTo: user.id } as any);

  // Students can manage their own sessions
  can("create", "Session", { userId: user.id } as any);
  can(["read", "update", "delete"], "Session", { userId: user.id } as any);

  // Students can manage their own product runs
  can("create", "Run", { userId: user.id } as any);
  can("read", "Run", { userId: user.id } as any);

  // All users can read their own profile
  can("read", "User", { id: user.id } as any);
  can("update", "User", { id: user.id } as any);

  return build();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Check if user can manage a group based on ltree hierarchy.
 *
 * Group admins can manage their assigned groups AND all descendant groups.
 * This uses PostgreSQL ltree path matching.
 *
 * @param ability - User's ability instance
 * @param targetGroupId - Group to check permissions for
 * @param userGroupPaths - Paths of groups the user administers
 * @param targetGroupPath - Path of the target group
 * @returns true if user can manage the group
 *
 * @example
 * ```typescript
 * const userPaths = [{ groupId: 'g1', path: 'district.school1' }];
 * const targetPath = 'district.school1.dept_math';
 *
 * const canManage = canManageGroupHierarchy(
 *   ability,
 *   'g2',
 *   userPaths,
 *   targetPath
 * );
 * // Returns true (dept_math is descendant of school1)
 * ```
 */
// CASL's subject() returns a complex type that requires type assertion
/* eslint-disable @typescript-eslint/no-explicit-any */
export function canManageGroupHierarchy(
  ability: AppAbility,
  targetGroupId: string,
  userGroupPaths: GroupPath[],
  targetGroupPath: string
): boolean {
  // First check if user can manage the exact group
  if (ability.can("manage", subject("Group", { id: targetGroupId }) as any)) {
    return true;
  }

  // Check if target group is descendant of any managed group
  // ltree path matching: 'district.school1.dept' starts with 'district.school1'
  return userGroupPaths.some(
    ({ path }) => targetGroupPath.startsWith(path + ".") || targetGroupPath === path
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
