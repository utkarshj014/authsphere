import type { Response, Request, NextFunction } from "express";
import { logger } from "../../lib/logger.js";
import { AppError } from "./app-error.js";
import { ValidationError } from "./validation-error.js";
import { env } from "../../config/env.js";

const responseDto = (message: string, errors?: unknown[]) => ({
  success: false,
  message,
  ...(errors && { errors }),
});

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError && err.statusCode < 500) {
    logger.warn({ statusCode: err.statusCode }, err.message);
  } else {
    logger.error(err);
  }

  if (err instanceof ValidationError) {
    return res
      .status(err.statusCode)
      .json(responseDto(err.message, err.errors));
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(responseDto(err.message));
  }

  const isProduction = env.NODE_ENV === "production";
  const message = isProduction ? "Internal Server Error" : err.message;
  const errors = isProduction
    ? undefined
    : [
        {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
      ];

  return res.status(500).json(responseDto(message, errors));
};
