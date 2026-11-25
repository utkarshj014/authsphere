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

export const clearAccessTokenCookie = (res: Response) => {
  const { maxAge: _noNeed, ...clearAccessOptions } = accessTokenCookieOptions;
  res.clearCookie("accessToken", clearAccessOptions);
};

export const clearRefreshTokenCookie = (res: Response) => {
  const { maxAge: _noNeed, ...clearRefreshOptions } = refreshTokenCookieOptions;
  res.clearCookie("refreshToken", clearRefreshOptions);
};

export const clearAuthCookies = (res: Response) => {
  clearAccessTokenCookie(res);
  clearRefreshTokenCookie(res);
};

export const OAUTH_VERIFIER_COOKIE_PREFIX = "oauth_verifier_";
export const OAUTH_VERIFIER_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export const getOAuthVerifierCookieName = (state: string): string =>
  `${OAUTH_VERIFIER_COOKIE_PREFIX}${state}`;

/**
 * Resolves the cookie path dynamically to match the callback route path.
 * In production via Vercel Edge Proxy, this resolves to /api/auth/oauth.
 * In local direct development (e.g. http://localhost:3000/auth/oauth), this resolves to /auth/oauth.
 */
export const getOAuthVerifierCookiePath = (): string => {
  const base =
    env.OAUTH_CALLBACK_BASE_URL || `${env.FRONTEND_URL}/api/auth/oauth`;
  try {
    return new URL(base).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "/api/auth/oauth";
  }
};

export const getOAuthVerifierCookieOptions = (): CookieOptions => ({
  path: getOAuthVerifierCookiePath(),
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: OAUTH_VERIFIER_COOKIE_MAX_AGE_MS,
});

export const setOAuthVerifierCookie = (
  res: Response,
  state: string,
  verifier: string,
): void => {
  res.cookie(
    getOAuthVerifierCookieName(state),
    verifier,
    getOAuthVerifierCookieOptions(),
  );
};

export const clearOAuthVerifierCookie = (
  res: Response,
  state: string,
): void => {
  const { maxAge: _noNeed, ...clearOptions } = getOAuthVerifierCookieOptions();
  res.clearCookie(getOAuthVerifierCookieName(state), clearOptions);
};
