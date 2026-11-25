import type { OAuthProviderName } from "@authsphere/shared";

export interface OAuthStateData {
  provider: OAuthProviderName;
  userId?: string | undefined;
  sessionId?: string | undefined;
  returnTo?: string | undefined;
}

export interface OAuthProfile {
  providerId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface OAuthProviderStrategy {
  getAuthorizationUrl(state: string, codeChallenge?: string): Promise<URL>;
  getUserProfile(
    code: string,
    codeVerifier?: string,
    signal?: AbortSignal,
  ): Promise<OAuthProfile>;
}
