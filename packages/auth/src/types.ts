// packages/auth/src/types.ts

import type { MongoAbility } from "@casl/ability";
import type { GroupMember } from "@raptscallions/db/schema";
import type { User as LuciaUser, Session as LuciaSession } from "lucia";

/**
 * Authenticated user type with all user attributes from getUserAttributes.
 * This is what's available on request.user after authentication.
 */
export type SessionUser = LuciaUser;

/**
 * Active session with user relationship.
 * This is what's available on request.session after authentication.
 */
export type Session = LuciaSession;

/**
 * Result from session validation.
 * Either both session and user are present, or both are null (expired/invalid).
 */
export interface SessionValidationResult {
  session: Session | null;
  user: SessionUser | null;
}

/**
 * Session cookie attributes for setting/clearing cookies.
 */
export interface SessionCookieAttributes {
  name: string;
  value: string;
  attributes: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge?: number;
    expires?: Date;
  };
}

/**
 * Actions that can be performed on resources.
 * - create: Create new resource
 * - read: View resource
 * - update: Modify existing resource
 * - delete: Remove resource
 * - manage: All actions (wildcard)
 */
export type Actions = "create" | "read" | "update" | "delete" | "manage";

/**
 * Subjects (resource types) in the system.
 * - User: User accounts
 * - Group: Organizational units (districts, schools, departments)
 * - Class: Teaching classes within groups
 * - Tool: AI-powered tools (chat/product)
 * - Assignment: Assigned tools with due dates
 * - Session: Chat sessions
 * - Run: Product run executions
 * - all: Wildcard for all subjects
 */
export type Subjects =
  | "User"
  | "Group"
  | "Class"
  | "Tool"
  | "Assignment"
  | "Session"
  | "Run"
  | "all";

/**
 * Application ability type.
 * Represents what actions a user can perform on which subjects.
 * Uses MongoAbility to support MongoDB query operators like $in.
 */
export type AppAbility = MongoAbility<[Actions, Subjects]>;

/**
 * Context passed to buildAbility function.
 */
export interface BuildAbilityContext {
  user: SessionUser;
  memberships: GroupMember[];
}

/**
 * Group path information for hierarchy checks.
 */
export interface GroupPath {
  groupId: string;
  path: string;
}

// Augment Fastify types
declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
    session: Session | null;
    ability: AppAbility;
  }
}
