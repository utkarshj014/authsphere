import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/async-handler.js";
import { authService } from "./auth.service.js";
import { ApiResponse } from "../../common/responses/api-response.js";
import { setAuthCookies, clearAuthCookies } from "../../common/utils/cookie.js";

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
  const ipAddress = req.ip;
  const userAgent = req.header("user-agent");

  const authTokens = await authService.login(req.body, ipAddress, userAgent);

  setAuthCookies(res, authTokens);

  return ApiResponse.success(res, null, "Login successful", 200);
});

const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  const ipAddress = req.ip;
  const userAgent = req.header("user-agent");

  const authTokens = await authService.refreshToken(
    refreshToken,
    ipAddress,
    userAgent,
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
  await authService.resetPassword(req.body);

  return ApiResponse.success(res, null, "Password reset successful", 200);
});

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;

  await authService.changePassword(userId, req.body);

  clearAuthCookies(res);

  return ApiResponse.success(res, null, "Password changed successfully", 200);
});

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
};
