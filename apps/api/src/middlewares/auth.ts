import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../common/errors/unauthorized-error.js";
import { verifyAccessToken } from "../lib/jwt/access-token.js";
import { asyncHandler } from "../common/errors/async-handler.js";

export const auth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      throw new UnauthorizedError("No access token provided");
    }

    const payload = await verifyAccessToken(accessToken);

    req.userId = payload.sub;

    next();
  },
);
