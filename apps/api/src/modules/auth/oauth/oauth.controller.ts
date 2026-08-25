import type { Request, Response } from "express";
import { OAUTH_PROVIDERS } from "@authsphere/shared";
import { asyncHandler } from "../../../common/errors/index.js";
import { initiateOAuth, handleOAuthCallback } from "./oauth.service.js";
import { ApiResponse } from "../../../common/responses/index.js";
import { setAuthCookies, getClientIp } from "../../../common/utils/index.js";

/**
 * GET /auth/oauth/google
 * Initiates Google OAuth flow.
 * Optional authentication via req.auth?.userId for account linking.
 */
export const googleInitiate = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    const redirectUrl = await initiateOAuth(OAUTH_PROVIDERS.GOOGLE, userId);

    return res.redirect(redirectUrl);
  },
);

/**
 * GET /auth/oauth/google/callback
 * Handles Google OAuth authorization code callback.
 */
export const googleCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const ipAddress = getClientIp(req);
    const userAgent = req.header("user-agent");

    const { tokens } = await handleOAuthCallback(
      OAUTH_PROVIDERS.GOOGLE,
      code,
      state,
      ipAddress,
      userAgent,
    );

    setAuthCookies(res, tokens);

    return ApiResponse.success(
      res,
      null,
      "Authenticated successfully via Google OAuth",
      200,
    );
  },
);
