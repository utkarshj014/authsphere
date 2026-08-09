import { redis } from "../../lib/redis.js";
import { authorizationRepository } from "./authorization.repository.js";
import type { RoleName, PermissionName } from "@authsphere/shared";
import { logger } from "../../lib/logger.js";

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const getPermissionsByRole = async (
  roleName: RoleName,
): Promise<PermissionName[]> => {
  const cacheKey = `role:permissions:${roleName}`;

  if (redis.isOpen) {
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug({ roleName, cacheKey }, "Role permissions cache hit");
        return JSON.parse(cachedData) as PermissionName[];
      }
      logger.debug({ roleName, cacheKey }, "Role permissions cache miss");
    } catch (err) {
      logger.error(
        { err, roleName, cacheKey },
        "Error reading from Redis cache",
      );
    }
  } else {
    logger.warn(
      { roleName, cacheKey },
      "Redis client is not open; bypassing cache read",
    );
  }

  // Fallback to database lookup
  const permissions =
    await authorizationRepository.findPermissionsByRole(roleName);

  if (redis.isOpen) {
    try {
      await redis.set(cacheKey, JSON.stringify(permissions), {
        expiration: {
          type: "EX",
          value: CACHE_TTL_SECONDS,
        },
      });
      logger.debug({ roleName, cacheKey }, "Cached role permissions in Redis");
    } catch (err) {
      logger.error({ err, roleName, cacheKey }, "Error writing to Redis cache");
    }
  } else {
    logger.warn(
      { roleName, cacheKey },
      "Redis client is not open; bypassing cache write",
    );
  }

  return permissions;
};

export const authorizationService = {
  getPermissionsByRole,
};
