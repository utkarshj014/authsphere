import serverlessExpressModule from "@codegenie/serverless-express";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
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
export const handler = async (event: unknown, context: unknown) => {
  if (!serverlessHandler) {
    logger.info("Initializing serverless Express runtime (cold start)...");

    // Eager connection initialization for fail-fast behavior
    await Promise.all([prisma.$connect(), redis.connect()]);

    serverlessHandler = configureServerless({ app });
  }

  return serverlessHandler(event, context);
};
