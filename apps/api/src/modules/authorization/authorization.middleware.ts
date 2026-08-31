import type { Request, Response, NextFunction } from "express";
import type { PermissionName, RoleName } from "@authsphere/shared";
import {
  asyncHandler,
  ForbiddenError,
  UnauthorizedError,
} from "../../common/errors/index.js";

// Note: Authorization guards execute synchronously in-memory against req.auth,
// but use asyncHandler for uniform Express promise error forwarding and consistency.

export const requireRole = (...roles: RoleName[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      // Defensive check
      if (!req.auth) {
        throw new UnauthorizedError("Authentication required");
      }

      const { role } = req.auth;
      if (!roles.includes(role)) {
        throw new ForbiddenError(
          "Access Denied: You do not have the required role.",
        );
      }

      next();
    },
  );
};

export const requirePermission = (...permissions: PermissionName[]) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      // Defensive check
      if (!req.auth) {
        throw new UnauthorizedError("Authentication required");
      }

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
      // Defensive check
      if (!req.auth) {
        throw new UnauthorizedError("Authentication required");
      }

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
