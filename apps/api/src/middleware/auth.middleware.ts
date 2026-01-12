// apps/api/src/middleware/auth.middleware.ts

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { UnauthorizedError } from "@raptscallions/core";

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
  app.decorate("requireAuth", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
  });

  app.decorate("requireActiveUser", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError("Authentication required");
    }
    if (request.user.status !== "active") {
      throw new UnauthorizedError("Account is not active");
    }
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
// This makes decorators available to all child plugins
export const authMiddleware = fp(authMiddlewarePlugin, {
  name: "authMiddleware",
});

// Augment Fastify instance with auth decorators
declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireActiveUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
