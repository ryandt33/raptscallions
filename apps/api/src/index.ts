import { getLogger } from "@raptscallions/telemetry";
import { queryClient } from "@raptscallions/db";
import { config } from "./config.js";
import { createServer } from "./server.js";

const logger = getLogger("api");

async function start(): Promise<void> {
  const app = await createServer();

  try {
    await app.listen({
      port: config.PORT,
      host: "0.0.0.0",
    });

    logger.info("Server listening", {
      port: config.PORT,
      env: config.NODE_ENV,
    });
  } catch (error) {
    logger.fatal("Failed to start server", { error });
    process.exit(1);
  }

  // Graceful shutdown handlers
  const signals = ["SIGINT", "SIGTERM"] as const;
  signals.forEach((signal) => {
    process.on(signal, () => {
      void (async () => {
        logger.info("Shutting down gracefully", { signal });

        try {
          await app.close();
          logger.info("Server closed");

          await queryClient.end();
          logger.info("Database connections closed");

          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown", { error });
          process.exit(1);
        }
      })();
    });
  });
}

// Handle startup errors
try {
  void start();
} catch (error) {
  logger.fatal("Startup failed", { error });
  process.exit(1);
}
