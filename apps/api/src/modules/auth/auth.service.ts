import { uuidv7 } from "uuidv7";
import { ROLES, type RoleName } from "@authsphere/shared";
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
  encryptMfaSecret,
  decryptMfaSecret,
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

// ==========================================
// Private Helpers
// ==========================================

const generateAuthTokensAndSession = async (
  userId: string,
  roleName: RoleName,
  ipAddress: string,
  userAgent?: string,
  existingSessionId?: string,
): Promise<AuthTokens> => {
  const sessionId = existingSessionId ?? uuidv7();
  const sessionExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN_MS);

  const accessToken = await signAccessToken({
    sub: userId,
    sid: sessionId,
    role: roleName,
  });
  const refreshToken = await signRefreshToken({
    sub: userId,
    sid: sessionId,
    role: roleName,
  });

  const refreshTokenHash = hashToken(refreshToken);

  const sessionPayload = {
    tokenHash: refreshTokenHash,
    expiresAt: sessionExpiresAt,
    ipAddress,
    ...(userAgent ? { userAgent } : {}),
  };

  if (existingSessionId) {
    await authRepository.rotateSession(sessionId, sessionPayload);
  } else {
    await authRepository.createSession(userId, {
      id: sessionId,
      ...sessionPayload,
    });
  }

  return { accessToken, refreshToken };
};

const verifyMfaCodeOrRecoveryCode = async (
  userId: string,
  userMfaSecret: string | null,
  userMfaEnabled: boolean,
  code: string,
): Promise<{ usedRecoveryCode: boolean }> => {
  if (!userMfaEnabled || !userMfaSecret) {
    throw new AppError("MFA is not enabled for this account", 400);
  }

  let isCodeValid = false;
  let usedRecoveryCode = false;

  if (totp.isTotpCode(code)) {
    const rawSecret = decryptMfaSecret(userMfaSecret);
    const { valid, matchedWindow } = totp.verifyCode(rawSecret, code);
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
    const recoveryConsumed = await authRepository.verifyAndConsumeRecoveryCode(
      userId,
      codeHash,
    );
    if (recoveryConsumed) {
      isCodeValid = true;
      usedRecoveryCode = true;
    }
  }

  if (!isCodeValid) {
    throw new AppError("Invalid or expired MFA code or recovery code", 400);
  }

  return { usedRecoveryCode };
};

// ==========================================
// Public Services
// ==========================================

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
  ipAddress: string,
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

  const tokens = await generateAuthTokensAndSession(
    user.id,
    user.role.name,
    ipAddress,
    userAgent,
  );

  return {
    mfaRequired: false,
    tokens,
  };
};

const refreshToken = async (
  ipAddress: string,
  userAgent?: string,
  token?: string,
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

  const tokens = await generateAuthTokensAndSession(
    user.id,
    user.role.name,
    ipAddress,
    userAgent,
    session.id,
  );

  return tokens;
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

const resetPassword = async (
  input: ResetPasswordInput,
): Promise<{ mfaRequired: false } | { mfaRequired: true }> => {
  const tokenHash = hashToken(input.token);

  const resetToken =
    await authRepository.findPasswordResetTokenWithUser(tokenHash);
  if (!resetToken) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const { user } = resetToken;

  if (user.mfaEnabled) {
    if (!input.code) {
      return { mfaRequired: true };
    }

    await verifyMfaCodeOrRecoveryCode(
      user.id,
      user.mfaSecret,
      user.mfaEnabled,
      input.code,
    );
  }

  const newPasswordHash = await hashPassword(input.password);

  await authRepository.resetPasswordAndDeleteToken(user.id, newPasswordHash);

  return { mfaRequired: false };
};

const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
): Promise<{ mfaRequired: false } | { mfaRequired: true }> => {
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

  if (user.mfaEnabled) {
    if (!input.code) {
      return { mfaRequired: true };
    }

    await verifyMfaCodeOrRecoveryCode(
      user.id,
      user.mfaSecret,
      user.mfaEnabled,
      input.code,
    );
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await authRepository.changePassword(userId, newPasswordHash);

  return { mfaRequired: false };
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
  const encryptedSecret = encryptMfaSecret(secret);
  await authRepository.savePendingMfaSecret(userId, encryptedSecret);

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

  const rawSecret = decryptMfaSecret(user.mfaSecret);
  const { valid } = totp.verifyCode(rawSecret, input.code);
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

const mfaVerifyLogin = async (
  input: MfaVerifyLoginInput,
  ipAddress: string,
  userAgent?: string,
): Promise<{
  tokens: AuthTokens;
  lowRecoveryCodesWarning?: boolean;
  remainingRecoveryCodes?: number;
}> => {
  const challenge = await authRepository.findMfaChallengeById(input.mfaToken);
  if (!challenge) {
    throw new AppError("Invalid or expired MFA challenge", 400);
  }

  const { user } = challenge;

  const verificationResult = await verifyMfaCodeOrRecoveryCode(
    user.id,
    user.mfaSecret,
    user.mfaEnabled,
    input.code,
  );

  await authRepository.deleteMfaChallenge(input.mfaToken);

  let remainingRecoveryCodes: number | undefined;
  if (verificationResult.usedRecoveryCode) {
    remainingRecoveryCodes = await authRepository.countUnusedRecoveryCodes(
      user.id,
    );
  }

  const tokens = await generateAuthTokensAndSession(
    user.id,
    user.role.name,
    ipAddress,
    userAgent,
  );

  if (remainingRecoveryCodes !== undefined && remainingRecoveryCodes <= 2) {
    return {
      tokens,
      lowRecoveryCodesWarning: true,
      remainingRecoveryCodes,
    };
  }

  return { tokens };
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
