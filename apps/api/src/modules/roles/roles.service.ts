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

  // Invalidate Redis role-permission cache immediately upon DB update.
  // Note: Active sessions reflect updated permissions upon their next access token
  // refresh (bounded by 15m JWT_ACCESS_EXPIRES_IN_MS), avoiding disruptive mass session revocations.
  await authorizationService.invalidateRolePermissionsCache(roleName);

  return result;
};

export const rolesService = {
  updateRolePermissions,
};
