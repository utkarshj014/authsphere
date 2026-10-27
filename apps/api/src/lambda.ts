import serverlessExpressModule from "@codegenie/serverless-express";
import app from "./app.js";
import { redis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

// Handle CJS/ESM interop across TypeScript compilation targets
const configureServerless = ((serverlessExpressModule as any).default ||
  serverlessExpressModule) as (params: {
  app: any;
}) => (event: any, context: any) => Promise<any>;

// Cached serverless proxy handler across warm invocations
let serverlessHandler: ((event: any, context: any) => Promise<any>) | null =
  null;

/**
 * AWS Lambda Handler Entrypoint
 * Wraps AuthSphere's Express application for API Gateway HTTP API v2 or Function URLs.
 * Database (Neon pooled) and Cache (Upstash) singletons connect eagerly upon cold start
 * and persist across warm Lambda invocations.
 */
export const handler = async (event: unknown, context: any) => {
  if (context && typeof context === "object") {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  if (!serverlessHandler) {
    logger.info("Initializing serverless Express runtime (cold start)...");

    // Eagerly connect Redis cache; database connects lazily on first query
    if (redis.status === "wait") {
      try {
        await redis.connect();
      } catch (err) {
        logger.warn(
          { err },
          "Redis handshake deferred or unavailable during cold start; proceeding in degraded mode",
        );
      }
    }

    serverlessHandler = configureServerless({ app });
  }

  return serverlessHandler(event, context);
};
