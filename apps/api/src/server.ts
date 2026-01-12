import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { sessionMiddleware } from "./middleware/session.middleware.js";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { permissionMiddleware } from "@raptscallions/auth";
import { healthRoutes } from "./routes/health.routes.js";
import { authRoutes } from "./routes/auth.routes.js";

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false, // Using custom logger
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
    // Trust proxy headers for X-Forwarded-For (needed for rate limiting by IP)
    trustProxy: true,
  });

  // Set up Zod type provider for schema validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register CORS
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });

  // Register cookie plugin (required for session handling)
  await app.register(cookie, {
    secret: config.SESSION_SECRET,
  });

  // Register request logger
  await app.register(requestLogger);

  // Register session middleware (validates and attaches session to request)
  await app.register(sessionMiddleware);

  // Register rate limiting (needs request.user for key generation)
  await app.register(rateLimitMiddleware);

  // Register auth middleware (provides requireAuth decorator)
  await app.register(authMiddleware);

  // Register permission middleware (builds abilities and provides permission checks)
  await app.register(permissionMiddleware);

  // Register routes
  await app.register(healthRoutes);

  // Auth routes use stricter rate limiting
  await app.register(
    async (authApp) => {
      // Apply auth-specific rate limiter
      await authApp.register(app.createAuthRateLimiter());
      // Register auth routes within this context
      await authApp.register(authRoutes);
    },
    { prefix: "/auth" }
  );

  // Register error handler (must be last)
  app.setErrorHandler(errorHandler);

  return app;
}

// Export typed app for routes that need Zod type provider
export type AppWithZod = FastifyInstance & { withTypeProvider<T>(): T };
