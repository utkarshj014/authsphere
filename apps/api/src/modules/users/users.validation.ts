import { z } from "zod";
import { ROLES } from "@authsphere/shared";

const idSchema = z.uuidv7();

export const usersRequestSchema = {
  getUser: z.object({
    id: idSchema,
  }),

  role: z.object({
    roleName: z.enum(ROLES),
  }),
};

export const usersResponseSchema = {
  userProfile: z.object({
    id: idSchema,
    email: z.email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    role: z.enum(ROLES),
    isEmailVerified: z.boolean(),
    createdAt: z.date().or(z.string()),
  }),
};

export type GetUserInput = z.infer<typeof usersRequestSchema.getUser>;
export type RoleInput = z.infer<typeof usersRequestSchema.role>;
export type UserProfileResponse = z.infer<
  typeof usersResponseSchema.userProfile
>;

// Backwards-compatible alias for routers/tests
export const usersSchema = usersRequestSchema;
