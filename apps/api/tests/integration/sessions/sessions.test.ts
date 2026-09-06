import { describe, it, expect } from "vitest";
import { sessionsService } from "../../../src/modules/sessions/sessions.service.js";
import {
  prisma,
  createVerifiedUser,
  createSession,
  createExpiredSession,
} from "../../helpers/index.js";
import { ForbiddenError } from "../../../src/common/errors/index.js";

describe("Sessions Service Integration", () => {
  it("getActiveSessions returns empty array when user has no active sessions", async () => {
    const { user } = await createVerifiedUser();
    await createExpiredSession(user.id);

    const sessions = await sessionsService.getActiveSessions(
      user.id,
      "01912345-6789-7abc-def0-123456789abc",
    );

    expect(sessions).toEqual([]);
  });

  it("getActiveSessions returns active sessions only, with isCurrent annotated and tokenHash stripped", async () => {
    const { user } = await createVerifiedUser();
    const { session: currentSession } = await createSession(user.id);
    const { session: otherSession } = await createSession(user.id);
    await createExpiredSession(user.id); // Should be excluded

    const sessions = await sessionsService.getActiveSessions(
      user.id,
      currentSession.id,
    );

    expect(sessions).toHaveLength(2);

    // Verify tokenHash is NOT exposed
    for (const s of sessions) {
      expect("tokenHash" in s).toBe(false);
    }

    const current = sessions.find((s) => s.id === currentSession.id);
    const remote = sessions.find((s) => s.id === otherSession.id);

    expect(current?.isCurrent).toBe(true);
    expect(remote?.isCurrent).toBe(false);
  });

  it("revokeSession successfully deletes own session and returns isCurrent", async () => {
    const { user } = await createVerifiedUser();
    const { session: currentSession } = await createSession(user.id);
    const { session: remoteSession } = await createSession(user.id);

    // Revoke remote session
    const result = await sessionsService.revokeSession(
      remoteSession.id,
      user.id,
      currentSession.id,
      "127.0.0.1",
      "Custom-Browser/1.0",
    );

    expect(result.isCurrent).toBe(false);

    const remaining = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(currentSession.id);

    const event = await prisma.securityEvent.findFirst({
      where: { userId: user.id, type: "LOGOUT" },
    });
    expect(event).toBeDefined();
    expect(event?.userAgent).toBe("Custom-Browser/1.0");
    expect(event?.metadata as Record<string, unknown>).toMatchObject({
      revokedSessionId: remoteSession.id,
      isCurrentSession: false,
    });
  });

  it("revokeSession returns isCurrent: true when revoking current session", async () => {
    const { user } = await createVerifiedUser();
    const { session: currentSession } = await createSession(user.id);

    const result = await sessionsService.revokeSession(
      currentSession.id,
      user.id,
      currentSession.id,
      "127.0.0.1",
    );

    expect(result.isCurrent).toBe(true);

    const inDb = await prisma.session.findUnique({
      where: { id: currentSession.id },
    });
    expect(inDb).toBeNull();
  });

  it("revokeSession prevents revoking another user's session (cross-tenant safety)", async () => {
    const { user: userA } = await createVerifiedUser();
    const { user: userB } = await createVerifiedUser();
    const { session: sessionB } = await createSession(userB.id);

    await expect(
      sessionsService.revokeSession(
        sessionB.id,
        userA.id,
        "dummy-session-id",
        "127.0.0.1",
      ),
    ).rejects.toThrowError(ForbiddenError);

    // Session B should still exist
    const inDb = await prisma.session.findUnique({
      where: { id: sessionB.id },
    });
    expect(inDb).toBeDefined();
  });

  it("revokeSession on nonexistent session throws 404", async () => {
    const { user } = await createVerifiedUser();

    await expect(
      sessionsService.revokeSession(
        "01912345-6789-7abc-def0-123456789abc",
        user.id,
        "dummy",
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Session not found",
    });
  });
});
