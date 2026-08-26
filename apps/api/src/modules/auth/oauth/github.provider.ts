import { env } from "../../../config/env.js";
import { AppError } from "../../../common/errors/index.js";
import { logger } from "../../../lib/logger.js";
import type { OAuthProfile, OAuthProviderStrategy } from "./oauth.types.js";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export class GitHubOAuthProvider implements OAuthProviderStrategy {
  private getRedirectUri(): string {
    return `${env.OAUTH_CALLBACK_BASE_URL.replace(/\/$/, "")}/github/callback`;
  }

  private validateConfig(): void {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new AppError("GitHub OAuth is not configured on this server", 500);
    }
  }

  public async getAuthorizationUrl(state: string): Promise<URL> {
    this.validateConfig();

    const url = new URL(GITHUB_AUTH_URL);
    url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
    url.searchParams.set("redirect_uri", this.getRedirectUri());
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);

    return url;
  }

  public async getUserProfile(code: string): Promise<OAuthProfile> {
    this.validateConfig();

    // Defense-in-depth: Validate authorization code independently of caller
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      throw new AppError("Missing or invalid GitHub authorization code", 400);
    }

    // 1. Exchange authorization code for GitHub access token
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        redirect_uri: this.getRedirectUri(),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error(
        { provider: "github", status: tokenResponse.status, errorText },
        "GitHub authorization code exchange failed",
      );
      throw new AppError("GitHub authorization failed", 400);
    }

    const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

    if (tokenData.error || !tokenData.access_token) {
      logger.error(
        {
          provider: "github",
          error: tokenData.error,
          description: tokenData.error_description,
        },
        "GitHub token response contains error or missing access_token",
      );
      throw new AppError("GitHub authorization failed", 400);
    }

    const accessToken = tokenData.access_token;
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "AuthSphere-API",
    };

    // 2. Fetch User Profile from GitHub API
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: authHeaders,
    });

    if (!userResponse.ok) {
      logger.error(
        { provider: "github", status: userResponse.status },
        "Failed to fetch user profile from GitHub",
      );
      throw new AppError("Failed to retrieve GitHub user profile", 400);
    }

    const githubUser = (await userResponse.json()) as GitHubUserResponse;

    if (!githubUser.id) {
      logger.error({ provider: "github" }, "GitHub user response missing ID");
      throw new AppError("GitHub user profile missing required ID", 400);
    }

    // 3. Resolve Primary & Verified Email
    // Always fetch /user/emails to confirm verification status,
    // because /user endpoint does not expose email_verified
    let selectedEmail: string | null = null;

    const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
      headers: authHeaders,
    });

    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as GitHubEmailResponse[];

      // Priority 1: Primary AND Verified email
      const primaryVerified = emails.find((e) => e.primary && e.verified);
      if (primaryVerified) {
        selectedEmail = primaryVerified.email;
      } else {
        // Priority 2: Any Verified email
        const anyVerified = emails.find((e) => e.verified);
        if (anyVerified) {
          selectedEmail = anyVerified.email;
        }
      }
    }

    // Reject if no verified email exists for this GitHub account
    if (!selectedEmail) {
      logger.error(
        { provider: "github", githubId: githubUser.id },
        "GitHub account has no verified email address",
      );
      throw new AppError("GitHub account has no verified email address", 400);
    }

    // 4. Parse Name & Normalize into OAuthProfile
    const fullName = githubUser.name || githubUser.login;
    const nameParts = fullName.trim().split(" ");
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    return {
      providerId: String(githubUser.id),
      email: selectedEmail.toLowerCase().trim(),
      firstName,
      lastName,
      avatarUrl: githubUser.avatar_url || null,
    };
  }
}

export const githubOAuthProvider = new GitHubOAuthProvider();
