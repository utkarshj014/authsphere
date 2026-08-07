import type { Request, Response, NextFunction } from "express";
import type { PermissionName, RoleName } from "@authsphere/shared";
import { asyncHandler, ForbiddenError } from "../../common/errors/index.js";

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
          `Access Denied: User does not have required permissions.`,
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
      if (req.params.id === userId || permissions.includes(permission)) {
        return next();
      }

      throw new ForbiddenError(
        `Access Denied: User does not have required permissions.`,
      );
    },
  );
};
