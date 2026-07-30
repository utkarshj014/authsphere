import crypto from "node:crypto";
import { ROLES } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import type {
  SignupInput,
  VerifyEmailInput,
  ResendVerificationTokenInput,
  LoginInput,
} from "./auth.validation.js";
import { hashPassword, verifyPassword } from "../../lib/crypto/password.js";
import { generateToken, hashToken } from "../../lib/crypto/token.js";
import { sendVerificationEmail } from "../email/demo.js";
import { signAccessToken } from "../../lib/jwt/access-token.js";
import { signRefreshToken } from "../../lib/jwt/refresh-token.js";
import type { AuthTokens } from "./auth.types.js";

export const authService = {
  signup: async (input: SignupInput) => {
    const existingUser = await authRepository.findUserByEmail(input.email);
    if (existingUser) {
      throw new AppError("Email already in use", 409);
    }

    const userRole = await authRepository.findRoleByName(ROLES.USER);
    if (!userRole) {
      throw new AppError("Default role not found", 500);
    }

    const passwordHash = await hashPassword(input.password);
    const token = generateToken();
    const tokenHash = hashToken(token);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

    const user = await authRepository.createUserWithVerificationToken(
      {
        email: input.email,
        passwordHash,
        ...(input.firstName !== undefined
          ? { firstName: input.firstName }
          : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        roleId: userRole.id,
      },
      tokenHash,
      tokenExpiresAt,
    );

    await sendVerificationEmail(token, user.email);
  },

  verifyEmail: async (input: VerifyEmailInput) => {
    const tokenHash = hashToken(input.token);

    const emailVerificationToken =
      await authRepository.findVerificationToken(tokenHash);
    if (!emailVerificationToken) {
      throw new AppError("Invalid verification token", 400);
    }
    if (emailVerificationToken.expiresAt < new Date()) {
      throw new AppError("Verification token has expired", 400);
    }

    await authRepository.markVerifiedAndDeleteVerificationToken(
      emailVerificationToken.userId,
    );
  },

  resendVerificationToken: async (input: ResendVerificationTokenInput) => {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user || user.isEmailVerified) {
      return;
    }

    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

    await authRepository.reCreateVerificationToken(
      hashToken(token),
      user.id,
      tokenExpiresAt,
    );

    await sendVerificationEmail(token, user.email);
  },

  login: async (
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> => {
    const user = await authRepository.findUserByEmailWithRole(input.email);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }
    if (!user.passwordHash) {
      throw new AppError("This account is created using social login", 403);
    }

    const passwordMatch = await verifyPassword(
      user.passwordHash,
      input.password,
    );
    if (!passwordMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError("Email not verified", 403);
    }

    const sessionId = crypto.randomUUIDv7();
    const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24 * 30);

    const accessToken = await signAccessToken({
      sub: user.id,
      sid: sessionId,
      role: user.role.name,
    });
    const refreshToken = await signRefreshToken({
      sub: user.id,
      sid: sessionId,
      role: user.role.name,
    });

    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 60 * 60 * 1000 * 24 * 30,
    );

    await authRepository.createSessionWithRefreshToken(
      user.id,
      {
        id: sessionId,
        expiresAt: sessionExpiresAt,
        ...(ipAddress !== undefined ? { ipAddress } : {}),
        ...(userAgent !== undefined ? { userAgent } : {}),
      },
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    return { accessToken, refreshToken };
  },
};
