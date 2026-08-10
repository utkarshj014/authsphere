import { usersRepository } from "./users.repository.js";
import { AppError, ForbiddenError } from "../../common/errors/index.js";
import type { RoleInput } from "./users.validation.js";

const getUser = async (userId: string) => {
  const user = await usersRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
};

const changeRole = async (
  currentUserId: string,
  targetUserId: string,
  input: RoleInput,
) => {
  if (currentUserId === targetUserId) {
    throw new ForbiddenError("You cannot change your own role");
  }

  const updatedUser = await usersRepository.updateUserRole(
    targetUserId,
    input.roleName,
  );

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    role: updatedUser.role.name,
    isEmailVerified: updatedUser.isEmailVerified,
    createdAt: updatedUser.createdAt,
  };
};

export const usersService = {
  getUser,
  changeRole,
};
