import type { FastifyPluginAsync } from "fastify";
import { getLogger } from "@raptscallions/telemetry";
import { queryClient } from "@raptscallions/db";

const logger = getLogger("api:health");

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Basic health check
  app.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check (validates dependencies)
  app.get("/ready", async (_request, reply) => {
    const checks = {
      database: "error" as "ok" | "error",
    };

    try {
      await queryClient.unsafe("SELECT 1");
      checks.database = "ok";
    } catch (error) {
      logger.error("Database readiness check failed", { error });
    }

    const ready = checks.database === "ok";
    const statusCode = ready ? 200 : 503;

    return reply.status(statusCode).send({
      ready,
      checks,
    });
  });
};
