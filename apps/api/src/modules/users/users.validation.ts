import { z } from "zod";
import { ROLES } from "@authsphere/shared";

const idSchema = z.uuidv7();

export const usersSchema = {
  getUser: z.object({
    id: idSchema,
  }),

  role: z.object({
    roleName: z.enum(ROLES),
  }),
};

export type GetUserInput = z.infer<typeof usersSchema.getUser>;
export type RoleInput = z.infer<typeof usersSchema.role>;
