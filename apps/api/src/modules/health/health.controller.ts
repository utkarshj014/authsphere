import type { NextFunction, Request, Response } from "express";
import { healthService } from "./health.service.js";
import { ApiResponse } from "../../common/responses/index.js";
import { asyncHandler } from "../../common/errors/index.js";

/**
 * Lightweight process liveness probe.
 * Suitable for AWS ALB target group health checks and container orchestrators.
 * Pure in-memory execution ensures zero external dependency I/O.
 */
export const getLiveness = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const data = healthService.getLiveness();
    return ApiResponse.success(res, data, "AuthSphere API is live", 200);
  },
);

/**
 * Dependency readiness probe.
 * Evaluates operational readiness of critical backing services (PostgreSQL & Redis).
 * Returns 200 when all dependencies are available, 503 when any dependency is down.
 */
export const getReadiness = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const data = await healthService.getReadiness();

    if (data.status === "DOWN") {
      return ApiResponse.error(
        res,
        data,
        "One or more dependencies are unavailable",
        503,
      );
    }

    return ApiResponse.success(
      res,
      data,
      "All dependencies are available",
      200,
    );
  },
);

/**
 * Root alias for backward compatibility.
 * Delegates to the lightweight liveness handler.
 */
export const getHealth = getLiveness;
