import type { OAuthProviderName } from "@authsphere/shared";

export interface OAuthStateData {
  provider: OAuthProviderName;
  userId?: string;
}

export interface OAuthProfile {
  providerId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface OAuthProviderStrategy {
  getAuthorizationUrl(state: string): Promise<URL>;
  getUserProfile(code: string): Promise<OAuthProfile>;
}
