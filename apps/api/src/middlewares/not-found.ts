import type { Request, Response } from "express";
import { ApiResponse } from "../common/responses/api-response.js";

export const notFoundHandler = (_req: Request, res: Response) => {
  return ApiResponse.error(res, null, "Route not found!", 404);
};
