import type { IncomingMessage } from "node:http";
import pino from "pino";
import { env } from "../config/env.js";

export const loggerRedactionConfig = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    'res.headers["set-cookie"]',
    "res.headers.location",
  ],
  censor: "[REDACTED]",
};

/** Serializes request metadata via Pino's standard serializer while stripping query strings and `query` params. */
export const reqSerializer = (req: IncomingMessage) => {
  if (!req) return req;

  const serialized = pino.stdSerializers.req(req);
  if (typeof serialized.url === "string") {
    serialized.url = serialized.url.split("?")[0] || "/";
  }
  delete (serialized as Partial<pino.SerializedRequest>).query;
  return serialized;
};

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: loggerRedactionConfig,
  serializers: {
    req: reqSerializer,
  },
  ...(env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
      },
    },
  }),
});
