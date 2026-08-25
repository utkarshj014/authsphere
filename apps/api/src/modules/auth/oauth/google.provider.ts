import { env } from "../../../config/env.js";
import { AppError } from "../../../common/errors/index.js";
import { logger } from "../../../lib/logger.js";
import type { OAuthProfile, OAuthProviderStrategy } from "./oauth.types.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class GoogleOAuthProvider implements OAuthProviderStrategy {
  private getRedirectUri(): string {
    return `${env.OAUTH_CALLBACK_BASE_URL.replace(/\/$/, "")}/google/callback`;
  }

  private validateConfig(): void {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AppError("Google OAuth is not configured on this server", 500);
    }
  }

  public async getAuthorizationUrl(state: string): Promise<URL> {
    this.validateConfig();

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");

    return url;
  }

  public async getUserProfile(code: string): Promise<OAuthProfile> {
    this.validateConfig();

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      throw new AppError("Missing or invalid Google authorization code", 400);
    }

    // 1. Exchange authorization code for Google access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: this.getRedirectUri(),
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error(
        { provider: "google", status: tokenResponse.status, errorText },
        "Google authorization code exchange failed",
      );
      throw new AppError("Google authorization failed", 400);
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenData.access_token) {
      logger.error(
        { provider: "google" },
        "Google token response did not contain access_token",
      );
      throw new AppError("Google authorization failed", 400);
    }

    // 2. Fetch user profile from Google UserInfo endpoint
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userInfoResponse.ok) {
      logger.error(
        { provider: "google", status: userInfoResponse.status },
        "Failed to fetch user profile from Google",
      );
      throw new AppError("Failed to retrieve Google user profile", 400);
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    if (!userInfo.sub || !userInfo.email) {
      throw new AppError(
        "Google user profile missing required sub or email",
        400,
      );
    }

    // 3. Enforce email verification check
    if (userInfo.email_verified !== true) {
      throw new AppError("Google account email is not verified", 400);
    }

    // 4. Normalize into OAuthProfile
    const firstName =
      userInfo.given_name || userInfo.name?.split(" ")[0] || null;
    const lastName =
      userInfo.family_name ||
      (userInfo.name && userInfo.name.split(" ").length > 1
        ? userInfo.name.split(" ").slice(1).join(" ")
        : null);

    return {
      providerId: userInfo.sub,
      email: userInfo.email.toLowerCase().trim(),
      firstName,
      lastName,
      avatarUrl: userInfo.picture || null,
    };
  }
}

export const googleOAuthProvider = new GoogleOAuthProvider();
