import { AppError } from "@raptscallions/core";
import { getLogger } from "@raptscallions/telemetry";

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger("api:error-handler");

// Type guard to check if an error is an AppError (duck typing for test compatibility)
function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "statusCode" in error &&
      typeof (error as Record<string, unknown>).code === "string" &&
      typeof (error as Record<string, unknown>).statusCode === "number")
  );
}

export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (isAppError(error)) {
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  logger.error("Unhandled error", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    requestId: request.id,
    method: request.method,
    url: request.url,
  });

  void reply.status(500).send({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}
