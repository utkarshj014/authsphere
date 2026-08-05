import type { NextFunction, Request, Response } from "express";
import { asyncHandler, UnauthorizedError } from "../common/errors/index.js";
import { verifyAccessToken } from "../lib/jwt/index.js";

export const auth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      throw new UnauthorizedError("No access token provided");
    }

    const payload = await verifyAccessToken(accessToken);

    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      role: payload.role,
    };

    next();
  },
);
