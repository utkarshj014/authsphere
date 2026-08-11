import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/index.js";
import { ApiResponse } from "../../common/responses/index.js";
import { rolesService } from "./roles.service.js";
import type { RoleName } from "@authsphere/shared";

const updatePermissions = asyncHandler(async (req: Request, res: Response) => {
  const updatedRole = await rolesService.updateRolePermissions(
    req.params.roleName as RoleName,
    req.body,
  );

  return ApiResponse.success(
    res,
    updatedRole,
    "Role permissions updated successfully",
    200,
  );
});

export const rolesController = {
  updatePermissions,
};
