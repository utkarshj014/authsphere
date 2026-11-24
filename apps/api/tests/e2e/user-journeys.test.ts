import { describe, it, expect } from "vitest";
import request from "supertest";
import { generateSync } from "otplib";
import {
  getTestApp,
  createVerifiedUser,
  authenticate,
  getLastSentVerificationEmail,
  getLastSentForgotPasswordEmail,
  getAuthCookies,
  formatCookieHeader,
  prisma,
} from "../helpers/index.js";

describe("E2E User Journeys", () => {
  const app = getTestApp();

  it("Journey 1: Full Registration & Auth Lifecycle (Signup → Verification Outbox → Verification → Login → Profile → Token Rotation → Logout → Revocation)", async () => {
    const email = `e2e-journey1-${Date.now()}@authsphere.test`;
    const password = "StrongPassword123!";

    // 1. Signup
    const signupRes = await request(app)
      .post("/auth/signup")
      .send({ email, password, firstName: "Alice", lastName: "Walker" });
    expect(signupRes.status).toBe(201);

    // 2. Intercept verification email outbox
    const verificationEmail = getLastSentVerificationEmail();
    expect(verificationEmail).toBeDefined();
    expect(verificationEmail!.email).toBe(email);
    expect(verificationEmail!.token).toBeDefined();

    // 3. Email verification
    const verifyRes = await request(app)
      .post("/auth/verify-email")
      .send({ token: verificationEmail!.token });
    expect(verifyRes.status).toBe(200);

    // 4. Login
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(loginRes.status).toBe(200);

    const initialCookies = getAuthCookies(loginRes);
    expect(initialCookies.accessToken).toBeDefined();
    expect(initialCookies.refreshToken).toBeDefined();
    let cookieHeader = formatCookieHeader(initialCookies);

    // 5. Access Profile (GET /auth/me)
    const meRes = await request(app)
      .get("/auth/me")
      .set("Cookie", cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
    expect(meRes.body.data.firstName).toBe("Alice");

    // 6. Refresh token rotation
    const refreshRes = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", cookieHeader);
    expect(refreshRes.status).toBe(200);

    const rotatedCookies = getAuthCookies(refreshRes);
    expect(rotatedCookies.accessToken).toBeDefined();
    expect(rotatedCookies.refreshToken).toBeDefined();
    expect(rotatedCookies.refreshToken).not.toBe(initialCookies.refreshToken);
    cookieHeader = formatCookieHeader(rotatedCookies);

    // Verify profile is accessible with rotated tokens
    const meResAfterRotate = await request(app)
      .get("/auth/me")
      .set("Cookie", cookieHeader);
    expect(meResAfterRotate.status).toBe(200);

    // 7. Logout
    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader);
    expect(logoutRes.status).toBe(200);

    // 8. Verify cookie clearing in response headers
    const setCookie = logoutRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieString = Array.isArray(setCookie)
      ? setCookie.join(";")
      : setCookie;
    expect(cookieString).toContain("accessToken=");

    // 9. Verify refresh token rejection and unauthenticated access rejection
    const refreshAfterLogout = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", cookieHeader);
    expect(refreshAfterLogout.status).toBe(401);

    const unauthedMe = await request(app).get("/auth/me");
    expect(unauthedMe.status).toBe(401);
  });

  it("Journey 2: MFA-Enforced Lifecycle (Enable MFA → TOTP Code Validation → Recovery Codes → Logout → Challenge on Login → Fulfill Challenge → Profile Access)", async () => {
    const email = `e2e-journey2-${Date.now()}@authsphere.test`;
    const password = "Password123!";

    // 1. Signup & verify user
    await request(app)
      .post("/auth/signup")
      .send({ email, password, firstName: "Bob", lastName: "Builder" });
    const verifyToken = getLastSentVerificationEmail()!.token;
    await request(app).post("/auth/verify-email").send({ token: verifyToken });

    // 2. Initial login
    const login1 = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(login1.status).toBe(200);
    const initialCookieHeader = formatCookieHeader(getAuthCookies(login1));

    // 3. Initiate MFA setup
    const mfaSetupRes = await request(app)
      .post("/auth/mfa/setup")
      .set("Cookie", initialCookieHeader);
    expect(mfaSetupRes.status).toBe(200);
    const mfaSecret = mfaSetupRes.body.data.secret;
    expect(mfaSecret).toBeDefined();

    // 4. Validate TOTP setup code & receive 10 recovery codes
    const validSetupCode = generateSync({ secret: mfaSecret });
    const verifySetupRes = await request(app)
      .post("/auth/mfa/verify-setup")
      .set("Cookie", initialCookieHeader)
      .send({ code: validSetupCode });
    expect(verifySetupRes.status).toBe(200);
    expect(verifySetupRes.body.data.recoveryCodes).toHaveLength(10);

    // 5. Logout
    await request(app).post("/auth/logout").set("Cookie", initialCookieHeader);

    // 6. Login returning mfaRequired: true
    const login2 = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(login2.status).toBe(200);
    expect(login2.body.data.mfaRequired).toBe(true);
    const mfaToken = login2.body.data.mfaToken;
    expect(mfaToken).toBeDefined();

    // 7. Fulfill TOTP challenge
    const validLoginCode = generateSync({ secret: mfaSecret });
    const verifyLoginRes = await request(app)
      .post("/auth/mfa/verify")
      .send({ mfaToken, code: validLoginCode });
    expect(verifyLoginRes.status).toBe(200);

    const mfaLoginCookies = getAuthCookies(verifyLoginRes);
    expect(mfaLoginCookies.accessToken).toBeDefined();
    expect(mfaLoginCookies.refreshToken).toBeDefined();
    const mfaCookieHeader = formatCookieHeader(mfaLoginCookies);

    // 8. Access profile successfully with MFA-authenticated session
    const meRes = await request(app)
      .get("/auth/me")
      .set("Cookie", mfaCookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
    expect(meRes.body.data.mfaEnabled).toBe(true);
  });

  it("Journey 3: Forgot Password, Reset & Prior Session Invalidation (Forgot Password → Token Extraction → Password Reset → DB Session Revocation → Refresh Rejection)", async () => {
    const email = `e2e-journey3-${Date.now()}@authsphere.test`;
    const oldPassword = "OldPassword123!";
    const newPassword = "NewPassword123!";

    // 1. Signup & verify user
    const signupRes = await request(app)
      .post("/auth/signup")
      .send({ email, password: oldPassword, firstName: "Charlie" });
    expect(signupRes.status).toBe(201);
    const verifyToken = getLastSentVerificationEmail()!.token;
    await request(app).post("/auth/verify-email").send({ token: verifyToken });

    // 2. Login to establish active session
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });
    expect(loginRes.status).toBe(200);
    const oldCookieHeader = formatCookieHeader(getAuthCookies(loginRes));

    // Get user from database and verify active session exists in PostgreSQL
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeDefined();
    const priorSessions = await prisma.session.findMany({
      where: { userId: user!.id },
    });
    expect(priorSessions.length).toBeGreaterThan(0);

    // 3. Request forgot password
    const forgotRes = await request(app)
      .post("/auth/forgot-password")
      .send({ email });
    expect(forgotRes.status).toBe(200);

    // 4. Token extraction from mock email outbox
    const resetEmail = getLastSentForgotPasswordEmail();
    expect(resetEmail).toBeDefined();
    expect(resetEmail!.email).toBe(email);
    expect(resetEmail!.token).toBeDefined();

    // 5. Password reset with extracted token
    const resetRes = await request(app)
      .post("/auth/reset-password")
      .send({ token: resetEmail!.token, password: newPassword });
    expect(resetRes.status).toBe(200);

    // 6. Assert immediate revocation of prior sessions in PostgreSQL
    const sessionsAfterReset = await prisma.session.findMany({
      where: { userId: user!.id },
    });
    expect(sessionsAfterReset).toHaveLength(0);

    // 7. Rejection of subsequent refresh requests with prior session cookies
    const refreshWithOldCookie = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", oldCookieHeader);
    expect(refreshWithOldCookie.status).toBe(401);

    // 8. Old password fails authentication
    const oldPasswordLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });
    expect(oldPasswordLogin.status).toBe(401);

    // 9. New password successfully authenticates
    const newPasswordLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: newPassword });
    expect(newPasswordLogin.status).toBe(200);
  });

  it("Journey 4: Multi-Device Session Governance (Dual Login → /sessions Introspection → Remote Revocation → Active Isolation → Self-Revocation Clears Cookies)", async () => {
    const { user, password } = await createVerifiedUser();

    // 1. Dual login: Desktop
    const desktopLogin = await request(app)
      .post("/auth/login")
      .set("User-Agent", "Device-Desktop/1.0")
      .send({ email: user.email, password });
    expect(desktopLogin.status).toBe(200);
    const desktopCookies = getAuthCookies(desktopLogin);
    const desktopHeader = formatCookieHeader(desktopCookies);

    // 2. Dual login: Mobile
    const mobileLogin = await request(app)
      .post("/auth/login")
      .set("User-Agent", "Device-Mobile/1.0")
      .send({ email: user.email, password });
    expect(mobileLogin.status).toBe(200);
    const mobileCookies = getAuthCookies(mobileLogin);
    const mobileHeader = formatCookieHeader(mobileCookies);

    // 3. Session introspection via /sessions from Desktop
    const listRes = await request(app)
      .get("/sessions")
      .set("Cookie", desktopHeader);
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
    expect(currentSession.userAgent).toContain("Device-Desktop");
    expect(remoteSession.userAgent).toContain("Device-Mobile");

    // 4. Remote revocation of mobile session from desktop
    const revokeRemoteRes = await request(app)
      .delete(`/sessions/${remoteSession.id}`)
      .set("Cookie", desktopHeader);
    expect(revokeRemoteRes.status).toBe(200);

    // 5. Desktop remains active while mobile refresh fails with 401
    const desktopMeRes = await request(app)
      .get("/auth/me")
      .set("Cookie", desktopHeader);
    expect(desktopMeRes.status).toBe(200);

    const mobileRefreshRes = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", mobileHeader);
    expect(mobileRefreshRes.status).toBe(401);

    // 6. Self-revocation of current session from Desktop clears cookies
    const revokeCurrentRes = await request(app)
      .delete(`/sessions/${currentSession.id}`)
      .set("Cookie", desktopHeader);
    expect(revokeCurrentRes.status).toBe(200);

    // Response headers set-cookie contains cookie clear instructions
    const setCookie = revokeCurrentRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieString = Array.isArray(setCookie)
      ? setCookie.join(";")
      : setCookie;
    expect(cookieString).toContain("accessToken=");

    // Desktop refresh fails after self-revocation
    const desktopRefreshAfterRevoke = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", desktopHeader);
    expect(desktopRefreshAfterRevoke.status).toBe(401);

    // Unauthenticated profile check fails with 401
    const unauthedMe = await request(app).get("/auth/me");
    expect(unauthedMe.status).toBe(401);
  });

  it("Journey 5: Administrative Role Governance & Demotion Defense (Promotion to ADMIN → Access Admin Endpoints → Self-Demotion Blocked 403 → Admin Demoted to USER → Admin Access Blocked 403)", async () => {
    // 1. Authenticate as system Administrator
    const { cookieHeader: adminHeader } = await authenticate(app, {
      role: "ADMIN",
    });

    // 2. Create and authenticate regular user
    const { user: candidateUser, password: candidatePassword } =
      await createVerifiedUser({ role: "USER" });
    const userLogin = await request(app)
      .post("/auth/login")
      .send({ email: candidateUser.email, password: candidatePassword });
    expect(userLogin.status).toBe(200);
    const userHeader = formatCookieHeader(getAuthCookies(userLogin));

    // Verify unprivileged regular user is rejected from admin endpoints with 403
    const unprivRolesRes = await request(app)
      .get("/roles/ADMIN/permissions")
      .set("Cookie", userHeader);
    expect(unprivRolesRes.status).toBe(403);

    const unprivUsersRes = await request(app)
      .get("/users")
      .set("Cookie", userHeader);
    expect(unprivUsersRes.status).toBe(403);

    // 3. Admin promotes candidate user to ADMIN
    const promoteRes = await request(app)
      .patch(`/users/${candidateUser.id}/role`)
      .set("Cookie", adminHeader)
      .send({ roleName: "ADMIN" });
    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.data.role).toBe("ADMIN");

    // Allow clock to advance by 1s to align with RFC 7519 integer-second resolution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4. Promoted user logs in fresh to acquire token with ADMIN claims
    const promotedLogin = await request(app)
      .post("/auth/login")
      .send({ email: candidateUser.email, password: candidatePassword });
    expect(promotedLogin.status).toBe(200);
    const newAdminHeader = formatCookieHeader(getAuthCookies(promotedLogin));

    // 5. Accesses privileged administrative endpoints (/roles, /users)
    const adminRolesRes = await request(app)
      .get("/roles/ADMIN/permissions")
      .set("Cookie", newAdminHeader);
    expect(adminRolesRes.status).toBe(200);
    expect(adminRolesRes.body.data).toBeDefined();

    const adminUsersRes = await request(app)
      .get("/users")
      .set("Cookie", newAdminHeader);
    expect(adminUsersRes.status).toBe(200);
    expect(Array.isArray(adminUsersRes.body.data.users)).toBe(true);
    expect(adminUsersRes.body.data.users.length).toBeGreaterThan(0);

    // 6. Attempt self-demotion (must be blocked with 403 Forbidden)
    const selfDemoteRes = await request(app)
      .patch(`/users/${candidateUser.id}/role`)
      .set("Cookie", newAdminHeader)
      .send({ roleName: "USER" });
    expect(selfDemoteRes.status).toBe(403);
    expect(selfDemoteRes.body.message).toBe("You cannot change your own role");

    // 7. System Admin demotes promoted user back to USER
    const demoteRes = await request(app)
      .patch(`/users/${candidateUser.id}/role`)
      .set("Cookie", adminHeader)
      .send({ roleName: "USER" });
    expect(demoteRes.status).toBe(200);
    expect(demoteRes.body.data.role).toBe("USER");

    // Immediate eviction of active session upon role change
    const revokedMeRes = await request(app)
      .get("/auth/me")
      .set("Cookie", newAdminHeader);
    expect(revokedMeRes.status).toBe(401);
    expect(revokedMeRes.body.message).toBe("Session has been revoked");

    // Allow clock to advance by 1s to align with RFC 7519 integer-second resolution
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 8. Demoted user re-authenticates to acquire USER token
    const demotedLogin = await request(app)
      .post("/auth/login")
      .send({ email: candidateUser.email, password: candidatePassword });
    expect(demotedLogin.status).toBe(200);
    const demotedHeader = formatCookieHeader(getAuthCookies(demotedLogin));

    // 9. Subsequent administrative requests are rejected with 403 Forbidden
    const demotedUsersRes = await request(app)
      .get("/users")
      .set("Cookie", demotedHeader);
    expect(demotedUsersRes.status).toBe(403);

    const demotedRolesRes = await request(app)
      .get("/roles/ADMIN/permissions")
      .set("Cookie", demotedHeader);
    expect(demotedRolesRes.status).toBe(403);
  });
});
