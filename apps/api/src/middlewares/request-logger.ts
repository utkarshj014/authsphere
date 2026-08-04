import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || (req.headers["x-request-id"] as string),
});
