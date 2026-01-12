// apps/api/src/types/fastify.d.ts

import "@fastify/cookie";
import type { SessionUser, Session } from "@raptscallions/auth";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Authenticated user from session middleware.
     * Null if not authenticated or session expired.
     */
    user: SessionUser | null;

    /**
     * Active session from session middleware.
     * Null if no valid session.
     */
    session: Session | null;
  }
}
