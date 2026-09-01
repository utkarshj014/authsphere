import crypto from "node:crypto";
import {
  ROLES,
  OAUTH_PROVIDERS,
  SECURITY_EVENT_TYPES,
  type OAuthProviderName,
  type RoleName,
} from "@authsphere/shared";
import type { OAuthProvider } from "../../../generated/prisma/client.js";
import { redis } from "../../../lib/redis.js";
import { AppError } from "../../../common/errors/index.js";
import { authRepository } from "../auth.repository.js";
import {
  generateAuthTokensAndSession,
  recordSecurityEvent,
} from "../auth.service.js";
import { googleOAuthProvider } from "./google.provider.js";
import { githubOAuthProvider } from "./github.provider.js";
import type { AuthTokens } from "../auth.types.js";
import type { OAuthProviderStrategy, OAuthStateData } from "./oauth.types.js";

const OAUTH_STATE_PREFIX = "oauth:state:";
const OAUTH_STATE_TTL_SECONDS = 600; // 10 minutes

/**
 * Helper to select the appropriate OAuth provider strategy based on provider name.
 */
const getOAuthStrategy = (
  provider: OAuthProviderName,
): OAuthProviderStrategy => {
  switch (provider) {
    case OAUTH_PROVIDERS.GOOGLE:
      return googleOAuthProvider;
    case OAUTH_PROVIDERS.GITHUB:
      return githubOAuthProvider;
    default:
      throw new AppError(`OAuth provider ${provider} is not supported`, 400);
  }
};

/**
 * Generates a cryptographically random OAuth state parameter, stores flow metadata in Redis with a 10m TTL,
 * and returns the state string.
 */
export const createOAuthState = async (
  provider: OAuthProviderName,
  userId?: string,
): Promise<string> => {
  const state = crypto.randomBytes(32).toString("hex");
  const key = `${OAUTH_STATE_PREFIX}${state}`;

  const payload: OAuthStateData = {
    provider,
    ...(userId && { userId }),
  };

  await redis.set(key, JSON.stringify(payload), {
    EX: OAUTH_STATE_TTL_SECONDS,
  });

  return state;
};

/**
 * Atomically retrieves and deletes the OAuth state parameter from Redis via GETDEL.
 * Ensures the state parameter is valid, non-expired, single-use, and bound to the expected provider.
 */
export const consumeOAuthState = async (
  state: string,
  expectedProvider: OAuthProviderName,
): Promise<OAuthStateData> => {
  if (!state || typeof state !== "string" || state.trim().length === 0) {
    throw new AppError("Invalid or missing OAuth state parameter", 400);
  }

  const key = `${OAUTH_STATE_PREFIX}${state}`;

  // Atomic fetch & delete to prevent replay attacks
  const rawData = await redis.getDel(key);

  if (!rawData) {
    throw new AppError(
      "Invalid, expired, or already consumed OAuth state",
      400,
    );
  }

  let data: OAuthStateData;
  try {
    data = JSON.parse(rawData) as OAuthStateData;
  } catch {
    throw new AppError("Corrupted OAuth state payload", 400);
  }

  if (data.provider !== expectedProvider) {
    throw new AppError("OAuth state provider mismatch", 400);
  }

  return data;
};

/**
 * Initiates an OAuth 2.0 authorization flow by generating a state parameter and building the provider's authorization URL.
 */
export const initiateOAuth = async (
  provider: OAuthProviderName,
  userId?: string,
): Promise<string> => {
  const state = await createOAuthState(provider, userId);
  const strategy = getOAuthStrategy(provider);
  const authUrl = await strategy.getAuthorizationUrl(state);

  return authUrl.toString();
};

/**
 * Handles the OAuth 2.0 callback: verifies state, exchanges authorization code for provider profile,
 * resolves identity (linking vs signup vs login), and issues AuthSphere session tokens.
 */
export const handleOAuthCallback = async (
  provider: OAuthProviderName,
  code: string,
  state: string,
  ipAddress: string,
  userAgent?: string,
): Promise<
  | { mfaRequired: false; tokens: AuthTokens }
  | { mfaRequired: true; mfaToken: string }
> => {
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    throw new AppError("Missing or invalid authorization code", 400);
  }

  // 1. Atomically consume & verify state parameter from Redis
  const stateData = await consumeOAuthState(state, provider);

  // 2. Fetch normalized profile from provider strategy
  const strategy = getOAuthStrategy(provider);
  const profile = await strategy.getUserProfile(code);

  const prismaProvider = provider as OAuthProvider;

  // 3. Query existing OAuthAccount
  const existingOAuthAccount = await authRepository.findOAuthAccount(
    prismaProvider,
    profile.providerId,
  );

  let userToAuthenticate: {
    id: string;
    role: { name: RoleName };
    mfaEnabled: boolean;
  };

  if (existingOAuthAccount) {
    // Case A: Existing OAuthAccount found
    if (stateData.userId && existingOAuthAccount.userId !== stateData.userId) {
      throw new AppError(
        "This OAuth account is already linked to another user",
        409,
      );
    }

    userToAuthenticate = existingOAuthAccount.user;
  } else if (stateData.userId) {
    // Case B1: Explicit Account-Linking for authenticated user
    const user = await authRepository.findUserById(stateData.userId);
    if (!user) {
      throw new AppError("User account not found for linking", 404);
    }

    await authRepository.createOAuthAccount(
      user.id,
      prismaProvider,
      profile.providerId,
    );

    userToAuthenticate = user;
  } else {
    // Case B2: Unauthenticated OAuth Login / Signup Flow
    const existingUserByEmail = await authRepository.findUserByEmailWithRole(
      profile.email,
    );

    if (existingUserByEmail) {
      // SECURITY BOUNDARY: Do NOT auto-link accounts by email alone!
      throw new AppError(
        "An account with this email already exists. Please log in with your password and link your account in settings.",
        409,
      );
    }

    // Create new User + OAuthAccount atomically
    const defaultRole = await authRepository.findRoleByName(ROLES.USER);
    if (!defaultRole) {
      throw new AppError("Default user role is not configured", 500);
    }

    const newUser = await authRepository.createUserWithOAuthAccount(
      {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        roleId: defaultRole.id,
      },
      prismaProvider,
      profile.providerId,
    );

    userToAuthenticate = newUser;
  }

  // 4. If user has MFA enabled (and not an in-session account linking flow)
  if (userToAuthenticate.mfaEnabled && !stateData.userId) {
    const challengeExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const challenge = await authRepository.createMfaChallenge(
      userToAuthenticate.id,
      challengeExpiresAt,
    );

    await recordSecurityEvent(
      userToAuthenticate.id,
      SECURITY_EVENT_TYPES.OAUTH_LOGIN,
      ipAddress,
      userAgent,
      { provider, mfaRequired: true },
    );

    return {
      mfaRequired: true,
      mfaToken: challenge.id,
    };
  }

  // 5. Issue AuthSphere session & return tokens
  const tokens = await generateAuthTokensAndSession(
    userToAuthenticate.id,
    userToAuthenticate.role.name,
    ipAddress,
    userAgent,
  );

  await recordSecurityEvent(
    userToAuthenticate.id,
    SECURITY_EVENT_TYPES.OAUTH_LOGIN,
    ipAddress,
    userAgent,
    { provider },
  );

  return {
    mfaRequired: false,
    tokens,
  };
};
