import crypto from "node:crypto";
import type { Request, Response } from "express";
import { OAUTH_PROVIDERS, type OAuthProviderName } from "@authsphere/shared";
import { env } from "../../../config/env.js";
import {
  asyncHandler,
  AppError,
  UnauthorizedError,
} from "../../../common/errors/index.js";
import {
  initiateOAuth,
  handleOAuthCallback,
  unlinkOAuthAccount,
  consumeOAuthState,
} from "./oauth.service.js";
import type { OAuthStateData } from "./oauth.types.js";
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

    const returnToQuery = req.query.returnTo;
    let returnTo: string | undefined = undefined;
    if (
      typeof returnToQuery === "string" &&
      returnToQuery.startsWith("/") &&
      !returnToQuery.startsWith("//") &&
      !returnToQuery.startsWith("/\\")
    ) {
      returnTo = returnToQuery;
    }

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
      returnTo,
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
    const state = req.query.state as string | undefined;

    // 0. Handle provider error redirects (e.g., user clicked cancel at Google/GitHub consent)
    if (req.query.error) {
      if (state && typeof state === "string") {
        clearOAuthVerifierCookie(res, state);
      }

      let errorReturnTarget = "/login";
      if (state && typeof state === "string" && state.trim().length > 0) {
        try {
          const stateData = await consumeOAuthState(state, provider);
          errorReturnTarget =
            stateData.returnTo ||
            (stateData.userId ? "/app/security" : "/login");
        } catch {
          // Fallback to /login if state lookup fails
        }
      }

      return res.redirect(
        `${env.FRONTEND_URL}${errorReturnTarget}?error=${encodeURIComponent("Authentication cancelled")}`,
      );
    }

    if (state && typeof state === "string") {
      clearOAuthVerifierCookie(res, state);
    }

    if (!state || typeof state !== "string" || state.trim().length === 0) {
      throw new AppError("Invalid or missing OAuth state parameter", 400);
    }

    const cookieName = getOAuthVerifierCookieName(state);
    const codeVerifier = req.cookies?.[cookieName] as string | undefined;

    if (!codeVerifier) {
      throw new AppError("Missing or expired OAuth transaction cookie", 400);
    }

    const code = req.query.code as string;
    const ipAddress = getClientIp(req);
    const userAgent = req.header("user-agent");

    // Atomically consume state parameter from Redis to verify and determine return targets
    let stateData: OAuthStateData;
    try {
      stateData = await consumeOAuthState(state, provider);
    } catch (err: unknown) {
      if (err instanceof AppError && err.statusCode === 400) {
        throw err;
      }
      const errorMessage =
        err instanceof AppError
          ? err.message
          : "Authentication service is temporarily unavailable";
      return res.redirect(
        `${env.FRONTEND_URL}/login?error=${encodeURIComponent(errorMessage)}`,
      );
    }

    const returnTarget =
      stateData.returnTo || (stateData.userId ? "/app/security" : "/app");
    const errorTarget =
      stateData.returnTo || (stateData.userId ? "/app/security" : "/login");

    let result;
    try {
      result = await handleOAuthCallback(
        provider,
        code,
        stateData,
        ipAddress,
        userAgent,
        codeVerifier,
      );
    } catch (err: unknown) {
      if (err instanceof AppError && err.statusCode === 400) {
        throw err;
      }
      const errorMessage =
        err instanceof AppError ? err.message : "Authentication failed";
      return res.redirect(
        `${env.FRONTEND_URL}${errorTarget}?error=${encodeURIComponent(errorMessage)}`,
      );
    }

    if (result.mfaRequired) {
      return res.redirect(
        `${env.FRONTEND_URL}/login?mfa=true&mfaToken=${encodeURIComponent(result.mfaToken)}&provider=${encodeURIComponent(provider.toLowerCase())}`,
      );
    }

    setAuthCookies(res, result.tokens);

    if (result.isLinked) {
      return res.redirect(
        `${env.FRONTEND_URL}${returnTarget}?linked=${encodeURIComponent(provider.toLowerCase())}`,
      );
    }

    return res.redirect(
      `${env.FRONTEND_URL}${returnTarget === "/login" ? "/app" : returnTarget}`,
    );
  });

// Specific provider controller instances for explicit route mounting
export const googleInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GOOGLE);
export const googleCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GOOGLE);

export const githubInitiate = initiateOAuthHandler(OAUTH_PROVIDERS.GITHUB);
export const githubCallback = oauthCallbackHandler(OAUTH_PROVIDERS.GITHUB);

/**
 * Controller to unlink an OAuth provider from the authenticated user.
 */
export const unlinkOAuthHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { provider } = req.params as { provider: string };
    await unlinkOAuthAccount(userId, provider);

    const formattedProvider =
      provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();

    return res.status(200).json({
      success: true,
      message: `${formattedProvider} account disconnected successfully`,
      data: null,
    });
  },
);
