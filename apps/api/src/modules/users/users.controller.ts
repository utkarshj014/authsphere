import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/index.js";
import { ApiResponse } from "../../common/responses/index.js";
import { usersService } from "./users.service.js";

const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getUser(req.params.id as string);

  return ApiResponse.success(res, user, "User fetched successfully", 200);
});

const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.changeRole(
    req.auth.userId,
    req.params.id as string,
    req.body,
  );

  return ApiResponse.success(res, user, "User role changed successfully", 200);
});

export const usersController = {
  getUser,
  changeRole,
};
