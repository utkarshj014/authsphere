import { usersRepository } from "./users.repository.js";
import { AppError, ForbiddenError } from "../../common/errors/index.js";
import {
  usersResponseSchema,
  type RoleInput,
  type UserProfileResponse,
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
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
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

  // Runtime egress sanitization firewall on sensitive user profile record
  return usersResponseSchema.userProfile.parse({
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    role: updatedUser.role.name,
    isEmailVerified: updatedUser.isEmailVerified,
    createdAt: updatedUser.createdAt,
  });
};

export const usersService = {
  getUser,
  changeRole,
};
