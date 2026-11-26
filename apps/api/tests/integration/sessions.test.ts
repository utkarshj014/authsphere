import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  prisma,
  createVerifiedUser,
  createSession,
  createExpiredSession,
  authenticate,
  getAuthCookies,
  formatCookieHeader,
  getLastSentMagicLinkEmail,
} from "../helpers/index.js";
import { sessionsService } from "../../src/modules/sessions/sessions.service.js";
import { MAX_ACTIVE_SESSIONS_PER_USER } from "../../src/modules/auth/auth.service.js";

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
    const cookieStr = Array.isArray(setCookie)
      ? setCookie.join("; ")
      : setCookie;
    expect(cookieStr).toMatch(/Max-Age=0|expires=/i);
  });

  it("multi-browser isolation: two independent logins with identical User-Agent keep separate active sessions", async () => {
    const sharedUa =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
    const { user, password } = await createVerifiedUser();

    // Browser 1 (e.g. Brave) logs in without prior cookies
    const browser1Res = await request(app)
      .post("/auth/login")
      .set("User-Agent", sharedUa)
      .send({ email: user.email, password });
    expect(browser1Res.status).toBe(200);
    const browser1Header = formatCookieHeader(getAuthCookies(browser1Res));

    // Browser 2 (e.g. Chrome) logs in with identical User-Agent and no prior cookies
    const browser2Res = await request(app)
      .post("/auth/login")
      .set("User-Agent", sharedUa)
      .send({ email: user.email, password });
    expect(browser2Res.status).toBe(200);
    const browser2Header = formatCookieHeader(getAuthCookies(browser2Res));

    // Browser 1 sees both sessions (its own isCurrent=true and Browser 2 as remote)
    const list1 = await request(app)
      .get("/sessions")
      .set("Cookie", browser1Header);
    expect(list1.status).toBe(200);
    expect(list1.body.data).toHaveLength(2);
    const current1 = list1.body.data.find((s: any) => s.isCurrent === true);
    const remote2 = list1.body.data.find((s: any) => s.isCurrent === false);
    expect(current1).toBeDefined();
    expect(remote2).toBeDefined();

    // Browser 1 revokes Browser 2: Browser 1 keeps surfing, Browser 2 is immediately rejected
    const revokeRes = await request(app)
      .delete(`/sessions/${remote2.id}`)
      .set("Cookie", browser1Header);
    expect(revokeRes.status).toBe(200);

    const browser1StillActive = await request(app)
      .get("/sessions")
      .set("Cookie", browser1Header);
    expect(browser1StillActive.status).toBe(200);
    expect(browser1StillActive.body.data).toHaveLength(1);
    expect(browser1StillActive.body.data[0].isCurrent).toBe(true);

    const browser2Rejected = await request(app)
      .get("/auth/me")
      .set("Cookie", browser2Header);
    expect(browser2Rejected.status).toBe(401);
  });

  it("same-browser re-authentication via magic link supersedes prior session in DB and Redis", async () => {
    const { user, password } = await createVerifiedUser();

    const firstLogin = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password });
    expect(firstLogin.status).toBe(200);
    const firstHeader = formatCookieHeader(getAuthCookies(firstLogin));

    await request(app).post("/auth/magic-link").send({ email: user.email });
    const magicEmail = getLastSentMagicLinkEmail();
    expect(magicEmail).toBeDefined();

    // Same browser verifies magic link while sending existing refreshToken cookie
    const secondLogin = await request(app)
      .post("/auth/magic-link/verify")
      .set("Cookie", firstHeader)
      .send({ token: magicEmail!.token });
    expect(secondLogin.status).toBe(200);
    const secondHeader = formatCookieHeader(getAuthCookies(secondLogin));

    const activeSessions = await prisma.session.findMany({
      where: { userId: user.id },
    });
    expect(activeSessions).toHaveLength(1);

    // Superseded access token from first login must be immediately rejected via Redis blacklist
    const oldTokenRejected = await request(app)
      .get("/auth/me")
      .set("Cookie", firstHeader);
    expect(oldTokenRejected.status).toBe(401);

    const newTokenAccepted = await request(app)
      .get("/auth/me")
      .set("Cookie", secondHeader);
    expect(newTokenAccepted.status).toBe(200);
  });

  it("enforces active session cap per user by evicting oldest session from DB and Redis", async () => {
    const { user, password } = await createVerifiedUser();

    const firstRes = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password });
    expect(firstRes.status).toBe(200);
    const oldestHeader = formatCookieHeader(getAuthCookies(firstRes));

    for (let i = 1; i < MAX_ACTIVE_SESSIONS_PER_USER; i++) {
      await createSession(user.id);
    }

    const latestRes = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password });
    expect(latestRes.status).toBe(200);

    const count = await prisma.session.count({ where: { userId: user.id } });
    expect(count).toBe(MAX_ACTIVE_SESSIONS_PER_USER);

    const evictedRejected = await request(app)
      .get("/auth/me")
      .set("Cookie", oldestHeader);
    expect(evictedRejected.status).toBe(401);
  });
});
