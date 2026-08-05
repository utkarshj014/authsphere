import crypto from "node:crypto";
import { ROLES } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import type {
  SignupInput,
  VerifyEmailInput,
  ResendVerificationTokenInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "./auth.validation.js";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "../../lib/crypto/password.js";
import { generateToken, hashToken } from "../../lib/crypto/token.js";
import {
  sendForgotPasswordEmail,
  sendVerificationEmail,
} from "../email/demo.js";
import {
  signAccessToken,
  verifyAccessToken,
} from "../../lib/jwt/access-token.js";
import {
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt/refresh-token.js";
import type { AuthTokens } from "./auth.types.js";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../common/errors/unauthorized-error.js";

const signup = async (input: SignupInput) => {
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
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      roleId: userRole.id,
    },
    tokenHash,
    tokenExpiresAt,
  );

  await sendVerificationEmail(token, user.email);
};

const verifyEmail = async (input: VerifyEmailInput) => {
  const tokenHash = hashToken(input.token);

  await authRepository.verifyEmailAndDeleteToken(tokenHash);
};

const resendVerificationToken = async (input: ResendVerificationTokenInput) => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user || user.isEmailVerified) {
    return;
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

  await authRepository.reCreateVerificationToken(
    tokenHash,
    user.id,
    tokenExpiresAt,
  );

  await sendVerificationEmail(token, user.email);
};

const login = async (
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthTokens> => {
  const user = await authRepository.findUserByEmailWithRole(input.email);
  if (!user) {
    // Dummy password check for constant time response
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.passwordHash) {
    throw new AppError("This account is created using social login", 403);
  }

  const passwordMatch = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.isEmailVerified) {
    throw new AppError("Email not verified", 403);
  }

  const sessionId = crypto.randomUUIDv7();
  const sessionExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_MS);

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

  await authRepository.createSession(user.id, {
    id: sessionId,
    tokenHash: refreshTokenHash,
    expiresAt: sessionExpiresAt,
    ...(ipAddress !== undefined ? { ipAddress } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
  });

  return { accessToken, refreshToken };
};

const refreshToken = async (
  token?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthTokens> => {
  if (!token) {
    throw new UnauthorizedError("No refresh token provided");
  }

  const payload = await verifyRefreshToken(token);

  const session = await authRepository.findSessionById(payload.sid);
  if (!session) {
    throw new UnauthorizedError("Invalid session");
  }

  // Defense-in-depth
  if (session.userId !== payload.sub) {
    throw new UnauthorizedError("Compromised session detected");
  }

  const oldRefreshTokenHash = hashToken(token);
  if (session.tokenHash !== oldRefreshTokenHash) {
    if (env.AUTH_REUSE_DELETION_MODE === "GLOBAL") {
      await authRepository.deleteAllSessionsByUserId(session.userId);
    } else {
      await authRepository.deleteSessionById(session.id);
    }
    throw new UnauthorizedError("Compromised session detected");
  }

  const user = session.user;

  const newAccessToken = await signAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.role.name,
  });
  const newRefreshToken = await signRefreshToken({
    sub: user.id,
    sid: session.id,
    role: user.role.name,
  });

  const newRefreshTokenHash = hashToken(newRefreshToken);
  const sessionExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_MS);

  await authRepository.rotateSession({
    id: session.id,
    tokenHash: newRefreshTokenHash,
    expiresAt: sessionExpiresAt,
    ...(ipAddress !== undefined ? { ipAddress } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logout = async (token?: string) => {
  if (!token) {
    throw new UnauthorizedError("No refresh token provided");
  }

  const payload = await verifyRefreshToken(token);

  const session = await authRepository.findSessionById(payload.sid);
  if (!session) {
    return;
  }

  await authRepository.deleteSessionById(session.id);
};

const logoutAll = async (userId: string) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    return;
  }

  await authRepository.deleteAllSessionsByUserId(user.id);
};

const getMe = async (userId?: string) => {
  if (!userId) {
    throw new UnauthorizedError("No user ID provided");
  }

  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    verifiedAt: user.verifiedAt,
    createdAt: user.createdAt,
  };
};

const forgotPassword = async (input: ForgotPasswordInput) => {
  const user = await authRepository.findUserByEmail(input.email);
  if (!user) {
    return;
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000 * 24);

  await authRepository.createPasswordResetToken(
    tokenHash,
    user.id,
    tokenExpiresAt,
  );

  await sendForgotPasswordEmail(token, user.email);
};

const resetPassword = async (input: ResetPasswordInput) => {
  const tokenHash = hashToken(input.token);

  const newPasswordHash = await hashPassword(input.password);

  await authRepository.resetPasswordAndDeleteToken(tokenHash, newPasswordHash);
};

const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (!user.passwordHash) {
    throw new AppError(
      "This account is created using social login. You cannot change your password.",
      403,
    );
  }

  const passwordMatch = await verifyPassword(
    user.passwordHash,
    input.oldPassword,
  );
  if (!passwordMatch) {
    // Not use UnauthorizedError because the user is already authenticated, just password is wrong
    throw new AppError("Invalid old password", 400);
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await authRepository.changePassword(userId, newPasswordHash);
};

export const authService = {
  signup,
  verifyEmail,
  resendVerificationToken,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
};
