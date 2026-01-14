import { getLogger } from "@raptscallions/telemetry";

import type { FastifyPluginAsync } from "fastify";

const logger = getLogger("api:request");

export const requestLogger: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, _reply) => {
    logger.info("Request started", {
      requestId: request.id,
      method: request.method,
      url: request.url,
    });
  });

  app.addHook("onResponse", async (request, reply) => {
    const responseTime = reply.getResponseTime();

    logger.info("Request completed", {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: Math.round(responseTime),
      userAgent: request.headers["user-agent"],
    });
  });
};
