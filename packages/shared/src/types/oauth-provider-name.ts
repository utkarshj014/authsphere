import { OAUTH_PROVIDERS } from "../constants/index.js";

export type OAuthProviderName =
  (typeof OAUTH_PROVIDERS)[keyof typeof OAUTH_PROVIDERS];
