import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  getTestApp,
  createVerifiedUser,
  authenticate,
  getAuthCookies,
  formatCookieHeader,
} from "../helpers/index.js";

describe("E2E Journey — Admin Authorization & Role Escalation", () => {
  const app = getTestApp();

  it("Admin promotes a user to ADMIN, user acquires admin privileges, then gets demoted and loses privileges", async () => {
    // 1. Authenticate as Admin
    const { cookieHeader: adminHeader } = await authenticate(app, {
      role: "ADMIN",
    });

    // 2. Create and authenticate regular user
    const { user: regularUser, password: regularPassword } =
      await createVerifiedUser({ role: "USER" });
    const userLogin = await request(app)
      .post("/auth/login")
      .send({ email: regularUser.email, password: regularPassword });
    const userCookieHeader = formatCookieHeader(getAuthCookies(userLogin));

    // 3. Regular user tries to access admin-only role-change endpoint -> 403 Forbidden
    const unprivilegedAttempt = await request(app)
      .patch(`/users/${regularUser.id}/role`)
      .set("Cookie", userCookieHeader)
      .send({ roleName: "ADMIN" });
    expect(unprivilegedAttempt.status).toBe(403);

    // 4. Admin promotes regular user to ADMIN
    const promoteRes = await request(app)
      .patch(`/users/${regularUser.id}/role`)
      .set("Cookie", adminHeader)
      .send({ roleName: "ADMIN" });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.role).toBe("ADMIN");

    // 5. Promoted user logs in fresh to acquire new token with ADMIN claims
    const freshLogin = await request(app)
      .post("/auth/login")
      .send({ email: regularUser.email, password: regularPassword });
    const newAdminHeader = formatCookieHeader(getAuthCookies(freshLogin));

    // Create a 3rd user as target
    const { user: thirdUser } = await createVerifiedUser();

    // Promoted user now successfully performs admin action
    const privilegedAction = await request(app)
      .patch(`/users/${thirdUser.id}/role`)
      .set("Cookie", newAdminHeader)
      .send({ roleName: "ADMIN" });
    expect(privilegedAction.status).toBe(200);

    // 6. Original Admin demotes promoted user back to USER
    const demoteRes = await request(app)
      .patch(`/users/${regularUser.id}/role`)
      .set("Cookie", adminHeader)
      .send({ roleName: "USER" });
    expect(demoteRes.status).toBe(200);
    expect(demoteRes.body.data.role).toBe("USER");

    // 7. Demoted user re-authenticates and is once again blocked
    const loginAfterDemote = await request(app)
      .post("/auth/login")
      .send({ email: regularUser.email, password: regularPassword });
    const demotedHeader = formatCookieHeader(getAuthCookies(loginAfterDemote));

    const blockedAfterDemote = await request(app)
      .patch(`/users/${thirdUser.id}/role`)
      .set("Cookie", demotedHeader)
      .send({ roleName: "USER" });
    expect(blockedAfterDemote.status).toBe(403);
  });
});
