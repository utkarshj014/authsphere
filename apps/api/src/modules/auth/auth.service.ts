import crypto from "node:crypto";
import { ROLES } from "@authsphere/shared";
import { AppError, UnauthorizedError } from "../../common/errors/index.js";
import { authRepository } from "./auth.repository.js";
import type {
  SignupInput,
  VerifyEmailInput,
  ResendVerificationTokenInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  MfaVerifySetupInput,
  MfaVerifyLoginInput,
  MfaDisableInput,
  MfaRegenerateRecoveryCodesInput,
} from "./auth.validation.js";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
  generateToken,
  hashToken,
  generateRecoveryCodes,
} from "../../lib/crypto/index.js";
import { totp } from "../../lib/totp/index.js";
import {
  sendForgotPasswordEmail,
  sendVerificationEmail,
} from "../email/demo.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt/index.js";
import type { AuthTokens } from "./auth.types.js";
import { env } from "../../config/env.js";

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
): Promise<
  | { mfaRequired: false; tokens: AuthTokens }
  | { mfaRequired: true; mfaToken: string }
> => {
  const user = await authRepository.findUserByEmailWithRole(input.email);
  if (!user) {
    // Dummy password check for constant time response
    await verifyPassword(DUMMY_PASSWORD_HASH, input.password);
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.passwordHash) {
    throw new AppError(
      "This account is created using social login. Please login using your social account",
      403,
    );
  }

  const passwordMatch = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!user.isEmailVerified) {
    throw new AppError("Email not verified", 403);
  }

  if (user.mfaEnabled) {
    const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const challenge = await authRepository.createMfaChallenge(
      user.id,
      challengeExpiresAt,
    );

    return {
      mfaRequired: true,
      mfaToken: challenge.id,
    };
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

  return {
    mfaRequired: false,
    tokens: { accessToken, refreshToken },
  };
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

  await authRepository.rotateSession(session.id, {
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

const getCurrentUser = async (userId: string) => {
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
  if (!user || !user.passwordHash) {
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
    // Not using UnauthorizedError because the user is already authenticated, just password is wrong
    throw new AppError("Invalid old password", 400);
  }

  const samePassword = await verifyPassword(
    user.passwordHash,
    input.newPassword,
  );
  if (samePassword) {
    throw new AppError("New password cannot be same as old password", 400);
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await authRepository.changePassword(userId, newPasswordHash);
};

const mfaSetup = async (userId: string) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.mfaEnabled) {
    throw new AppError("MFA is already enabled", 400);
  }

  const secret = totp.generateSecret();
  await authRepository.savePendingMfaSecret(userId, secret);

  const otpauthUri = totp.generateOtpUri(secret, user.email);

  return {
    secret,
    otpauthUri,
  };
};

const mfaVerifySetup = async (userId: string, input: MfaVerifySetupInput) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.mfaEnabled) {
    throw new AppError("MFA is already enabled", 400);
  }
  if (!user.mfaSecret) {
    throw new AppError(
      "MFA setup has not been initiated. Please start MFA setup first",
      400,
    );
  }

  const { valid } = totp.verifyCode(user.mfaSecret, input.code);
  if (!valid) {
    throw new AppError("Invalid MFA code", 400);
  }

  const { recoveryCodes, recoveryCodeHashes } = generateRecoveryCodes();

  await authRepository.enableMfaAndSaveRecoveryCodes(
    userId,
    recoveryCodeHashes,
  );

  return {
    recoveryCodes,
  };
};

const verifyMfaCodeOrRecoveryCode = async (
  userId: string,
  userMfaSecret: string | null,
  userMfaEnabled: boolean,
  code: string,
): Promise<void> => {
  if (!userMfaEnabled) {
    throw new AppError("MFA is not enabled for this account", 400);
  }

  let isCodeValid = false;

  if (totp.isTotpCode(code) && userMfaSecret) {
    const { valid, matchedWindow } = totp.verifyCode(userMfaSecret, code);
    if (valid && matchedWindow !== undefined) {
      const windowUpdated = await authRepository.updateMfaLastUsedWindow(
        userId,
        matchedWindow,
      );
      if (windowUpdated) {
        isCodeValid = true;
      }
    }
  }

  if (!isCodeValid) {
    const codeHash = hashToken(code);
    isCodeValid = await authRepository.verifyAndConsumeRecoveryCode(
      userId,
      codeHash,
    );
  }

  if (!isCodeValid) {
    throw new AppError("Invalid or expired MFA code or recovery code", 400);
  }
};

const mfaVerifyLogin = async (
  input: MfaVerifyLoginInput,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthTokens> => {
  const challenge = await authRepository.findMfaChallengeById(input.mfaToken);
  if (!challenge) {
    throw new AppError("Invalid or expired MFA challenge", 400);
  }

  const { user } = challenge;

  await verifyMfaCodeOrRecoveryCode(
    user.id,
    user.mfaSecret,
    user.mfaEnabled,
    input.code,
  );

  await authRepository.deleteMfaChallenge(input.mfaToken);

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

const mfaDisable = async (userId: string, input: MfaDisableInput) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await verifyMfaCodeOrRecoveryCode(
    userId,
    user.mfaSecret,
    user.mfaEnabled,
    input.code,
  );

  await authRepository.disableMfaAndRevokeSessions(userId);
};

const mfaRegenerateRecoveryCodes = async (
  userId: string,
  input: MfaRegenerateRecoveryCodesInput,
) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  await verifyMfaCodeOrRecoveryCode(
    userId,
    user.mfaSecret,
    user.mfaEnabled,
    input.code,
  );

  const { recoveryCodes, recoveryCodeHashes } = generateRecoveryCodes();

  await authRepository.replaceRecoveryCodes(userId, recoveryCodeHashes);

  return {
    recoveryCodes,
  };
};

export const authService = {
  signup,
  verifyEmail,
  resendVerificationToken,
  login,
  refreshToken,
  logout,
  logoutAll,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  mfaSetup,
  mfaVerifySetup,
  mfaVerifyLogin,
  mfaDisable,
  mfaRegenerateRecoveryCodes,
};
