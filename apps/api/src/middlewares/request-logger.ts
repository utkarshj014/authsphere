import { pinoHttp } from "pino-http";
import { logger, reqSerializer } from "../lib/logger.js";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || (req.headers["x-request-id"] as string),
  // ServerlessResponse may emit "close" before "finish"; treat ended/sent responses as completed
  customSuccessMessage: (_req, res) =>
    res.writableEnded || res.headersSent
      ? "request completed"
      : "request aborted",
  serializers: {
    req: reqSerializer,
  },
});
