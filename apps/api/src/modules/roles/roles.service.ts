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
    throw new ForbiddenError("Cannot update permissions for the admin role.");
  }

  const result = await rolesRepository.updateRolePermissions(
    roleName,
    input.permissions,
  );

  // Invalidate Redis role-permission cache immediately upon DB update.
  // Because the auth middleware resolves permissions dynamically via authorizationService
  // on every request, all active sessions pick up updated permissions immediately on their next request.
  await authorizationService.invalidateRolePermissionsCache(roleName);

  return result;
};

export const rolesService = {
  updateRolePermissions,
};
