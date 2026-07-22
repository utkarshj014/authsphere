import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";

await Promise.all([
  prisma.$connect().catch((error) => {
    logger.error("Failed to connect to database", error);
    process.exit(1);
  }),
  redis.connect().catch((error) => {
    logger.error("Failed to connect to redis", error);
    process.exit(1);
  }),
]);

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

const handleShutdown = async (signal: NodeJS.Signals) => {
  logger.info(`Received ${signal} signal, starting shutdown...`);

  const timer = setTimeout(() => {
    logger.error("Graceful shutdown timed out, exiting now");
    process.exit(1);
  }, 10000);

  timer.unref();

  try {
    logger.info("Closing HTTP server...");
    await new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) logger.error(err, "Error closing server");
        resolve();
      });

      server.closeIdleConnections();
    });

    logger.info("Disconnecting Prisma and redis connections concurrently...");

    const results = await Promise.allSettled([
      prisma.$disconnect(),
      redis.quit(),
    ]);

    // results.forEach((res, index) => {
    //   if (res.status === "rejected") {
    //     const resource = index === 0 ? "Prisma" : "Redis";
    //     logger.error(`Error disconnecting ${resource} cleanly`, res.reason);
    //   }
    // });

    results.forEach((res, index) => {
      if (res.status === "rejected") {
        const resource = index === 0 ? "Prisma" : "Redis";
        throw new Error(`Error disconnecting ${resource} cleanly`);
      }
    });

    logger.info("Graceful shutdown completed...");

    logger.flush();
    process.exit(0);
  } catch (fatalError) {
    logger.error(fatalError, "Fatal error during shutdown");
    logger.flush();
    process.exit(1);
  }
};

signals.forEach((signal) => {
  process.on(signal, () => handleShutdown(signal));
});

const server = app.listen(env.PORT, () => {
  logger.info(`Server is up and running on http://localhost:${env.PORT}`);
});
