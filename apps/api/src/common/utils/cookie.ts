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
  path: "/",
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

export const OAUTH_VERIFIER_COOKIE_PREFIX = "oauth_verifier_";
export const OAUTH_VERIFIER_COOKIE_PATH = "/api/auth/oauth";
export const OAUTH_VERIFIER_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export const getOAuthVerifierCookieName = (state: string): string =>
  `${OAUTH_VERIFIER_COOKIE_PREFIX}${state}`;

export const oauthVerifierCookieOptions: CookieOptions = {
  path: OAUTH_VERIFIER_COOKIE_PATH,
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: OAUTH_VERIFIER_COOKIE_MAX_AGE_MS,
};

export const setOAuthVerifierCookie = (
  res: Response,
  state: string,
  verifier: string,
): void => {
  res.cookie(
    getOAuthVerifierCookieName(state),
    verifier,
    oauthVerifierCookieOptions,
  );
};

export const clearOAuthVerifierCookie = (
  res: Response,
  state: string,
): void => {
  const { maxAge: _noNeed, ...clearOptions } = oauthVerifierCookieOptions;
  res.clearCookie(getOAuthVerifierCookieName(state), clearOptions);
};
