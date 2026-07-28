import { ROLES } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import type { SignupInput } from "./auth.validation.js";
import { hashPassword } from "../../lib/crypto/password.js";
import { generateToken, hashToken } from "../../lib/crypto/token.js";
import { sendVerificationEmail } from "../email/demo.js";

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

    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

    const { user } = await authRepository.createUserWithVerificationToken(
      {
        email: input.email,
        passwordHash,
        ...(input.firstName !== undefined
          ? { firstName: input.firstName }
          : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        roleId: userRole.id,
      },
      hashToken(token),
      tokenExpiresAt,
    );

    await sendVerificationEmail(token, user.email);
  },
};
