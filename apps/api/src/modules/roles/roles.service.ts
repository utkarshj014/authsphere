import { rolesRepository } from "./roles.repository.js";
import { authorizationService } from "../authorization/index.js";
import { ROLES, type RoleName } from "@authsphere/shared";
import type { UpdatePermissionsBody } from "./roles.validation.js";
import { ForbiddenError } from "../../common/errors/forbidden-error.js";

const updateRolePermissions = async (
  roleName: RoleName,
  input: UpdatePermissionsBody,
) => {
  if (roleName === ROLES.ADMIN) {
    throw new ForbiddenError("Cannot update permissions for admin role.");
  }

  const result = await rolesRepository.updateRolePermissions(
    roleName,
    input.permissions,
  );

  // Invalidate Redis role-permission cache only after successful DB update
  await authorizationService.invalidateRolePermissionsCache(roleName);

  return result;
};

export const rolesService = {
  updateRolePermissions,
};
