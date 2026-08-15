import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/index.js";
import { authService } from "./auth.service.js";
import { ApiResponse } from "../../common/responses/index.js";
import {
  setAuthCookies,
  clearAuthCookies,
  getClientIp,
} from "../../common/utils/index.js";

const signup = asyncHandler(async (req: Request, res: Response) => {
  await authService.signup(req.body);

  return ApiResponse.success(
    res,
    null,
    "Signed up successfully. Please verify your email",
    201,
  );
});

const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body);

  return ApiResponse.success(res, null, "Email verified successfully", 200);
});

const resendVerificationToken = asyncHandler(
  async (req: Request, res: Response) => {
    await authService.resendVerificationToken(req.body);

    return ApiResponse.success(
      res,
      null,
      "If an account exists with this email and is unverified, a verification email has been sent",
      200,
    );
  },
);

const login = asyncHandler(async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.header("user-agent");

  const result = await authService.login(req.body, ipAddress, userAgent);

  if (result.mfaRequired) {
    return ApiResponse.success(
      res,
      { mfaRequired: true, mfaToken: result.mfaToken },
      "MFA verification required",
      200,
    );
  }

  setAuthCookies(res, result.tokens);

  return ApiResponse.success(res, null, "Login successful", 200);
});

const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  const ipAddress = getClientIp(req);
  const userAgent = req.header("user-agent");

  // Cannot pass the required parameter (ipAddress) after the optional parameters
  // So, passing ipAddress first then userAgent and refreshToken
  const authTokens = await authService.refreshToken(
    ipAddress,
    userAgent,
    refreshToken,
  );

  setAuthCookies(res, authTokens);

  return ApiResponse.success(res, null, "Refresh token successful", 200);
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  await authService.logout(refreshToken);

  clearAuthCookies(res);

  return ApiResponse.success(res, null, "Logout successful", 200);
});

const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  await authService.logoutAll(userId);

  clearAuthCookies(res);

  return ApiResponse.success(res, null, "Logout all successful", 200);
});

const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const user = await authService.getCurrentUser(userId);

  return ApiResponse.success(res, user, "User fetched successfully", 200);
});

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body);

  return ApiResponse.success(
    res,
    null,
    "If an account exists with this email, a password reset email has been sent",
    200,
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body);

  if (result.mfaRequired) {
    return ApiResponse.success(
      res,
      result,
      "MFA verification required to reset password",
      200,
    );
  }

  return ApiResponse.success(res, null, "Password reset successful", 200);
});

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const result = await authService.changePassword(userId, req.body);

  if (result.mfaRequired) {
    return ApiResponse.success(
      res,
      result,
      "MFA verification required to change password",
      200,
    );
  }

  clearAuthCookies(res);

  return ApiResponse.success(res, null, "Password changed successfully", 200);
});

const mfaSetup = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const result = await authService.mfaSetup(userId);

  return ApiResponse.success(
    res,
    result,
    "MFA setup initiated successfully",
    200,
  );
});

const mfaVerifySetup = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  const result = await authService.mfaVerifySetup(userId, req.body);

  return ApiResponse.success(
    res,
    result,
    "MFA enabled successfully. Store these recovery codes securely",
    200,
  );
});

const mfaVerifyLogin = asyncHandler(async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.header("user-agent");

  const result = await authService.mfaVerifyLogin(
    req.body,
    ipAddress,
    userAgent,
  );

  setAuthCookies(res, result.tokens);

  const responseData =
    result.lowRecoveryCodesWarning !== undefined
      ? {
          lowRecoveryCodesWarning: result.lowRecoveryCodesWarning,
          remainingRecoveryCodes: result.remainingRecoveryCodes,
        }
      : null;

  return ApiResponse.success(res, responseData, "Login successful", 200);
});

const mfaDisable = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  await authService.mfaDisable(userId, req.body);

  clearAuthCookies(res);

  return ApiResponse.success(
    res,
    null,
    "MFA disabled successfully. All active sessions have been revoked",
    200,
  );
});

const mfaRegenerateRecoveryCodes = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.auth.userId;

    const result = await authService.mfaRegenerateRecoveryCodes(
      userId,
      req.body,
    );

    return ApiResponse.success(
      res,
      result,
      "New recovery codes generated successfully. Store these codes securely",
      200,
    );
  },
);

export const authController = {
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
  mfaSetup,
  mfaVerifySetup,
  mfaVerifyLogin,
  mfaDisable,
  mfaRegenerateRecoveryCodes,
};
