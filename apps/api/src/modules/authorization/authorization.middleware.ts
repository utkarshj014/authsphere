import type { Request, Response, NextFunction } from "express";
import type { PermissionName, RoleName } from "@authsphere/shared";
import { asyncHandler, ForbiddenError } from "../../common/errors/index.js";

// In this file, we don't need asyncHandler, as we don't have redis/database calls,
// but we are using it for consistency with the authentication middleware.

export const requireRole = (...roles: RoleName[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const { role } = req.auth;
      if (!roles.includes(role)) {
        throw new ForbiddenError();
      }

      next();
    },
  );
};

export const requirePermission = (...permissions: PermissionName[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const { permissions: userPermissions } = req.auth;
      if (!permissions.every((p) => userPermissions.includes(p))) {
        throw new ForbiddenError(
          "Access Denied: You do not have the required permissions.",
        );
      }

      next();
    },
  );
};

export const requireSelfOrPermission = (permission: PermissionName) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const { userId, permissions } = req.auth;

      // Early return if user is self or has the permission.
      // Positive conditions are easier to read and reason about than negative conditions.
      if (req.params.id === userId || permissions.includes(permission)) {
        return next();
      }

      throw new ForbiddenError(
        "Access Denied: You do not have the required permissions.",
      );
    },
  );
};
