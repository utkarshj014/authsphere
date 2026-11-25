import { once } from "node:events";
import express, { type RequestHandler } from "express";
import serverlessExpressModule from "@codegenie/serverless-express";
import app from "./app.js";
import { redis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

const JSON_BODY_LIMIT_BYTES = 16 * 1024;

/**
 * Fallback JSON parser for @codegenie/serverless-express + Express 5.
 * body-parser@2 skips parsing when req.socket is absent (onFinished.isFinished === true),
 * leaving req.body as a raw Buffer.
 */
const parseLambdaJsonBody: RequestHandler = (req, res, next) => {
  if (!Buffer.isBuffer(req.body) || !req.is("application/json")) {
    return next();
  }

  if (req.body.byteLength > JSON_BODY_LIMIT_BYTES) {
    return res.status(413).json({
      success: false,
      message: "Request payload too large",
    });
  }

  const raw = req.body.toString("utf8").trim();
  if (!raw) {
    req.body = {};
    return next();
  }

  try {
    req.body = JSON.parse(raw);
    return next();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }
};

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

    const lambdaApp = express();
    lambdaApp.set("trust proxy", app.get("trust proxy"));
    lambdaApp.use(parseLambdaJsonBody, app);

    serverlessHandler = configureServerless({ app: lambdaApp });
  } else if (redis.status !== "ready") {
    // Warm invocation: if Redis was severed while frozen, give it up to 100ms to complete TLS
    if (redis.status === "end") {
      redis.connect().catch(() => {});
    }
    await once(redis, "ready", { signal: AbortSignal.timeout(100) }).catch(
      () => {},
    );
  }

  return serverlessHandler(event, context);
};
