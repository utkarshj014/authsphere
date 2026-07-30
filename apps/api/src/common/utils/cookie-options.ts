import type { CookieOptions } from "express";
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
