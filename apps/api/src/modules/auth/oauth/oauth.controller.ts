import type { Request, Response } from "express";
import { OAUTH_PROVIDERS, type OAuthProviderName } from "@authsphere/shared";
import { asyncHandler } from "../../../common/errors/index.js";
import { initiateOAuth, handleOAuthCallback } from "./oauth.service.js";
import { ApiResponse } from "../../../common/responses/index.js";
import { setAuthCookies, getClientIp } from "../../../common/utils/index.js";

/**
 * Higher-order controller factory for initiating OAuth flows.
 */
export const initiateOAuthHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    const redirectUrl = await initiateOAuth(provider, userId);

    return res.redirect(redirectUrl);
  });

/**
 * Higher-order controller factory for handling OAuth authorization callbacks.
 */
export const oauthCallbackHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const ipAddress = getClientIp(req);
    const userAgent = req.header("user-agent");

    const { tokens } = await handleOAuthCallback(
      provider,
      code,
      state,
      ipAddress,
      userAgent,
    );

    setAuthCookies(res, tokens);

    const providerLabel = provider.charAt(0) + provider.slice(1).toLowerCase();

    return ApiResponse.success(
      res,
      null,
      `Authenticated successfully via ${providerLabel} OAuth`,
      200,
    );
  });

// Specific provider controller instances for explicit route mounting
export const googleInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GOOGLE);
export const googleCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GOOGLE);

export const githubInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GITHUB);
export const githubCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GITHUB);
