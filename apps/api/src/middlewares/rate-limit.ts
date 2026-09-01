import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { TooManyRequestsError } from "../common/errors/index.js";
import { getClientIp } from "../common/utils/index.js";

export type RateLimitKeyType = "ip" | "user";

export interface RateLimitPolicy {
  name: string;
  limit: number;
  windowMs: number;
  keyType?: RateLimitKeyType;
  keyGenerator?: (req: Request) => string | Promise<string>;
  message?: string;
}

/** Predefined rate-limiting policy profiles for application endpoints */
export const RATE_LIMIT_POLICIES = {
  GLOBAL: {
    name: "global-api",
    limit: 100,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  HEALTH: {
    name: "health-check",
    limit: 60,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  SIGNUP: {
    name: "auth-signup",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "ip",
  },
  VERIFY_EMAIL: {
    name: "auth-verify-email",
    limit: 10,
    windowMs: 5 * 60 * 1000,
    keyType: "ip",
  },
  RESEND_VERIFICATION: {
    name: "auth-resend-verification",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "ip",
  },
  LOGIN: {
    name: "auth-login",
    limit: 10,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  REFRESH_TOKEN: {
    name: "auth-refresh-token",
    limit: 30,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  FORGOT_PASSWORD: {
    name: "auth-forgot-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "ip",
  },
  RESET_PASSWORD: {
    name: "auth-reset-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "ip",
  },
  CHANGE_PASSWORD: {
    name: "auth-change-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "user",
  },
  MFA_VERIFY: {
    name: "auth-mfa-verify",
    limit: 10,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  MFA_VERIFY_SETUP: {
    name: "auth-mfa-verify-setup",
    limit: 5,
    windowMs: 5 * 60 * 1000,
    keyType: "user",
  },
  MFA_DISABLE: {
    name: "auth-mfa-disable",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "user",
  },
  MFA_REGENERATE_RECOVERY_CODES: {
    name: "auth-mfa-regenerate-codes",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "user",
  },
  MAGIC_LINK_REQUEST: {
    name: "auth-magic-link-request",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyType: "ip",
  },
  MAGIC_LINK_VERIFY: {
    name: "auth-magic-link-verify",
    limit: 10,
    windowMs: 5 * 60 * 1000,
    keyType: "ip",
  },
  OAUTH_INITIATE: {
    name: "auth-oauth-initiate",
    limit: 20,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  OAUTH_CALLBACK: {
    name: "auth-oauth-callback",
    limit: 20,
    windowMs: 60 * 1000,
    keyType: "ip",
  },
  USER_READ: {
    name: "users-read",
    limit: 60,
    windowMs: 60 * 1000,
    keyType: "user",
  },
  USER_CHANGE_ROLE: {
    name: "users-change-role",
    limit: 10,
    windowMs: 60 * 1000,
    keyType: "user",
  },
  ROLE_UPDATE_PERMISSIONS: {
    name: "roles-update-permissions",
    limit: 10,
    windowMs: 60 * 1000,
    keyType: "user",
  },
  SESSIONS_READ: {
    name: "sessions-read",
    limit: 60,
    windowMs: 60 * 1000,
    keyType: "user",
  },
  SESSION_REVOKE: {
    name: "session-revoke",
    limit: 20,
    windowMs: 60 * 1000,
    keyType: "user",
  },
  SECURITY_EVENTS_READ: {
    name: "security-events-read",
    limit: 60,
    windowMs: 60 * 1000,
    keyType: "user",
  },
} as const satisfies Record<string, RateLimitPolicy>;

/** Reusable Express middleware factory for enforcing Redis-backed fixed-window rate limits */
export const rateLimiter = (policy: RateLimitPolicy) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Fail-open resilience check: bypass rate limiter if Redis is offline
    if (!redis.isOpen) {
      logger.warn(
        { policy: policy.name, url: req.originalUrl },
        "Redis client offline; bypassing rate limiter",
      );
      return next();
    }

    try {
      // 2. Resolve client key identifier (custom generator -> authenticated user ID -> IP address)
      const clientIp = getClientIp(req);
      const identifier = policy.keyGenerator
        ? await policy.keyGenerator(req)
        : policy.keyType === "user"
          ? req.auth?.userId || clientIp
          : clientIp;

      // 3. Fixed-window bucket computation & exact TTL to bucket boundary
      const now = Date.now();
      const bucket = Math.floor(now / policy.windowMs);
      const redisKey = `rl:${policy.name}:${identifier}:${bucket}`;
      const nextWindowMs = (bucket + 1) * policy.windowMs;
      const secondsRemainingInWindow = Math.ceil((nextWindowMs - now) / 1000);

      // 4. Atomic execution of counter increment and expiration in Redis using EVALSHA script
      const [count = 0, ttl = 0] = await redis.rateLimitIncrExpire(
        redisKey,
        secondsRemainingInWindow,
      );

      const resetSec = ttl > 0 ? ttl : Math.max(1, secondsRemainingInWindow);
      const remaining = Math.max(0, policy.limit - count);

      // 5. Set standard IETF RateLimit response headers (included on all responses)
      res.set({
        "RateLimit-Limit": String(policy.limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(resetSec),
      });

      // 6. Enforce quota threshold: set Retry-After header and throw 429 error on breach
      if (count > policy.limit) {
        res.setHeader("Retry-After", String(resetSec));
        logger.warn(
          {
            policy: policy.name,
            identifier,
            count,
            limit: policy.limit,
            resetSec,
          },
          "Rate limit exceeded",
        );
        return next(
          new TooManyRequestsError(
            policy.message || "Too many requests, please try again later.",
          ),
        );
      }

      return next();
    } catch (err) {
      // 7. Fail-open fallback: log operational errors without blocking app availability
      logger.error(
        { err, policy: policy.name, url: req.originalUrl },
        "Rate limiter error - failing open",
      );
      return next();
    }
  };
};
