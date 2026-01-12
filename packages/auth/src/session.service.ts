// packages/auth/src/session.service.ts

import { lucia } from "./lucia.js";
import type { Session, SessionUser, SessionValidationResult } from "./types.js";
import { UnauthorizedError } from "@raptscallions/core";

/**
 * Session management service.
 * Wraps Lucia methods with application-specific logic and error handling.
 */
export class SessionService {
  /**
   * Validates a session ID and returns the session and user.
   *
   * If the session is "fresh" (< 50% of lifetime remaining), Lucia will
   * automatically extend it by updating the expires_at timestamp.
   *
   * @param sessionId - Session ID from cookie
   * @returns Session and user if valid, or both null if expired/invalid
   *
   * @example
   * const { session, user } = await sessionService.validate(sessionId);
   * if (!session) {
   *   throw new UnauthorizedError("Session expired");
   * }
   */
  async validate(sessionId: string): Promise<SessionValidationResult> {
    try {
      const result = await lucia.validateSession(sessionId);
      return result;
    } catch (error) {
      // Lucia throws if session ID is malformed or database error occurs
      throw new UnauthorizedError("Invalid session");
    }
  }

  /**
   * Creates a new session for a user.
   *
   * @param userId - User ID to create session for
   * @returns Created session object
   *
   * @example
   * const session = await sessionService.create(user.id);
   * reply.setCookie("rapt_session", session.id, lucia.sessionCookieAttributes);
   */
  async create(userId: string, context: string = "unknown"): Promise<Session> {
    try {
      // Lucia generates a cryptographically random session ID
      // and calculates expires_at based on sessionExpiresIn config
      const session = await lucia.createSession(userId, {
        context,
        last_activity_at: new Date(),
      });
      return session;
    } catch (error) {
      throw new Error("Failed to create session");
    }
  }

  /**
   * Invalidates a single session (logout).
   *
   * @param sessionId - Session ID to invalidate
   *
   * @example
   * await sessionService.invalidate(request.session.id);
   * reply.setCookie("rapt_session", "", { maxAge: 0 });
   */
  async invalidate(sessionId: string): Promise<void> {
    try {
      await lucia.invalidateSession(sessionId);
    } catch (error) {
      // Ignore errors if session doesn't exist (already logged out)
      // This is safe because the end result is the same
    }
  }

  /**
   * Invalidates all sessions for a user (logout from all devices).
   *
   * @param userId - User ID whose sessions to invalidate
   *
   * @example
   * await sessionService.invalidateUserSessions(user.id);
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    try {
      await lucia.invalidateUserSessions(userId);
    } catch (error) {
      throw new Error("Failed to invalidate user sessions");
    }
  }

  /**
   * Creates a blank session cookie for clearing the session.
   * Use this after logout to remove the cookie from the client.
   *
   * @returns Cookie attributes for clearing the session cookie
   *
   * @example
   * const cookie = sessionService.createBlankSessionCookie();
   * reply.setCookie(cookie.name, cookie.value, cookie.attributes);
   */
  createBlankSessionCookie() {
    return lucia.createBlankSessionCookie();
  }

  /**
   * Gets the session cookie name.
   *
   * @returns Cookie name (default: "rapt_session")
   */
  get sessionCookieName(): string {
    return lucia.sessionCookieName;
  }

  /**
   * Gets the session cookie attributes for setting cookies.
   *
   * @returns Cookie attributes (secure, sameSite)
   */
  get sessionCookieAttributes() {
    // Lucia v3 only exposes name and attributes (secure, sameSite)
    // httpOnly and path are hardcoded by Lucia
    return {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    };
  }
}

/**
 * Singleton session service instance.
 * Export this for use across the application.
 */
export const sessionService = new SessionService();
