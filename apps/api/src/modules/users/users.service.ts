import { usersRepository } from "./users.repository.js";
import { AppError } from "../../common/errors/index.js";

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

export const usersService = {
  getUser,
};
