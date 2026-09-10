import { z } from "zod";
import { ROLES, PERMISSIONS } from "@authsphere/shared";

const roleSchema = z.enum(ROLES);
const permissionSchema = z.enum(PERMISSIONS);

export const rolesRequestSchema = {
  updatePermissionsParams: z.object({
    roleName: roleSchema,
  }),

  // Normalization of permissions array to remove duplicates
  updatePermissionsBody: z.object({
    permissions: permissionSchema
      .array()
      .transform((items) => Array.from(new Set(items))),
  }),
};

export const rolesResponseSchema = {
  rolePermissions: z.object({
    role: roleSchema,
    permissions: permissionSchema.array(),
  }),
};

export type UpdatePermissionsParams = z.infer<
  typeof rolesRequestSchema.updatePermissionsParams
>;
export type UpdatePermissionsBody = z.infer<
  typeof rolesRequestSchema.updatePermissionsBody
>;
export type RolePermissionsResponse = z.infer<
  typeof rolesResponseSchema.rolePermissions
>;

// Backwards-compatible alias for routers/tests
export const rolesSchema = rolesRequestSchema;
