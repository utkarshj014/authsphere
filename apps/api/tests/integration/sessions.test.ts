import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  prisma,
  createVerifiedUser,
  createSession,
  createExpiredSession,
  authenticate,
} from "../helpers/index.js";
import { sessionsService } from "../../src/modules/sessions/sessions.service.js";

describe("Sessions Integration Suite (Active Sessions & Revocation)", () => {
  it("GET /sessions lists active sessions only with isCurrent annotated and tokenHash stripped", async () => {
    const { user, cookieHeader } = await authenticate(app);
    const { session: otherSession } = await createSession(user.id);
    await createExpiredSession(user.id); // Expired session must be excluded

    const res = await request(app).get("/sessions").set("Cookie", cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const sessions = res.body.data;
    expect(sessions).toHaveLength(2);

    // Invariant: tokenHash is never exposed to clients
    for (const s of sessions) {
      expect("tokenHash" in s).toBe(false);
    }

    const current = sessions.find((s: any) => s.isCurrent === true);
    const remote = sessions.find((s: any) => s.id === otherSession.id);

    expect(current).toBeDefined();
    expect(current.isCurrent).toBe(true);
    expect(remote).toBeDefined();
    expect(remote.isCurrent).toBe(false);
  });

  it("getActiveSessions returns empty array when user has no active sessions", async () => {
    const { user } = await createVerifiedUser();
    await createExpiredSession(user.id);

    const sessions = await sessionsService.getActiveSessions(
      user.id,
      "01912345-6789-7abc-def0-123456789abc",
    );

    expect(sessions).toEqual([]);
  });

  it("cross-user revocation defense: revoking another user's session returns 403 Forbidden", async () => {
    const { cookieHeader: cookieA } = await authenticate(app);
    const { user: userB } = await createVerifiedUser();
    const { session: sessionB } = await createSession(userB.id);

    const res = await request(app)
      .delete(`/sessions/${sessionB.id}`)
      .set("Cookie", cookieA);

    expect(res.status).toBe(403);

    // Session B must remain intact in DB
    const inDb = await prisma.session.findUnique({
      where: { id: sessionB.id },
    });
    expect(inDb).toBeDefined();
  });

  it("self-revocation deletes session and clears auth cookies", async () => {
    const { user, cookieHeader } = await authenticate(app);

    const activeSession = await prisma.session.findFirstOrThrow({
      where: { userId: user.id },
    });

    const res = await request(app)
      .delete(`/sessions/${activeSession.id}`)
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(200);

    const inDb = await prisma.session.findUnique({
      where: { id: activeSession.id },
    });
    expect(inDb).toBeNull();

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
    expect(cookieStr).toMatch(/Max-Age=0|expires=/i);
  });
});
