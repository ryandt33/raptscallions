// apps/api/src/types/fastify.d.ts

import type { SessionUser, Session } from "@raptscallions/auth";

/**
 * Augment Fastify request with session and user.
 * These properties are set by the session middleware.
 */
declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
    session: Session | null;
  }
}
