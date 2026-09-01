import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/index.js";
import { sessionsService } from "./sessions.service.js";
import { ApiResponse } from "../../common/responses/index.js";
import { clearAuthCookies, getClientIp } from "../../common/utils/index.js";

const getActiveSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.auth.userId;
  const currentSessionId = req.auth.sessionId;

  const sessions = await sessionsService.getActiveSessions(
    userId,
    currentSessionId,
  );

  return ApiResponse.success(
    res,
    sessions,
    "Active sessions retrieved successfully",
    200,
  );
});

const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.params.id as string;
  const userId = req.auth.userId;
  const currentSessionId = req.auth.sessionId;
  const ipAddress = getClientIp(req);
  const userAgent = req.header("user-agent");

  const { isCurrent } = await sessionsService.revokeSession(
    sessionId,
    userId,
    currentSessionId,
    ipAddress,
    userAgent,
  );

  if (isCurrent) {
    clearAuthCookies(res);
  }

  return ApiResponse.success(res, null, "Session revoked successfully", 200);
});

export const sessionsController = {
  getActiveSessions,
  revokeSession,
};
