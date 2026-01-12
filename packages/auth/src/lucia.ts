// packages/auth/src/lucia.ts

import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@raptscallions/db";
import { sessions, users } from "@raptscallions/db/schema";

/**
 * Database user attributes returned by Lucia.
 * Maps to columns in the users table that should be included in session user object.
 */
interface DatabaseUserAttributes {
  email: string;
  name: string;
  status: "active" | "suspended" | "pending_verification";
}

/**
 * Database session attributes returned by Lucia.
 * Maps to additional columns in the sessions table beyond id, userId, expiresAt.
 */
interface DatabaseSessionAttributes {
  context: string;
  last_activity_at: Date;
}

/**
 * Lucia adapter connecting to PostgreSQL via Drizzle.
 * This adapter handles all session CRUD operations against the database.
 */
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

/**
 * Lucia authentication instance.
 *
 * Configuration:
 * - 30-day session expiration (can be adjusted)
 * - Secure cookies in production (https only)
 * - httpOnly cookies (not accessible via JavaScript)
 * - sameSite: lax (CSRF protection)
 * - path: "/" (available to entire app)
 *
 * Session lifecycle:
 * - Fresh sessions (< 50% lifetime remaining) are automatically extended
 * - Expired sessions return null from validateSession()
 * - Lucia handles all session ID generation and expiration logic
 *
 * @example
 * // Validate session
 * const { session, user } = await lucia.validateSession(sessionId);
 *
 * // Create session
 * const session = await lucia.createSession(userId, {});
 *
 * // Invalidate session
 * await lucia.invalidateSession(sessionId);
 */
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "rapt_session", // Cookie name
    expires: false, // Session cookies (cleared when browser closes)
    attributes: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
    },
  },

  /**
   * Map database session attributes to session object.
   * This determines what session fields are available on request.session
   */
  getSessionAttributes: (attributes: DatabaseSessionAttributes) => {
    return {
      context: attributes.context,
      lastActivityAt: attributes.last_activity_at,
    };
  },

  /**
   * Map database user attributes to session user object.
   * This determines what user fields are available on request.user
   */
  getUserAttributes: (attributes: DatabaseUserAttributes) => {
    return {
      email: attributes.email,
      name: attributes.name,
      status: attributes.status,
    };
  },
});

/**
 * Type augmentation for Lucia.
 * This makes TypeScript aware of our custom user and session attributes.
 */
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}
