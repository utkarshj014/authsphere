import { ROLES } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import type { SignupInput } from "./auth.validation.js";
import { hashPassword } from "../../lib/crypto/password.js";

export const authService = {
  signup: async (input: SignupInput) => {
    const existingUser = await authRepository.findUserbyEmail(input.email);
    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const userRole = await authRepository.findRoleByName(ROLES.USER);
    if (!userRole) {
      throw new AppError("Default role not found", 500);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await authRepository.createUser({
      email: input.email,
      passwordHash,
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      roleId: userRole.id,
    });

    return {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  },
};
