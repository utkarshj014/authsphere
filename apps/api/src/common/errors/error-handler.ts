import type { Response, Request, NextFunction } from "express";
import { logger } from "../../lib/logger.js";
import { AppError } from "./app-error.js";
import { ValidationError } from "./validation-error.js";
import { UnauthorizedError } from "./unauthorized-error.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../utils/cookie-options.js";
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
  logger.error(err);

  if (err instanceof ValidationError) {
    return res
      .status(err.statusCode)
      .json(responseDto(err.message, err.errors));
  }

  if (err instanceof UnauthorizedError) {
    const { maxAge: _noNeed1, ...clearAccessOptions } =
      accessTokenCookieOptions;
    const { maxAge: _noNeed2, ...clearRefreshOptions } =
      refreshTokenCookieOptions;

    res.clearCookie("accessToken", clearAccessOptions);
    res.clearCookie("refreshToken", clearRefreshOptions);

    return res.status(err.statusCode).json(responseDto(err.message));
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(responseDto(err.message));
  }

  const isProduction = env.NODE_ENV === "production";
  const message = isProduction ? "Internal Server Error" : err.message;
  const errors = isProduction ? undefined : [err];

  return res.status(500).json(responseDto(message, errors));
};
