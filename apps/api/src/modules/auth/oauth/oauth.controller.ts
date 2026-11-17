import crypto from "node:crypto";
import type { Request, Response } from "express";
import { OAUTH_PROVIDERS, type OAuthProviderName } from "@authsphere/shared";
import { env } from "../../../config/env.js";
import { asyncHandler, AppError } from "../../../common/errors/index.js";
import { initiateOAuth, handleOAuthCallback } from "./oauth.service.js";
import {
  setAuthCookies,
  getClientIp,
  getOAuthVerifierCookieName,
  setOAuthVerifierCookie,
  clearOAuthVerifierCookie,
} from "../../../common/utils/index.js";

/**
 * Higher-order controller factory for initiating OAuth flows.
 */
export const initiateOAuthHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    const sessionId = req.auth?.sessionId;

    // 1. Generate 32-byte cryptographically random verifier (base64url)
    const verifier = crypto.randomBytes(32).toString("base64url");

    // 2. Compute S256 code challenge
    const challenge = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");

    // 3. Initiate OAuth with provider
    const { redirectUrl, state } = await initiateOAuth(
      provider,
      userId,
      sessionId,
      challenge,
    );

    // 4. Store verifier in per-transaction HttpOnly cookie scoped to browser edge path (/api/auth/oauth)
    setOAuthVerifierCookie(res, state, verifier);

    return res.redirect(redirectUrl);
  });

/**
 * Higher-order controller factory for handling OAuth authorization callbacks.
 */
export const oauthCallbackHandler = (provider: OAuthProviderName) =>
  asyncHandler(async (req: Request, res: Response) => {
    // 0. Handle provider error redirects (e.g., user clicked cancel at Google/GitHub consent)
    if (req.query.error) {
      const errorDescription =
        req.query.error_description ||
        req.query.error ||
        "Authentication cancelled";
      return res.redirect(
        `${env.FRONTEND_URL}/login?error=${encodeURIComponent(String(errorDescription))}`,
      );
    }

    const code = req.query.code as string;
    const state = req.query.state as string;
    const ipAddress = getClientIp(req);
    const userAgent = req.header("user-agent");

    if (!state || typeof state !== "string" || state.trim().length === 0) {
      throw new AppError("Invalid or missing OAuth state parameter", 400);
    }

    // 1. Extract and clear the transaction-specific PKCE verifier cookie
    const cookieName = getOAuthVerifierCookieName(state);
    const codeVerifier = req.cookies?.[cookieName] as string | undefined;

    clearOAuthVerifierCookie(res, state);

    if (!codeVerifier) {
      throw new AppError("Missing or expired OAuth transaction cookie", 400);
    }

    const result = await handleOAuthCallback(
      provider,
      code,
      state,
      ipAddress,
      userAgent,
      codeVerifier,
    );

    if (result.mfaRequired) {
      return res.redirect(
        `${env.FRONTEND_URL}/login?mfa=true&mfaToken=${encodeURIComponent(result.mfaToken)}&provider=${encodeURIComponent(provider.toLowerCase())}`,
      );
    }

    setAuthCookies(res, result.tokens);

    if (result.isLinked) {
      return res.redirect(
        `${env.FRONTEND_URL}/app/security?linked=${encodeURIComponent(provider.toLowerCase())}`,
      );
    }

    return res.redirect(`${env.FRONTEND_URL}/app`);
  });

// Specific provider controller instances for explicit route mounting
export const googleInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GOOGLE);
export const googleCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GOOGLE);

export const githubInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GITHUB);
export const githubCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GITHUB);
