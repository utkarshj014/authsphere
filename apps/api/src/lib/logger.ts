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

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: loggerRedactionConfig,
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
