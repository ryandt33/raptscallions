// apps/api/src/middleware/auth.middleware.ts

import { UnauthorizedError, ForbiddenError } from "@raptscallions/core";
import { db } from "@raptscallions/db";
import { groupMembers } from "@raptscallions/db/schema";
import { getLogger } from "@raptscallions/telemetry";
import { eq, and } from "drizzle-orm";
import { type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from "fastify";
import fp from "fastify-plugin";

import type { GroupMember } from "@raptscallions/db/schema";

const logger = getLogger("auth-middleware");

// Infer MemberRole type from GroupMember
type MemberRole = GroupMember["role"];

/**
 * Require authentication preHandler.
 * Throws UnauthorizedError if no user is attached to request.
 *
 * Usage:
 * ```typescript
 * app.get("/protected", {
 *   preHandler: [app.requireAuth]
 * }, handler);
 * ```
 */
const authMiddlewarePlugin: FastifyPluginAsync = async (app) => {
  app.decorate("requireAuth", async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
  });

  app.decorate("requireActiveUser", async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (request.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }
  });

  /**
   * Require specific role(s) preHandler factory.
   *
   * Checks if user has ANY of the specified roles in ANY group.
   * For more fine-grained permission checks, use CASL's requirePermission instead.
   *
   * @param roles - One or more roles to check (system_admin, group_admin, teacher, student)
   * @returns PreHandler that throws ForbiddenError if user lacks all roles
   *
   * @example
   * ```typescript
   * // Only system admins and group admins can access
   * app.post("/admin/users", {
   *   preHandler: [app.requireAuth, app.requireRole("system_admin", "group_admin")]
   * }, handler);
   *
   * // Only teachers can access
   * app.get("/teacher/dashboard", {
   *   preHandler: [app.requireAuth, app.requireRole("teacher")]
   * }, handler);
   * ```
   */
  app.decorate("requireRole", (...roles: MemberRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      // Validate at least one role is specified
      if (roles.length === 0) {
        throw new Error(
          "requireRole must be called with at least one role. " +
          "To block all access, use a non-existent role or custom guard."
        );
      }

      // First check auth (redundant if requireAuth is used, but safe)
      if (!request.user) {
        logger.debug(
          { requiredRoles: roles, event: "guard_failed_no_auth" },
          "requireRole failed: user not authenticated"
        );
        throw new UnauthorizedError("Authentication required");
      }

      // Query user's roles across all groups
      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, request.user.id),
      });

      // Check if user has any of the required roles
      const userRoles = memberships.map((m) => m.role);
      const hasRole = roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
        logger.debug(
          {
            userId: request.user.id,
            requiredRoles: roles,
            userRoles,
            event: "guard_failed_insufficient_role",
          },
          "requireRole failed: user lacks required role"
        );
        throw new ForbiddenError(
          `This action requires one of the following roles: ${roleList}`
        );
      }
    };
  });

  /**
   * Require group membership preHandler factory.
   *
   * Checks if user is a member of the specified group (with any role).
   * Optionally attaches the membership object to request.groupMembership for downstream use.
   *
   * For dynamic group IDs (from route params), use requireGroupFromParams instead.
   *
   * @param groupId - UUID of group to check membership for
   * @returns PreHandler that throws ForbiddenError if user is not a member
   *
   * @example
   * ```typescript
   * // Static group ID (in preHandler array)
   * app.get("/groups/abc-123/members", {
   *   preHandler: [app.requireAuth, app.requireGroupMembership("abc-123")]
   * }, handler);
   * ```
   */
  app.decorate("requireGroupMembership", (groupId: string) => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      // First check auth
      if (!request.user) {
        logger.debug(
          { groupId, event: "guard_failed_no_auth" },
          "requireGroupMembership failed: user not authenticated"
        );
        throw new UnauthorizedError("Authentication required");
      }

      // Query for membership in specific group
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.userId, request.user.id),
          eq(groupMembers.groupId, groupId)
        ),
      });

      if (!membership) {
        logger.debug(
          {
            userId: request.user.id,
            groupId,
            event: "guard_failed_not_member",
          },
          "requireGroupMembership failed: user not in group"
        );
        throw new ForbiddenError("You are not a member of this group");
      }

      // Optionally attach membership to request for downstream use
      // This allows route handlers to know the user's role in this group
      request.groupMembership = membership;
    };
  });

  /**
   * Require group membership using route parameter.
   *
   * @param paramName - Name of route parameter containing group ID (default: "groupId")
   * @returns PreHandler that validates membership of parameterized group
   *
   * @example
   * ```typescript
   * app.get("/groups/:groupId/members", {
   *   preHandler: [app.requireAuth, app.requireGroupFromParams()]
   * }, handler);
   *
   * app.get("/teams/:teamId/roster", {
   *   preHandler: [app.requireAuth, app.requireGroupFromParams("teamId")]
   * }, handler);
   * ```
   */
  app.decorate("requireGroupFromParams", (paramName: string = "groupId") => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const groupId = (request.params as Record<string, unknown>)[paramName];

      if (!groupId || typeof groupId !== "string") {
        // Use ForbiddenError (403) instead of ValidationError to avoid leaking
        // route structure to unauthenticated users. If param is invalid, it's
        // either a routing config error or malicious request - treating both
        // as authorization failures provides consistent security posture.
        logger.debug(
          {
            paramName,
            paramValue: groupId,
            event: "guard_failed_invalid_param",
          },
          "requireGroupFromParams failed: invalid or missing parameter"
        );
        throw new ForbiddenError(
          `Missing or invalid route parameter: ${paramName}`
        );
      }

      // Reuse existing requireGroupMembership logic
      await app.requireGroupMembership(groupId)(request, reply);
    };
  });

  /**
   * Require specific role(s) within the current group context.
   *
   * MUST be used after `requireGroupMembership` or `requireGroupFromParams`.
   * Checks if user has ANY of the specified roles in the group set by previous guard.
   *
   * @param roles - One or more roles to check within current group
   * @returns PreHandler that throws ForbiddenError if user lacks all roles in this group
   *
   * @example
   * ```typescript
   * // Only teachers in THIS group can access
   * app.get("/groups/:groupId/assignments", {
   *   preHandler: [
   *     app.requireAuth,
   *     app.requireGroupFromParams(),
   *     app.requireGroupRole("teacher", "group_admin")
   *   ]
   * }, handler);
   * ```
   */
  app.decorate("requireGroupRole", (...roles: MemberRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      // Validate at least one role is specified
      if (roles.length === 0) {
        throw new Error(
          "requireGroupRole must be called with at least one role. " +
          "To block all access, use a non-existent role or custom guard."
        );
      }

      if (!request.groupMembership) {
        throw new Error(
          "requireGroupRole must be used after requireGroupMembership or requireGroupFromParams"
        );
      }

      if (!roles.includes(request.groupMembership.role)) {
        const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
        logger.debug(
          {
            userId: request.groupMembership.userId,
            groupId: request.groupMembership.groupId,
            userRole: request.groupMembership.role,
            requiredRoles: roles,
            event: "guard_failed_insufficient_group_role",
          },
          "requireGroupRole failed: user lacks required role in group"
        );
        throw new ForbiddenError(
          `This action requires one of the following roles in this group: ${roleList}`
        );
      }
    };
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
// This makes decorators available to all child plugins
export const authMiddleware = fp(authMiddlewarePlugin, {
  name: "authMiddleware",
});

// Augment Fastify instance with auth decorators
declare module "fastify" {
  interface FastifyRequest {
    groupMembership?: GroupMember; // Optional - only populated after requireGroupMembership
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: MemberRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupMembership: (
      groupId: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupFromParams: (
      paramName?: string
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGroupRole: (
      ...roles: MemberRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
