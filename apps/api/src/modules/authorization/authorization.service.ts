import { redis } from "../../lib/redis.js";
import { authorizationRepository } from "./authorization.repository.js";
import type { RoleName, PermissionName } from "@authsphere/shared";
import { logger } from "../../lib/logger.js";

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const getPermissionsByRole = async (
  roleName: RoleName,
): Promise<PermissionName[]> => {
  const cacheKey = `role:permissions:${roleName}`;

  if (redis.status === "ready") {
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
    logger.debug(
      { roleName, cacheKey },
      "Redis client is not open; bypassing cache read",
    );
  }

  // Fallback to database lookup
  const permissions =
    await authorizationRepository.findPermissionsByRole(roleName);

  if (redis.status === "ready") {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify(permissions),
        "EX",
        CACHE_TTL_SECONDS,
      );
      logger.debug({ roleName, cacheKey }, "Cached role permissions in Redis");
    } catch (err) {
      logger.error({ err, roleName, cacheKey }, "Error writing to Redis cache");
    }
  } else {
    logger.debug(
      { roleName, cacheKey },
      "Redis client is not open; bypassing cache write",
    );
  }

  return permissions;
};

const invalidateRolePermissionsCache = async (
  roleName: RoleName,
): Promise<void> => {
  const cacheKey = `role:permissions:${roleName}`;

  if (redis.status === "ready") {
    try {
      await redis.del(cacheKey);
      logger.debug(
        { roleName, cacheKey },
        "Invalidated role permissions cache in Redis",
      );
    } catch (err) {
      logger.error(
        { err, roleName, cacheKey },
        "Error invalidating Redis cache",
      );
    }
  }
};

export const authorizationService = {
  getPermissionsByRole,
  invalidateRolePermissionsCache,
};
