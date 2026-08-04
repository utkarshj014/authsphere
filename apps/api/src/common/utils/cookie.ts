import type { CookieOptions, Response } from "express";
import { env } from "../../config/env.js";

export const accessTokenCookieOptions: CookieOptions = {
  path: "/",
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  priority: "high",
  maxAge: env.JWT_ACCESS_EXPIRES_IN_MS,
};

export const refreshTokenCookieOptions: CookieOptions = {
  path: "/auth/refresh-token",
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  priority: "high",
  maxAge: env.JWT_REFRESH_EXPIRES_IN_MS,
};

export const setAuthCookies = (
  res: Response,
  authTokens: { accessToken: string; refreshToken: string },
) => {
  res.cookie("accessToken", authTokens.accessToken, accessTokenCookieOptions);
  res.cookie(
    "refreshToken",
    authTokens.refreshToken,
    refreshTokenCookieOptions,
  );
};

export const clearAuthCookies = (res: Response) => {
  const { maxAge: _noNeed1, ...clearAccessOptions } = accessTokenCookieOptions;
  const { maxAge: _noNeed2, ...clearRefreshOptions } =
    refreshTokenCookieOptions;

  res.clearCookie("accessToken", clearAccessOptions);
  res.clearCookie("refreshToken", clearRefreshOptions);
};
