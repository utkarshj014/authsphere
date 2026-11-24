import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  prisma,
  createUser,
  createVerifiedUser,
  createSession,
  authenticate,
  getAuthCookies,
  getLastSentVerificationEmail,
  getLastSentMagicLinkEmail,
  getLastSentForgotPasswordEmail,
  getLastSentSecurityNotificationEmail,
} from "../helpers/index.js";
import { authService } from "../../src/modules/auth/auth.service.js";
import { verifyPassword } from "../../src/lib/crypto/password.js";
import { hashToken } from "../../src/lib/crypto/token.js";

describe("Authentication Integration Suite", () => {
  describe("Signup & Email Verification", () => {
    it("signup creates unverified user and dispatches verification email", async () => {
      const email = `signup-${Date.now()}@authsphere.test`;
      const password = "ValidPassword123!";

      const res = await request(app).post("/auth/signup").send({
        email,
        password,
        firstName: "Test",
        lastName: "User",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationToken: true },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser!.isEmailVerified).toBe(false);
      expect(dbUser!.passwordHash).toMatch(/^\$argon2id\$/);
      expect(dbUser!.emailVerificationToken).toBeDefined();

      const sentEmail = getLastSentVerificationEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(email);
      expect(sentEmail!.token.length).toBeGreaterThan(0);
    });

    it("duplicate signup with existing email returns 409 Conflict", async () => {
      const email = `duplicate-${Date.now()}@authsphere.test`;
      const password = "ValidPassword123!";

      await request(app).post("/auth/signup").send({ email, password });
      const dupRes = await request(app)
        .post("/auth/signup")
        .send({ email, password });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toContain("already in use");
    });

    it("verifyEmail consumes token, marks user verified, and handles idempotent verification", async () => {
      const email = `verify-${Date.now()}@authsphere.test`;
      await request(app)
        .post("/auth/signup")
        .send({ email, password: "Password123!" });

      const sentEmail = getLastSentVerificationEmail();
      expect(sentEmail).toBeDefined();

      const verifyRes = await request(app)
        .post("/auth/verify-email")
        .send({ token: sentEmail!.token });

      expect(verifyRes.status).toBe(200);

      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationToken: true },
      });
      expect(dbUser!.isEmailVerified).toBe(true);
      expect(dbUser!.verifiedAt).toBeDefined();
      expect(dbUser!.emailVerificationToken).toBeNull();

      // Idempotency: re-verifying when user is already verified with active token succeeds cleanly
      const rawToken = `token-idempotent-${Date.now()}`;
      await prisma.emailVerificationToken.create({
        data: {
          tokenHash: hashToken(rawToken),
          userId: dbUser!.id,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const idempotentRes = await request(app)
        .post("/auth/verify-email")
        .send({ token: rawToken });
      expect(idempotentRes.status).toBe(200);
    });

    it("verifyEmail with invalid token throws 400", async () => {
      const res = await request(app)
        .post("/auth/verify-email")
        .send({ token: "invalid-or-nonexistent-token" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Login Flow & Authentication Invariants", () => {
    it("login with valid credentials creates session, records LOGIN_SUCCESS, and issues auth cookies", async () => {
      const { user, password } = await createVerifiedUser();

      const res = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = getAuthCookies(res);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();

      const session = await prisma.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).toBeDefined();

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGIN_SUCCESS" },
      });
      expect(event).toBeDefined();
    });

    it("login with wrong password returns 401 and records LOGIN_FAILED event", async () => {
      const { user } = await createVerifiedUser();

      const res = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password: "WrongPassword123!" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGIN_FAILED" },
      });
      expect(event).toBeDefined();
    });

    it("login with unverified user returns 403 Forbidden", async () => {
      const { user, password } = await createUser({ isEmailVerified: false });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("not verified");
    });
  });

  describe("Logout & Session Revocation", () => {
    it("logout deletes session, clears auth cookies, and records LOGOUT event", async () => {
      const { user, cookieHeader } = await authenticate(app);

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie)
        ? setCookie.join("; ")
        : setCookie;
      expect(cookieStr).toMatch(/Max-Age=0|expires=/i);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGOUT" },
      });
      expect(event).toBeDefined();
    });

    it("logoutAll revokes all active sessions for user and clears cookies", async () => {
      const { user, cookieHeader } = await authenticate(app);

      await createSession(user.id);
      await createSession(user.id);

      const initialCount = await prisma.session.count({
        where: { userId: user.id },
      });
      expect(initialCount).toBe(3);

      const res = await request(app)
        .post("/auth/logout-all")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);

      const remainingCount = await prisma.session.count({
        where: { userId: user.id },
      });
      expect(remainingCount).toBe(0);
    });
  });

  describe("Magic Link Flow", () => {
    it("magic link flow: dispatches email, consumes token, and auto-verifies user", async () => {
      const { user } = await createUser({ isEmailVerified: false });

      const sendRes = await request(app)
        .post("/auth/magic-link")
        .send({ email: user.email });

      expect(sendRes.status).toBe(200);

      const sentEmail = getLastSentMagicLinkEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(user.email);

      const verifyRes = await request(app)
        .post("/auth/magic-link/verify")
        .send({ token: sentEmail!.token });

      expect(verifyRes.status).toBe(200);
      const cookies = getAuthCookies(verifyRes);
      expect(cookies.accessToken).toBeDefined();

      const tokenRecord = await prisma.magicLinkToken.findUnique({
        where: { userId: user.id },
      });
      expect(tokenRecord).toBeNull();

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updatedUser.isEmailVerified).toBe(true);
      expect(updatedUser.verifiedAt).toBeDefined();
    });
  });

  describe("Password Reset Flow", () => {
    it("password reset flow: dispatches email, consumes token, updates password, and revokes prior sessions", async () => {
      const { user } = await createVerifiedUser();
      await createSession(user.id);

      const forgotRes = await request(app)
        .post("/auth/forgot-password")
        .send({ email: user.email });

      expect(forgotRes.status).toBe(200);

      const sentEmail = getLastSentForgotPasswordEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(user.email);

      const newPassword = "BrandNewPassword123!";
      const resetRes = await request(app)
        .post("/auth/reset-password")
        .send({ token: sentEmail!.token, password: newPassword });

      expect(resetRes.status).toBe(200);

      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { userId: user.id },
      });
      expect(tokenRecord).toBeNull();

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(await verifyPassword(updatedUser.passwordHash!, newPassword)).toBe(
        true,
      );

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);

      const securityAlert = getLastSentSecurityNotificationEmail();
      expect(securityAlert).toBeDefined();
      expect(securityAlert?.email).toBe(user.email);
      expect(securityAlert?.eventType).toBe("PASSWORD_RESET");
    });
  });

  describe("Security Events Audit Trail", () => {
    it("security events returns descending chronological paginated events with strict user isolation", async () => {
      const { user: userA } = await createVerifiedUser();
      const { user: userB } = await createVerifiedUser();

      await prisma.securityEvent.create({
        data: {
          userId: userA.id,
          type: "LOGIN_SUCCESS",
          createdAt: new Date(Date.now() - 3000),
        },
      });
      await prisma.securityEvent.create({
        data: {
          userId: userA.id,
          type: "PASSWORD_CHANGED",
          createdAt: new Date(Date.now() - 2000),
        },
      });
      await prisma.securityEvent.create({
        data: {
          userId: userA.id,
          type: "LOGOUT",
          createdAt: new Date(Date.now() - 1000),
        },
      });

      // Tenant isolation: create userB event
      await prisma.securityEvent.create({
        data: {
          userId: userB.id,
          type: "PASSWORD_RESET",
          createdAt: new Date(),
        },
      });

      const resultA = await authService.getSecurityEvents(userA.id, {
        page: 1,
        limit: 2,
      });

      expect(resultA.events).toHaveLength(2);
      expect(resultA.pagination.totalCount).toBe(3);
      expect(resultA.pagination.totalPages).toBe(2);
      expect(resultA.pagination.hasNextPage).toBe(true);

      expect(resultA.events[0].type).toBe("LOGOUT");
      expect(resultA.events[1].type).toBe("PASSWORD_CHANGED");

      // Verify strict isolation: querying userB yields userB's events only
      const resultB = await authService.getSecurityEvents(userB.id, {
        page: 1,
        limit: 10,
      });
      expect(resultB.events).toHaveLength(1);
      expect(resultB.events[0].type).toBe("PASSWORD_RESET");
    });
  });
});
