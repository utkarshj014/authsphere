import { registry } from "../../common/openapi/registry.js";
import {
  cookieSecurity,
  authedErrors,
  successResponse,
  errorResponse,
  jsonBody,
} from "../../common/openapi/schemas.js";
import { rolesRequestSchema, rolesResponseSchema } from "./roles.validation.js";

// ─── Role Schemas ──────────────────────────────────────────────────

export const RolePermissionsSchema = registry.register(
  "RolePermissions",
  rolesResponseSchema.rolePermissions.openapi("RolePermissions", {
    description: "Role name and assigned permissions",
  }),
);

// ─── GET /roles/{roleName}/permissions ─────────────────────────────

registry.registerPath({
  method: "get",
  path: "/roles/{roleName}/permissions",
  tags: ["Roles"],
  summary: "Get role permissions",
  description:
    "Retrieves the currently assigned permissions for a given role. Requires admin role.",
  security: cookieSecurity,
  request: {
    params: rolesRequestSchema.getRolePermissionsParams,
  },
  responses: {
    200: successResponse(
      "Permissions retrieved successfully",
      RolePermissionsSchema,
    ),
    ...authedErrors,
    403: errorResponse("Forbidden — admin role required"),
    404: errorResponse("Role not found"),
  },
});

// ─── PUT /roles/{roleName}/permissions ─────────────────────────────

registry.registerPath({
  method: "put",
  path: "/roles/{roleName}/permissions",
  tags: ["Roles"],
  summary: "Update role permissions",
  description:
    "Sets the permissions for a role. Requires admin role. Admin role permissions cannot be updated. Duplicate permissions are deduplicated.",
  security: cookieSecurity,
  request: {
    params: rolesRequestSchema.updatePermissionsParams,
    body: jsonBody(rolesRequestSchema.updatePermissionsBody),
  },
  responses: {
    200: successResponse(
      "Permissions updated successfully",
      RolePermissionsSchema,
    ),
    ...authedErrors,
    403: errorResponse(
      "Forbidden — admin role required, or updating the admin role is prohibited",
    ),
    404: errorResponse("Role not found"),
  },
});
