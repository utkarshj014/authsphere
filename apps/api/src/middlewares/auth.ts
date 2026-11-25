import type { Request, Response, NextFunction } from "express";
import { asyncHandler, UnauthorizedError } from "../common/errors/index.js";
import { verifyAccessToken } from "../lib/jwt/index.js";
import { authorizationService } from "../modules/authorization/index.js";
import { redis } from "../lib/redis.js";
import {
  clearAccessTokenCookie,
  clearAuthCookies,
} from "../common/utils/index.js";
import { logger } from "../lib/logger.js";

export const auth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
      throw new UnauthorizedError("No access token provided");
    }

    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch (err) {
      clearAccessTokenCookie(res);
      throw err;
    }

    let cachedPerms: string | null | undefined = undefined;

    if (redis.status === "ready") {
      try {
        const [isRevoked, userRevokedAtStr, permsData] = await redis.mget(
          `auth:revoked-session:${payload.sid}`,
          `auth:user-revoked-at:${payload.sub}`,
          `role:permissions:${payload.role}`,
        );

        if (isRevoked) {
          clearAuthCookies(res);
          throw new UnauthorizedError("Session has been revoked");
        }

        if (userRevokedAtStr) {
          const userRevokedAt = parseInt(userRevokedAtStr, 10);
          const tokenIssuedAt = payload.iat ?? 0;
          if (tokenIssuedAt <= userRevokedAt) {
            clearAuthCookies(res);
            throw new UnauthorizedError("Session has been revoked");
          }
        }

        cachedPerms = permsData;
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          throw err;
        }
        logger.error(
          { err },
          "Error checking session revocation via Redis mget",
        );
      }
    }

    const permissions = await authorizationService.getPermissionsByRole(
      payload.role,
      cachedPerms,
    );

    req.auth = {
      userId: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
      permissions,
    };

    next();
  },
);

export const optionalAuth = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
      return next();
    }

    try {
      let payload;
      try {
        payload = await verifyAccessToken(accessToken);
      } catch (err) {
        clearAccessTokenCookie(res);
        throw err;
      }

      let cachedPerms: string | null | undefined = undefined;

      if (redis.status === "ready") {
        try {
          const [isRevoked, userRevokedAtStr, permsData] = await redis.mget(
            `auth:revoked-session:${payload.sid}`,
            `auth:user-revoked-at:${payload.sub}`,
            `role:permissions:${payload.role}`,
          );

          if (
            isRevoked ||
            (userRevokedAtStr &&
              (payload.iat ?? 0) <= parseInt(userRevokedAtStr, 10))
          ) {
            clearAuthCookies(res);
            return next();
          }

          cachedPerms = permsData;
        } catch (err) {
          logger.error(
            { err },
            "Error checking session revocation via Redis mget",
          );
        }
      }

      const permissions = await authorizationService.getPermissionsByRole(
        payload.role,
        cachedPerms,
      );

      req.auth = {
        userId: payload.sub,
        role: payload.role,
        sessionId: payload.sid,
        permissions,
      };
    } catch {
      // Ignored: Treat invalid/expired token as unauthenticated flow
    }

    next();
  },
);
