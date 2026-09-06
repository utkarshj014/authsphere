import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  getTestApp,
  getLastSentVerificationEmail,
  getLastSentForgotPasswordEmail,
  getAuthCookies,
  formatCookieHeader,
} from "../helpers/index.js";
import { generateSync } from "otplib";

describe("E2E Journey — Auth Lifecycles", () => {
  const app = getTestApp();

  it("Journey 1: Signup → Verify Email → Login → Access Profile → Refresh Token → Logout", async () => {
    const email = `e2e-lifecycle-${Date.now()}@authsphere.test`;
    const password = "StrongPassword123!";

    // 1. Signup
    const signupRes = await request(app)
      .post("/auth/signup")
      .send({ email, password, firstName: "Alice", lastName: "Walker" });
    expect(signupRes.status).toBe(201);

    // 2. Extract verification token from mock email outbox
    const verificationEmail = getLastSentVerificationEmail();
    expect(verificationEmail).toBeDefined();
    expect(verificationEmail!.email).toBe(email);

    // 3. Verify Email
    const verifyRes = await request(app)
      .post("/auth/verify-email")
      .send({ token: verificationEmail!.token });
    expect(verifyRes.status).toBe(200);

    // 4. Login
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(loginRes.status).toBe(200);

    const cookies = getAuthCookies(loginRes);
    expect(cookies.accessToken).toBeDefined();
    expect(cookies.refreshToken).toBeDefined();
    let cookieHeader = formatCookieHeader(cookies);

    // 5. Access Protected Profile /auth/me
    const meRes = await request(app)
      .get("/auth/me")
      .set("Cookie", cookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);

    // 6. Refresh Token
    const refreshRes = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", cookieHeader);
    expect(refreshRes.status).toBe(200);

    const newCookies = getAuthCookies(refreshRes);
    expect(newCookies.accessToken).toBeDefined();
    expect(newCookies.refreshToken).toBeDefined();
    expect(newCookies.refreshToken).not.toBe(cookies.refreshToken);
    cookieHeader = formatCookieHeader(newCookies);

    // Profile accessible with rotated cookies
    const meResAfterRotate = await request(app)
      .get("/auth/me")
      .set("Cookie", cookieHeader);
    expect(meResAfterRotate.status).toBe(200);

    // 7. Logout
    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader);
    expect(logoutRes.status).toBe(200);

    // 8. Server sets cookie-clearing headers
    const setCookie = logoutRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieString = Array.isArray(setCookie)
      ? setCookie.join(";")
      : setCookie;
    expect(cookieString).toContain("accessToken=");

    // Client without cookies receives 401
    const meResAfterLogout = await request(app).get("/auth/me");
    expect(meResAfterLogout.status).toBe(401);

    // Session deleted from DB: Refresh token attempt fails with 401
    const refreshAfterLogout = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", cookieHeader);
    expect(refreshAfterLogout.status).toBe(401);
  });

  it("Journey 2: Enable MFA → Login requires challenge → Fulfill TOTP challenge → Access Profile", async () => {
    const email = `e2e-mfa-${Date.now()}@authsphere.test`;
    const password = "Password123!";

    // Signup + verify email
    await request(app)
      .post("/auth/signup")
      .send({ email, password, firstName: "Bob" });
    const verifyToken = getLastSentVerificationEmail()!.token;
    await request(app).post("/auth/verify-email").send({ token: verifyToken });

    // Initial Login
    const login1 = await request(app)
      .post("/auth/login")
      .send({ email, password });
    let cookieHeader = formatCookieHeader(getAuthCookies(login1));

    // Setup MFA
    const mfaSetupRes = await request(app)
      .post("/auth/mfa/setup")
      .set("Cookie", cookieHeader);
    expect(mfaSetupRes.status).toBe(200);
    const mfaSecret = mfaSetupRes.body.data.secret;

    // Verify MFA setup with live TOTP code
    const validSetupCode = generateSync({ secret: mfaSecret });
    const verifySetupRes = await request(app)
      .post("/auth/mfa/verify-setup")
      .set("Cookie", cookieHeader)
      .send({ code: validSetupCode });
    expect(verifySetupRes.status).toBe(200);
    expect(verifySetupRes.body.data.recoveryCodes).toHaveLength(10);

    // Logout
    await request(app).post("/auth/logout").set("Cookie", cookieHeader);

    // Login again -> returns mfaRequired
    const login2 = await request(app)
      .post("/auth/login")
      .send({ email, password });
    expect(login2.status).toBe(200);
    expect(login2.body.data.mfaRequired).toBe(true);
    const mfaToken = login2.body.data.mfaToken;
    expect(mfaToken).toBeDefined();

    // Verify MFA login challenge with valid TOTP code
    const validLoginCode = generateSync({ secret: mfaSecret });
    const verifyLoginRes = await request(app)
      .post("/auth/mfa/verify")
      .send({ mfaToken, code: validLoginCode });
    expect(verifyLoginRes.status).toBe(200);

    const mfaLoginCookies = getAuthCookies(verifyLoginRes);
    const mfaCookieHeader = formatCookieHeader(mfaLoginCookies);

    // Access profile successfully
    const meRes = await request(app)
      .get("/auth/me")
      .set("Cookie", mfaCookieHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);
  });

  it("Journey 3: Forgot Password → Reset Password → Old Session Revocation", async () => {
    const email = `e2e-pwd-${Date.now()}@authsphere.test`;
    const oldPassword = "OldPassword123!";
    const newPassword = "NewPassword123!";

    // Signup + verify
    await request(app)
      .post("/auth/signup")
      .send({ email, password: oldPassword });
    const token = getLastSentVerificationEmail()!.token;
    await request(app).post("/auth/verify-email").send({ token });

    // Login and establish active session
    const login1 = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });
    const oldCookieHeader = formatCookieHeader(getAuthCookies(login1));

    // Request forgot password
    await request(app).post("/auth/forgot-password").send({ email });
    const resetEmail = getLastSentForgotPasswordEmail();
    expect(resetEmail).toBeDefined();

    // Reset password with token from email
    const resetRes = await request(app)
      .post("/auth/reset-password")
      .send({ token: resetEmail!.token, password: newPassword });
    expect(resetRes.status).toBe(200);

    // Invariant: Old session MUST be invalidated in DB (refresh fails)
    const refreshWithOldCookie = await request(app)
      .post("/auth/refresh-token")
      .set("Cookie", oldCookieHeader);
    expect(refreshWithOldCookie.status).toBe(401);

    // Unauthenticated request without cookies returns 401
    const meWithoutCookies = await request(app).get("/auth/me");
    expect(meWithoutCookies.status).toBe(401);

    // Old password fails
    const failedLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: oldPassword });
    expect(failedLogin.status).toBe(401);

    // New password succeeds
    const newLogin = await request(app)
      .post("/auth/login")
      .send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });
});
