// apps/api/src/middleware/session.middleware.ts

import { FastifyPluginAsync } from "fastify";
import { sessionService } from "@raptscallions/auth";

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
 */
export const sessionMiddleware: FastifyPluginAsync = async (app) => {
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
