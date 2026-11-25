import { usersRepository } from "./users.repository.js";
import { AppError, ForbiddenError } from "../../common/errors/index.js";
import { setUserRevokedAt } from "../auth/index.js";
import {
  usersResponseSchema,
  type RoleInput,
  type UserProfileResponse,
  type ListUsersQueryInput,
  type PaginatedUsersResponse,
} from "./users.validation.js";

const getUser = async (userId: string): Promise<UserProfileResponse> => {
  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Runtime egress sanitization firewall on sensitive user profile record
  return usersResponseSchema.userProfile.parse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    mfaEnabled: user.mfaEnabled,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  });
};

const listUsers = async (
  query: ListUsersQueryInput,
): Promise<PaginatedUsersResponse> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const { users, totalCount } = await usersRepository.findUsersPaginated(
    page,
    limit,
  );

  const totalPages = Math.ceil(totalCount / limit);

  return usersResponseSchema.paginatedUsers.parse({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role.name,
      mfaEnabled: u.mfaEnabled,
      isEmailVerified: u.isEmailVerified,
      createdAt: u.createdAt,
    })),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
};

const changeRole = async (
  currentUserId: string,
  targetUserId: string,
  input: RoleInput,
): Promise<UserProfileResponse> => {
  if (currentUserId === targetUserId) {
    throw new ForbiddenError("You cannot change your own role");
  }

  const updatedUser = await usersRepository.updateUserRole(
    targetUserId,
    input.roleName,
  );

  // Invalidate any in-flight stateless access tokens immediately in Redis
  await setUserRevokedAt(targetUserId);

  // Runtime egress sanitization firewall on sensitive user profile record
  return usersResponseSchema.userProfile.parse({
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    role: updatedUser.role.name,
    mfaEnabled: updatedUser.mfaEnabled,
    isEmailVerified: updatedUser.isEmailVerified,
    createdAt: updatedUser.createdAt,
  });
};

export const usersService = {
  getUser,
  listUsers,
  changeRole,
};
