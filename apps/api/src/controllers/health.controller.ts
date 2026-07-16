import { type Request, type Response } from "express";
import { healthService } from "../services/health.service.js";
import { ApiResponse } from "../common/responses/api-response.js";

export const getHealth = (_req: Request, res: Response) => {
  try {
    const data = healthService();
    return ApiResponse.success(res, data, "Authsphere API is healthy! :)");
  } catch (error) {
    return ApiResponse.error(res);
  }
};
