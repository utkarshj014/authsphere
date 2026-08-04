import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/async-handler.js";
import { authService } from "./auth.service.js";
import {
  signupSchema,
  verifyEmailSchema,
  resendVerificationTokenSchema,
  loginSchema,
} from "./auth.validation.js";
import { ApiResponse } from "../../common/responses/api-response.js";
import { ValidationError } from "../../common/errors/validation-error.js";
import { formatZodError } from "../../common/errors/format-zod-error.js";
import { setAuthCookies, clearAuthCookies } from "../../common/utils/cookie.js";
import { authRepository } from "./auth.repository.js";

export const signupController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = signupSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    await authService.signup(input.data);

    return ApiResponse.success(
      res,
      null,
      "Signed up successfully. Please verify your email",
      201,
    );
  },
);

export const verifyEmailController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = verifyEmailSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    await authService.verifyEmail(input.data);

    return ApiResponse.success(res, null, "Email verified successfully", 200);
  },
);

export const resendVerificationTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = resendVerificationTokenSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    await authService.resendVerificationToken(input.data);

    return ApiResponse.success(
      res,
      null,
      "If an account exists and is unverified, a verification email has been sent",
      200,
    );
  },
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    const ipAddress = req.ip;
    const userAgent = req.header("user-agent");

    const authTokens = await authService.login(
      input.data,
      ipAddress,
      userAgent,
    );

    setAuthCookies(res, authTokens);

    return ApiResponse.success(res, null, "Login successful", 200);
  },
);

export const refreshTokenController = asyncHandler(
  async (req: Request, res: Response) => {
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
  },
);

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    await authService.logout(refreshToken);

    clearAuthCookies(res);

    return ApiResponse.success(res, null, "Logout successful", 200);
  },
);

export const logoutAllController = asyncHandler(
  async (req: Request, res: Response) => {
    const accessToken = req.cookies.accessToken;

    await authService.logoutAll(accessToken);

    clearAuthCookies(res);

    return ApiResponse.success(res, null, "Logout all successful", 200);
  },
);

export const getMeController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await authService.getMe(req.userId);

    return ApiResponse.success(res, user, "User fetched successfully", 200);
  },
);
