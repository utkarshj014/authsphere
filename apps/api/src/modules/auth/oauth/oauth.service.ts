import crypto from "node:crypto";
import type { OAuthProviderName } from "@authsphere/shared";
import { redis } from "../../../lib/redis.js";
import { AppError } from "../../../common/errors/index.js";
import type { OAuthStateData } from "./oauth.types.js";

const OAUTH_STATE_PREFIX = "oauth:state:";
const OAUTH_STATE_TTL_SECONDS = 600; // 10 minutes

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
