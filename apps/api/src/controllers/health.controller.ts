import type { NextFunction, Request, Response } from "express";
import { healthService } from "../services/health.service.js";
import { ApiResponse } from "../common/responses/api-response.js";
import { asyncHandler } from "../common/errors/async-handler.js";

export const getHealth = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await healthService();
    return ApiResponse.success(res, data, "Authsphere API is healthy! :)");
  },
);
