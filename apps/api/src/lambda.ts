import type { RequestListener } from "node:http";
import express, { type RequestHandler } from "express";
import serverlessExpressModule from "@codegenie/serverless-express";
import app, { JSON_BODY_LIMIT_BYTES } from "./app.js";
import { redis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

const REDIS_CONNECT_WAIT_MS = 500;
const REDIS_RETRY_COOLDOWN_MS = 5000;

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

type ConfigureServerless = (params: {
  app: RequestListener;
}) => (event: unknown, context: unknown) => Promise<unknown>;

// Handle CJS/ESM interop cleanly without unsafe any propagation
const rawModule = serverlessExpressModule as unknown as
  | ConfigureServerless
  | { default?: ConfigureServerless; configure?: ConfigureServerless };

const configureServerless =
  typeof rawModule === "function"
    ? rawModule
    : (rawModule.configure ?? rawModule.default);

if (!configureServerless) {
  throw new Error("Failed to resolve @codegenie/serverless-express export");
}

// Construct serverless Express wrapper once during Lambda INIT phase
const lambdaApp = express();
lambdaApp.set("trust proxy", app.get("trust proxy"));
lambdaApp.use(parseLambdaJsonBody, app);

const serverlessHandler = configureServerless({ app: lambdaApp });

let lastRedisFailureAt = 0;

const waitForRedisSettlement = (): Promise<void> =>
  new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timer);
      redis.off("ready", settle);
      redis.off("end", settle);
    };
    const settle = () => {
      lastRedisFailureAt = redis.status === "ready" ? 0 : Date.now();
      cleanup();
      resolve();
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, REDIS_CONNECT_WAIT_MS);
    timer.unref();

    redis.once("ready", settle);
    redis.once("end", settle);
  });

const ensureRedisReady = async (): Promise<void> => {
  if (redis.status === "ready") {
    lastRedisFailureAt = 0;
    return;
  }

  const canDial =
    redis.status === "wait" ||
    redis.status === "end" ||
    redis.status === "close";

  if (
    canDial &&
    lastRedisFailureAt > 0 &&
    Date.now() - lastRedisFailureAt < REDIS_RETRY_COOLDOWN_MS
  ) {
    return;
  }

  // Register listeners before dialing so fast connection completions or failures are never missed
  const readyPromise = waitForRedisSettlement();

  if (canDial) {
    redis.connect().catch((err: unknown) => {
      lastRedisFailureAt = Date.now();
      logger.warn(
        { err },
        "Redis handshake deferred or unavailable; proceeding in degraded mode",
      );
    });
  }

  await readyPromise;
};

/**
 * AWS Lambda Handler Entrypoint.
 * Reuses module-scoped Express and serverless-express instances across warm invocations
 * while ensuring bounded Redis readiness with degraded-mode fallback.
 */
export const handler = async (event: unknown, context: unknown) => {
  await ensureRedisReady();
  return serverlessHandler(event, context);
};
