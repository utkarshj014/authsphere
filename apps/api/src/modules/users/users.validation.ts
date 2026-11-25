import { z } from "zod";
import { ROLES } from "@authsphere/shared";

const idSchema = z.uuidv7();

export const usersRequestSchema = {
  getUser: z.object({
    id: idSchema,
  }),

  listUsersQuery: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
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
    mfaEnabled: z.boolean().default(false),
    isEmailVerified: z.boolean(),
    createdAt: z.date().or(z.string()),
  }),

  paginatedUsers: z.object({
    users: z.array(
      z.object({
        id: idSchema,
        email: z.email(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        role: z.enum(ROLES),
        mfaEnabled: z.boolean().default(false),
        isEmailVerified: z.boolean(),
        createdAt: z.date().or(z.string()),
      }),
    ),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      totalCount: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),
};

export type GetUserInput = z.infer<typeof usersRequestSchema.getUser>;
export type ListUsersQueryInput = z.infer<
  typeof usersRequestSchema.listUsersQuery
>;
export type RoleInput = z.infer<typeof usersRequestSchema.role>;
export type UserProfileResponse = z.infer<
  typeof usersResponseSchema.userProfile
>;
export type PaginatedUsersResponse = z.infer<
  typeof usersResponseSchema.paginatedUsers
>;

// Backwards-compatible alias for routers/tests
export const usersSchema = usersRequestSchema;
