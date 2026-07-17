import type { Response, Request, NextFunction } from "express";
import { logger } from "../../config/logger.js";
import { AppError } from "./app-error.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error(err);

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ success: false, message: err.message });
  }

  return res
    .status(500)
    .json({ success: false, message: "Internal Server Error" });
};
