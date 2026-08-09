import type { Request, Response, NextFunction } from "express";
import { asyncHandler, UnauthorizedError } from "../common/errors/index.js";
import { verifyAccessToken } from "../lib/jwt/index.js";
import { authorizationService } from "../modules/authorization/index.js";

export const auth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      throw new UnauthorizedError("No access token provided");
    }

    const payload = await verifyAccessToken(accessToken);
    const permissions = await authorizationService.getPermissionsByRole(
      payload.role,
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
