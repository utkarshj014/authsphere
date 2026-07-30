import type { CookieOptions } from "express";
import { env } from "../../config/env.js";

export const accessTokenCookieOptions: CookieOptions = {
  path: "/",
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  priority: "high",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const refreshTokenCookieOptions: CookieOptions = {
  path: "/auth/refresh-token",
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  priority: "high",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
