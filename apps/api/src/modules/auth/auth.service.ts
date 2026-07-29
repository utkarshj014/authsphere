import { ROLES } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import type {
  SignupInput,
  VerifyEmailInput,
  ResendEmailVerificationTokenInput,
} from "./auth.validation.js";
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

    const user = await authRepository.createUserWithEmailVerificationToken(
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

  verifyEmail: async (input: VerifyEmailInput) => {
    const tokenHash = hashToken(input.token);

    const emailVerificationToken =
      await authRepository.findEmailVerificationToken(tokenHash);

    if (!emailVerificationToken) {
      throw new AppError("Invalid verification token", 400);
    }

    if (emailVerificationToken.expiresAt < new Date()) {
      throw new AppError("Verification token has expired", 400);
    }

    await authRepository.markVerifiedAndDeleteEmailVerificationToken(
      emailVerificationToken.userId,
    );
  },

  resendEmailVerificationToken: async (
    input: ResendEmailVerificationTokenInput,
  ) => {
    const user = await authRepository.findUserbyEmail(input.email);

    if (!user || user.isEmailVerified) {
      return;
    }

    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

    await authRepository.reCreateEmailVerificationToken(
      hashToken(token),
      user.id,
      tokenExpiresAt,
    );

    await sendVerificationEmail(token, user.email);
  },
};
