// apps/api/src/middleware/session.middleware.ts

import {
  sessionService as defaultSessionService,
  type Session,
  type SessionUser,
} from "@raptscallions/auth";
import { type FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

/**
 * Session validation result interface for dependency injection.
 */
export interface SessionValidationResult {
  session: (Session & { fresh?: boolean }) | null;
  user: SessionUser | null;
}

/**
 * Session service interface for dependency injection in tests.
 */
export interface SessionServiceLike {
  sessionCookieName: string;
  sessionCookieAttributes: Record<string, unknown>;
  validate: (sessionId: string) => Promise<SessionValidationResult>;
  createBlankSessionCookie: () => { name: string; value: string; attributes: Record<string, unknown> };
}

/**
 * Options for session middleware (supports dependency injection for testing).
 */
export interface SessionMiddlewareOptions {
  sessionService?: SessionServiceLike;
}

/**
 * Session middleware for Fastify.
 *
 * Runs on every request (onRequest hook):
 * 1. Reads session cookie
 * 2. Validates session with Lucia
 * 3. Extends fresh sessions automatically
 * 4. Clears expired sessions
 * 5. Attaches user and session to request
 *
 * After this middleware runs:
 * - request.user will be SessionUser | null
 * - request.session will be Session | null
 *
 * Routes can check authentication with:
 * ```typescript
 * if (!request.user) {
 *   throw new UnauthorizedError("Not authenticated");
 * }
 * ```
 *
 * @param opts - Optional configuration including injected sessionService for testing
 */
const sessionMiddlewarePlugin: FastifyPluginAsync<SessionMiddlewareOptions> = async (app, opts = {}) => {
  // Use injected sessionService or default
  const sessionService = opts.sessionService ?? defaultSessionService;

  app.addHook("onRequest", async (request, reply) => {
    // Get session ID from cookie
    const sessionId = request.cookies[sessionService.sessionCookieName];

    // No cookie? Set null and continue
    if (!sessionId) {
      request.user = null;
      request.session = null;
      return;
    }

    // Validate session with Lucia
    const { session, user } = await sessionService.validate(sessionId);

    // Session is fresh (< 50% lifetime remaining)?
    // Lucia automatically extends it - set new cookie
    if (session?.fresh) {
      reply.setCookie(
        sessionService.sessionCookieName,
        session.id,
        sessionService.sessionCookieAttributes
      );
    }

    // Session expired/invalid? Clear cookie
    if (!session) {
      const blankCookie = sessionService.createBlankSessionCookie();
      reply.setCookie(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes
      );
    }

    // Attach to request for route handlers
    request.user = user;
    request.session = session;
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
// This makes the onRequest hook apply to ALL routes, not just routes in this plugin
export const sessionMiddleware = fp(sessionMiddlewarePlugin, {
  name: "sessionMiddleware",
});
