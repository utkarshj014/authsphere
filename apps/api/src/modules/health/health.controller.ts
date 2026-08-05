import type { NextFunction, Request, Response } from "express";
import { healthService } from "./health.service.js";
import { ApiResponse } from "../../common/responses/index.js";
import { asyncHandler } from "../../common/errors/index.js";

export const getHealth = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await healthService();

    // This is a valid application health check and not an operational error.
    // Hence, instead of throwing an AppError, we are reporting the status of the application.
    if (data.database === "DOWN" || data.redis === "DOWN") {
      return ApiResponse.error(
        res,
        data,
        "Authsphere API is unhealthy! :(",
        503,
      );
    }

    return ApiResponse.success(res, data, "Authsphere API is healthy! :)");
  },
);
