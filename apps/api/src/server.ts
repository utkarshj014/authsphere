import http from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

// Create HTTP server instance early
const server = http.createServer(app);

let isShuttingDown = false;

const handleShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress!");
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal} signal, starting shutdown...`);

  const timer = setTimeout(() => {
    logger.error("Graceful shutdown timed out, exiting now");
    server.closeAllConnections();
    process.exit(1);
  }, 10000);

  timer.unref();

  try {
    // Use server.listening to check if port was bound
    if (server.listening) {
      logger.info("Closing HTTP server...");
      await new Promise<void>((resolve) => {
        server.close((err) => {
          if (err) logger.error({ err }, "Error closing server");
          resolve();
        });

        server.closeIdleConnections();
      });
    }

    logger.info("Disconnecting Prisma and Redis connections concurrently...");

    const results = await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);

    let resourceShutdownError = false;
    let errorMessage = "";

    results.forEach((res, index) => {
      if (res.status === "rejected") {
        resourceShutdownError = true;
        const resource = index === 0 ? "Prisma" : "Redis";
        const reasonStr =
          res.reason instanceof Error ? res.reason.message : String(res.reason);
        errorMessage += `Error disconnecting ${resource} cleanly: ${reasonStr}\n`;
      }
    });

    if (resourceShutdownError) {
      throw new Error(errorMessage);
    }

    logger.info("Graceful shutdown completed...");
    logger.flush?.();
    return 0;
  } catch (fatalError) {
    logger.error({ err: fatalError }, "Fatal error during shutdown");
    logger.flush?.();
    return 1;
  }
};

const handleShutdownWrapper = async (signal: string) => {
  const exitCode = await handleShutdown(signal);
  if (exitCode !== undefined) process.exit(exitCode);
};

// Signal listeners
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, () => handleShutdownWrapper(signal));
});

// Intercept Uncaught Runtime Errors to Trigger Graceful Shutdown
process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught Exception detected!");
  handleShutdownWrapper("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled Rejection detected!");
  handleShutdownWrapper("unhandledRejection");
});

// Application Startup Sequence
try {
  await Promise.all([prisma.$connect(), redis.connect()]);
  logger.info(
    { database: "connected", redis: "connected" },
    "Infrastructure initialized...",
  );

  // Start listening on the port after DB and Redis connections are ready
  server.listen(env.PORT, () => {
    logger.info(`Server is up and running on http://localhost:${env.PORT}`);
  });
} catch (startupError) {
  logger.error({ err: startupError }, "Failed to start application");
  process.exit(1);
}
