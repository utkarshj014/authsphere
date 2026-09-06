import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  getTestApp,
  createVerifiedUser,
  getAuthCookies,
  formatCookieHeader,
} from "../helpers/index.js";

describe("E2E Journey — Session Management", () => {
  const app = getTestApp();

  it("User logs in from two devices → lists sessions → revokes remote session → verifies current remains active", async () => {
    const { user, password } = await createVerifiedUser();

    // 1. Login Device 1
    const login1 = await request(app)
      .post("/auth/login")
      .set("User-Agent", "Device-Desktop/1.0")
      .send({ email: user.email, password });
    const cookiesDevice1 = getAuthCookies(login1);
    const headerDevice1 = formatCookieHeader(cookiesDevice1);

    // 2. Login Device 2
    const login2 = await request(app)
      .post("/auth/login")
      .set("User-Agent", "Device-Mobile/1.0")
      .send({ email: user.email, password });
    const cookiesDevice2 = getAuthCookies(login2);
    const headerDevice2 = formatCookieHeader(cookiesDevice2);

    // 3. From Device 1, list sessions
    const listRes = await request(app)
      .get("/sessions")
      .set("Cookie", headerDevice1);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(2);

    const currentSession = listRes.body.data.find(
      (s: { isCurrent: boolean }) => s.isCurrent === true,
    );
    const remoteSession = listRes.body.data.find(
      (s: { isCurrent: boolean }) => s.isCurrent === false,
    );

    expect(currentSession).toBeDefined();
    expect(remoteSession).toBeDefined();

    // 4. From Device 1, revoke remote Device 2 session
    const revokeRemoteRes = await request(app)
      .delete(`/sessions/${remoteSession.id}`)
      .set("Cookie", headerDevice1);
    expect(revokeRemoteRes.status).toBe(200);

    // 5. Verify Device 1 remains fully active
    const meDevice1 = await request(app)
      .get("/auth/me")
      .set("Cookie", headerDevice1);
    expect(meDevice1.status).toBe(200);

    // 6. Verify Device 2 session is revoked (refresh fails)
    const refreshDevice2 = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", headerDevice2);
    expect(refreshDevice2.status).toBe(401);
  });

  it("Revoking current session clears auth cookies in response", async () => {
    const { user, password } = await createVerifiedUser();

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password });
    const cookieHeader = formatCookieHeader(getAuthCookies(loginRes));

    // Get current session id
    const listRes = await request(app)
      .get("/sessions")
      .set("Cookie", cookieHeader);
    const currentSession = listRes.body.data.find(
      (s: { isCurrent: boolean }) => s.isCurrent === true,
    );

    // Revoke current session
    const revokeRes = await request(app)
      .delete(`/sessions/${currentSession.id}`)
      .set("Cookie", cookieHeader);
    expect(revokeRes.status).toBe(200);

    // Verify Set-Cookie header contains cookie clear instructions
    const setCookie = revokeRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieString = Array.isArray(setCookie)
      ? setCookie.join(";")
      : setCookie;
    expect(cookieString).toContain("accessToken=");

    // Refreshing the revoked session fails with 401
    const refreshResAfterRevoke = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", cookieHeader);
    expect(refreshResAfterRevoke.status).toBe(401);

    // Unauthenticated request without cookies is rejected 401
    const meRes = await request(app).get("/auth/me");
    expect(meRes.status).toBe(401);
  });
});
