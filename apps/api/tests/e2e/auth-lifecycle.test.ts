import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  getTestApp,
  getLastSentVerificationEmail,
  getLastSentForgotPasswordEmail,
  getAuthCookies,
  formatCookieHeader,
} from "../helpers/index.js";
import { generateSync } from "otplib";
import { googleOAuthProvider } from "../../src/modules/auth/oauth/google.provider.js";
import { githubOAuthProvider } from "../../src/modules/auth/oauth/github.provider.js";

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

  it("Journey 4: OAuth Lifecycle — PKCE Initiation → Login-CSRF Defense → Social Authentication & Profile Access", async () => {
    const providerId = `google-e2e-${Date.now()}`;
    const email = `e2e-oauth-${Date.now()}@authsphere.test`;

    // 1. Initiate OAuth flow
    const initRes = await request(app).get("/auth/oauth/google");
    expect(initRes.status).toBe(302);
    expect(initRes.headers.location).toContain("accounts.google.com");

    const redirectUrl = new URL(initRes.headers.location);
    const state = redirectUrl.searchParams.get("state")!;
    expect(state).toBeDefined();
    expect(redirectUrl.searchParams.get("code_challenge")).toBeDefined();
    expect(redirectUrl.searchParams.get("code_challenge_method")).toBe("S256");

    // Verify browser-bound PKCE cookie was set
    const setCookie = initRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie : [setCookie];
    const verifierCookie = cookieHeader.find((c) =>
      c.startsWith(`oauth_verifier_${state}=`),
    );
    expect(verifierCookie).toBeDefined();
    expect(verifierCookie).toContain("HttpOnly");
    expect(verifierCookie).toContain("Path=/api/auth/oauth");

    const [verifierNameVal] = verifierCookie!.split(";");

    // 2. Security Invariant: Attack without initiating browser's cookie fails (Login CSRF)
    const attackRes = await request(app).get(
      `/auth/oauth/google/callback?code=mock-code&state=${state}`,
    );
    expect(attackRes.status).toBe(400);
    expect(attackRes.body.message).toContain("transaction cookie");

    // 3. Mock upstream profile resolution
    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId,
      email,
      firstName: "OAuth",
      lastName: "User",
      avatarUrl: null,
    });

    // 4. Valid callback with transaction cookie completes authentication
    const callbackRes = await request(app)
      .get(`/auth/oauth/google/callback?code=mock-code&state=${state}`)
      .set("Cookie", verifierNameVal);
    expect(callbackRes.status).toBe(200);

    const authCookies = getAuthCookies(callbackRes);
    expect(authCookies.accessToken).toBeDefined();
    expect(authCookies.refreshToken).toBeDefined();

    // 5. Access protected profile /auth/me with issued session
    const meRes = await request(app)
      .get("/auth/me")
      .set("Cookie", formatCookieHeader(authCookies));
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);

    // 6. Security Invariant: Replay of consumed state fails immediately
    const replayRes = await request(app)
      .get(`/auth/oauth/google/callback?code=mock-code&state=${state}`)
      .set("Cookie", verifierNameVal);
    expect(replayRes.status).toBe(400);
  });

  it("Journey 5: Concurrent Multi-Tab OAuth Flows — Per-Transaction PKCE Isolation & Cross-Tab Collision Defense", async () => {
    // 1. Tab 1 initiates Google flow
    const tab1Init = await request(app).get("/auth/oauth/google");
    expect(tab1Init.status).toBe(302);
    const tab1Url = new URL(tab1Init.headers.location);
    const state1 = tab1Url.searchParams.get("state")!;
    const cookie1Header = tab1Init.headers["set-cookie"]!;
    const verifier1Cookie = (
      Array.isArray(cookie1Header) ? cookie1Header : [cookie1Header]
    ).find((c) => c.startsWith(`oauth_verifier_${state1}=`))!;
    const [cookie1Val] = verifier1Cookie.split(";");

    // 2. Tab 2 initiates GitHub flow concurrently
    const tab2Init = await request(app).get("/auth/oauth/github");
    expect(tab2Init.status).toBe(302);
    const tab2Url = new URL(tab2Init.headers.location);
    const state2 = tab2Url.searchParams.get("state")!;
    const cookie2Header = tab2Init.headers["set-cookie"]!;
    const verifier2Cookie = (
      Array.isArray(cookie2Header) ? cookie2Header : [cookie2Header]
    ).find((c) => c.startsWith(`oauth_verifier_${state2}=`))!;
    const [cookie2Val] = verifier2Cookie.split(";");

    // Assert states and cookie names are isolated per transaction
    expect(state1).not.toBe(state2);
    expect(cookie1Val).toContain(`oauth_verifier_${state1}`);
    expect(cookie2Val).toContain(`oauth_verifier_${state2}`);

    // 3. Security Invariant: Cross-Tab Attack — Callback for Tab 1 carrying only Tab 2's cookie fails
    const crossTabRes = await request(app)
      .get(`/auth/oauth/google/callback?code=code-tab-1&state=${state1}`)
      .set("Cookie", cookie2Val);
    expect(crossTabRes.status).toBe(400);
    expect(crossTabRes.body.message).toContain("transaction cookie");

    // 4. Mock upstream profile resolutions
    const email1 = `tab1-user-${Date.now()}@authsphere.test`;
    const email2 = `tab2-user-${Date.now()}@authsphere.test`;
    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: `google-tab1-${Date.now()}`,
      email: email1,
      firstName: "Tab1",
      lastName: "Google",
      avatarUrl: null,
    });
    vi.spyOn(githubOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: `github-tab2-${Date.now()}`,
      email: email2,
      firstName: "Tab2",
      lastName: "GitHub",
      avatarUrl: null,
    });

    // 5. Tab 1 completes callback with its own cookie
    const tab1Callback = await request(app)
      .get(`/auth/oauth/google/callback?code=code-tab-1&state=${state1}`)
      .set("Cookie", cookie1Val);
    expect(tab1Callback.status).toBe(200);

    // 6. Tab 2 completes callback with its own cookie (unaffected by Tab 1 completion)
    const tab2Callback = await request(app)
      .get(`/auth/oauth/github/callback?code=code-tab-2&state=${state2}`)
      .set("Cookie", cookie2Val);
    expect(tab2Callback.status).toBe(200);
  });
});
