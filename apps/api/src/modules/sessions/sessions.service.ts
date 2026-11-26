import { sessionsRepository } from "./sessions.repository.js";
import { recordSecurityEvent, revokeSessionsInRedis } from "../auth/index.js";
import { AppError, ForbiddenError } from "../../common/errors/index.js";
import { SECURITY_EVENT_TYPES } from "@authsphere/shared";
import type { SessionItemResponse } from "./sessions.validation.js";

const getActiveSessions = async (
  userId: string,
  currentSessionId: string,
): Promise<SessionItemResponse[]> => {
  const sessions = await sessionsRepository.findActiveSessionsByUserId(userId);

  return sessions
    .map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
};

const revokeSession = async (
  sessionId: string,
  userId: string,
  currentSessionId: string,
  ipAddress: string,
  userAgent?: string,
): Promise<{ isCurrent: boolean }> => {
  const session = await sessionsRepository.findSessionById(sessionId);
  if (!session) {
    throw new AppError("Session not found", 404);
  }
  if (session.userId !== userId) {
    throw new ForbiddenError("You cannot revoke another user's session");
  }

  await sessionsRepository.deleteSessionByIdAndUserId(sessionId, userId);

  await revokeSessionsInRedis([sessionId]);

  await recordSecurityEvent(
    userId,
    SECURITY_EVENT_TYPES.LOGOUT,
    ipAddress,
    userAgent,
    {
      revokedSessionId: sessionId,
      isCurrentSession: sessionId === currentSessionId,
    },
  );

  return {
    isCurrent: sessionId === currentSessionId,
  };
};

export const sessionsService = {
  getActiveSessions,
  revokeSession,
};
