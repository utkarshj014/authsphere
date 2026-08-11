import { z } from "zod";
import { ROLES, PERMISSIONS } from "@authsphere/shared";

export const rolesSchema = {
  updatePermissionsParams: z.object({
    roleName: z.enum(ROLES),
  }),

  updatePermissionsBody: z.object({
    permissions: z
      .enum(PERMISSIONS)
      .array()
      .transform((items) => Array.from(new Set(items))),
  }),
};

export type UpdatePermissionsParams = z.infer<
  typeof rolesSchema.updatePermissionsParams
>;
export type UpdatePermissionsBody = z.infer<
  typeof rolesSchema.updatePermissionsBody
>;
