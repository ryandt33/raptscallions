import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createMongoAbility, subject } from "@casl/ability";
import { db } from "@raptscallions/db";
import { groupMembers, groups } from "@raptscallions/db/schema";
import { eq, inArray } from "drizzle-orm";
import { buildAbility } from "./abilities.js";
import { ForbiddenError } from "@raptscallions/core";
import type { Actions, Subjects, AppAbility, GroupPath } from "./types.js";

/**
 * Permission middleware plugin for Fastify.
 *
 * Adds:
 * 1. request.ability - Populated for all requests (even unauthenticated)
 * 2. app.requirePermission() - PreHandler factory for route-level checks
 * 3. app.checkResourcePermission() - Helper for resource-level checks
 * 4. app.getGroupPaths() - Helper for fetching group paths for hierarchy checks
 */
const permissionMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  // Decorate request with ability (initialized to null)
  app.decorateRequest("ability", null);

  /**
   * onRequest hook to build ability from user's group memberships.
   * Runs after session middleware (which populates request.user).
   */
  app.addHook("onRequest", async (request) => {
    // No user? Create empty ability
    if (!request.user) {
      request.ability = createMongoAbility([]);
      return;
    }

    // Fetch user's group memberships
    const memberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    });

    // Build and attach ability
    request.ability = buildAbility({
      user: request.user,
      memberships,
    });
  });

  /**
   * Factory function to create permission check preHandler.
   *
   * @param action - Action to check (create, read, update, delete, manage)
   * @param subject - Subject to check (User, Group, Tool, etc.)
   * @returns Fastify preHandler that throws ForbiddenError if permission denied
   *
   * @example
   * ```typescript
   * app.post('/groups', {
   *   preHandler: [app.requireAuth, app.requirePermission('create', 'Group')]
   * }, async (request, reply) => {
   *   // Only users with create Group permission reach here
   * });
   * ```
   */
  app.decorate("requirePermission", (action: Actions, subjectType: Subjects) => {
    return async (request: FastifyRequest) => {
      if (!request.ability.can(action, subjectType)) {
        throw new ForbiddenError(`You cannot ${action} ${subjectType}`);
      }
    };
  });

  /**
   * Helper to check permission on a specific resource instance.
   *
   * @param ability - User's ability instance
   * @param action - Action to check
   * @param subjectType - Subject name
   * @param resource - Actual resource object with fields
   * @returns true if user can perform action on resource
   *
   * @example
   * ```typescript
   * const tool = await db.query.tools.findFirst({ where: eq(tools.id, toolId) });
   *
   * if (!app.checkResourcePermission(request.ability, 'delete', 'Tool', tool)) {
   *   throw new ForbiddenError('You cannot delete this tool');
   * }
   * ```
   */
  app.decorate(
    "checkResourcePermission",
    (
      ability: AppAbility,
      action: Actions,
      subjectType: Subjects,
      resource: Record<string, unknown>
    ): boolean => {
      return ability.can(action, subject(subjectType, resource) as any);
    }
  );

  /**
   * Helper to fetch group paths for hierarchy permission checks.
   *
   * @param groupIds - Array of group IDs to fetch paths for
   * @returns Array of { groupId, path } objects
   *
   * @example
   * ```typescript
   * const paths = await app.getGroupPaths(['g1', 'g2']);
   * const canManage = canManageGroupHierarchy(ability, targetId, paths, targetPath);
   * ```
   */
  app.decorate("getGroupPaths", async (groupIds: string[]): Promise<GroupPath[]> => {
    if (groupIds.length === 0) {
      return [];
    }

    const groupsData = await db.query.groups.findMany({
      where: inArray(groups.id, groupIds),
      columns: {
        id: true,
        path: true,
      },
    });

    return groupsData.map((g) => ({
      groupId: g.id,
      path: g.path,
    }));
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
// This makes decorators available to all routes, not just child plugins
export const permissionMiddleware = fp(permissionMiddlewarePlugin, {
  name: "permissionMiddleware",
});

/**
 * Augment Fastify instance with permission decorators.
 */
declare module "fastify" {
  interface FastifyInstance {
    requirePermission: (
      action: Actions,
      subject: Subjects
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

    checkResourcePermission: (
      ability: AppAbility,
      action: Actions,
      subject: Subjects,
      resource: Record<string, unknown>
    ) => boolean;

    getGroupPaths: (groupIds: string[]) => Promise<GroupPath[]>;
  }
}
