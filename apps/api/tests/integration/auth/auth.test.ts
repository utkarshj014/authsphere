import { describe, it, expect } from "vitest";
import { authService } from "../../../src/modules/auth/auth.service.js";
import {
  prisma,
  createUser,
  createVerifiedUser,
  createMfaUser,
  createOAuthUser,
  createSession,
  getEmailMocks,
  getLastSentVerificationEmail,
  getLastSentMagicLinkEmail,
  getLastSentForgotPasswordEmail,
} from "../../helpers/index.js";
import {
  UnauthorizedError,
  AppError,
} from "../../../src/common/errors/index.js";
import { verifyPassword } from "../../../src/lib/crypto/password.js";
import { hashToken } from "../../../src/lib/crypto/token.js";

describe("Auth Service — Core Integration Suite", () => {
  describe("Signup & Email Verification", () => {
    it("successful signup creates unverified user and dispatches verification email", async () => {
      const email = `signup-test-${Date.now()}@authsphere.test`;
      const password = "ValidPassword123!";

      await authService.signup({
        email,
        password,
        firstName: "Test",
        lastName: "User",
      });

      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationToken: true },
      });

      expect(user).toBeDefined();
      expect(user!.isEmailVerified).toBe(false);
      expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user!.emailVerificationToken).toBeDefined();

      const sentEmail = getLastSentVerificationEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(email);
      expect(sentEmail!.token.length).toBeGreaterThan(0);
    });

    it("duplicate signup with existing email throws 409 Conflict", async () => {
      const email = `duplicate-${Date.now()}@authsphere.test`;
      const password = "ValidPassword123!";

      await authService.signup({ email, password });

      await expect(
        authService.signup({ email, password }),
      ).rejects.toThrowError(AppError);

      await expect(
        authService.signup({ email, password }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Email already in use",
      });
    });

    it("verifyEmail consumes token and sets isEmailVerified to true", async () => {
      const email = `verify-${Date.now()}@authsphere.test`;
      await authService.signup({ email, password: "Password123!" });

      const sentEmail = getLastSentVerificationEmail();
      expect(sentEmail).toBeDefined();

      await authService.verifyEmail({ token: sentEmail!.token });

      const user = await prisma.user.findUnique({
        where: { email },
        include: { emailVerificationToken: true },
      });

      expect(user!.isEmailVerified).toBe(true);
      expect(user!.verifiedAt).toBeDefined();
      expect(user!.emailVerificationToken).toBeNull();
    });
  });

  describe("Login Flow & Authentication Invariants", () => {
    it("valid credentials for verified user returns tokens and creates session", async () => {
      const { user, password } = await createVerifiedUser();

      const result = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
        "Vitest-Agent",
      );

      expect(result.mfaRequired).toBe(false);
      if (!result.mfaRequired) {
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
      }

      const session = await prisma.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).toBeDefined();

      const securityEvent = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGIN_SUCCESS" },
      });
      expect(securityEvent).toBeDefined();
    });

    it("nonexistent user throws 401 UnauthorizedError", async () => {
      await expect(
        authService.login(
          { email: "nonexistent@authsphere.test", password: "Password123!" },
          "127.0.0.1",
        ),
      ).rejects.toThrowError(UnauthorizedError);
    });

    it("wrong password throws 401 and records LOGIN_FAILED event", async () => {
      const { user } = await createVerifiedUser();

      await expect(
        authService.login(
          { email: user.email, password: "IncorrectPassword123!" },
          "127.0.0.1",
        ),
      ).rejects.toThrowError(UnauthorizedError);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGIN_FAILED" },
      });
      expect(event).toBeDefined();
    });

    it("unverified user throws 403 Forbidden", async () => {
      const { user, password } = await createUser({ isEmailVerified: false });

      await expect(
        authService.login({ email: user.email, password }, "127.0.0.1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Email not verified",
      });
    });

    it("social login account without password throws 403", async () => {
      const { user } = await createOAuthUser("GOOGLE");

      await expect(
        authService.login(
          { email: user.email, password: "Password123!" },
          "127.0.0.1",
        ),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("uses social login"),
      });
    });

    it("MFA-enabled user returns mfaRequired: true and challenge token", async () => {
      const { user, password } = await createMfaUser();

      const result = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );

      expect(result.mfaRequired).toBe(true);
      if (result.mfaRequired) {
        expect(result.mfaToken).toBeDefined();

        const challenge = await prisma.mfaChallenge.findUnique({
          where: { id: result.mfaToken },
        });
        expect(challenge).toBeDefined();
        expect(challenge!.userId).toBe(user.id);
      }
    });
  });

  describe("Logout & Session Revocation", () => {
    it("logout removes session and records LOGOUT security event", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );

      if (loginResult.mfaRequired) throw new Error("MFA not expected");
      const refreshToken = loginResult.tokens.refreshToken;

      await authService.logout(refreshToken);

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);

      const logoutEvent = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "LOGOUT" },
      });
      expect(logoutEvent).toBeDefined();
    });

    it("logout without token throws 401 UnauthorizedError", async () => {
      await expect(authService.logout(undefined)).rejects.toThrowError(
        UnauthorizedError,
      );
    });

    it("logoutAll revokes all active sessions for user", async () => {
      const { user } = await createVerifiedUser();

      await createSession(user.id);
      await createSession(user.id);
      await createSession(user.id);

      const initialSessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(initialSessions).toHaveLength(3);

      await authService.logoutAll(user.id, "127.0.0.1", "Vitest-Agent");

      const remainingSessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(remainingSessions).toHaveLength(0);
    });
  });

  describe("Magic Link Flow", () => {
    it("sendMagicLink creates token in DB and dispatches email", async () => {
      const { user } = await createUser();

      await authService.sendMagicLink({ email: user.email });

      const tokenRecord = await prisma.magicLinkToken.findUnique({
        where: { userId: user.id },
      });
      expect(tokenRecord).toBeDefined();

      const sentEmail = getLastSentMagicLinkEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(user.email);
      expect(sentEmail!.token.length).toBeGreaterThan(0);
    });

    it("verifyMagicLink logs in, consumes token, and auto-verifies unverified user", async () => {
      const { user } = await createUser({ isEmailVerified: false });

      await authService.sendMagicLink({ email: user.email });
      const sentEmail = getLastSentMagicLinkEmail();
      expect(sentEmail).toBeDefined();

      const result = await authService.verifyMagicLink(
        { token: sentEmail!.token },
        "127.0.0.1",
        "Vitest-Agent",
      );

      expect(result.mfaRequired).toBe(false);
      if (!result.mfaRequired) {
        expect(result.tokens.accessToken).toBeDefined();
      }

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

    it("verifyMagicLink with MFA enabled returns challenge token", async () => {
      const { user } = await createMfaUser();

      await authService.sendMagicLink({ email: user.email });
      const sentEmail = getLastSentMagicLinkEmail();

      const result = await authService.verifyMagicLink(
        { token: sentEmail!.token },
        "127.0.0.1",
      );

      expect(result.mfaRequired).toBe(true);
      if (result.mfaRequired) {
        expect(result.mfaToken).toBeDefined();
      }
    });

    it("verifyMagicLink with invalid or consumed token throws 400", async () => {
      await expect(
        authService.verifyMagicLink({ token: "invalid-token" }, "127.0.0.1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired magic link token",
      });
    });
  });

  describe("Password Management (Forgot, Reset & Change)", () => {
    it("forgotPassword creates reset token in DB and dispatches email", async () => {
      const { user } = await createVerifiedUser();

      await authService.forgotPassword({ email: user.email });

      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { userId: user.id },
      });
      expect(tokenRecord).toBeDefined();

      const sentEmail = getLastSentForgotPasswordEmail();
      expect(sentEmail).toBeDefined();
      expect(sentEmail!.email).toBe(user.email);
      expect(sentEmail!.token.length).toBeGreaterThan(0);
    });

    it("forgotPassword for nonexistent email returns silently (enumeration safe)", async () => {
      await authService.forgotPassword({ email: "ghost@authsphere.test" });

      const emailMocks = getEmailMocks();
      expect(emailMocks.sendForgotPasswordEmail).not.toHaveBeenCalled();
    });

    it("resetPassword updates password, deletes token, and revokes active sessions", async () => {
      const { user } = await createVerifiedUser();
      await createSession(user.id);

      await authService.forgotPassword({ email: user.email });
      const sentEmail = getLastSentForgotPasswordEmail();
      expect(sentEmail).toBeDefined();

      const newPassword = "BrandNewPassword123!";
      const result = await authService.resetPassword({
        token: sentEmail!.token,
        password: newPassword,
      });

      expect(result.mfaRequired).toBe(false);

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
    });

    it("resetPassword with invalid token throws 400", async () => {
      await expect(
        authService.resetPassword({
          token: "invalid-token-value",
          password: "NewPassword123!",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired reset token",
      });
    });

    it("changePassword updates password when valid old password is provided", async () => {
      const { user, password } = await createVerifiedUser();
      await createSession(user.id);

      const newPassword = "UpdatedPassword123!";
      await authService.changePassword(user.id, {
        oldPassword: password,
        newPassword,
      });

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(await verifyPassword(updatedUser.passwordHash!, newPassword)).toBe(
        true,
      );
      expect(updatedUser.passwordChangedAt).toBeDefined();

      const sessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(sessions).toHaveLength(0);
    });

    it("changePassword rejects wrong old password with 400", async () => {
      const { user } = await createVerifiedUser();

      await expect(
        authService.changePassword(user.id, {
          oldPassword: "WrongOldPassword123!",
          newPassword: "NewPassword123!",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid old password",
      });
    });
  });

  describe("Refresh Token Rotation & Invariants", () => {
    it("valid refresh token rotates token and updates session in DB", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );

      if (loginResult.mfaRequired) throw new Error("MFA not expected");
      const initialRefreshToken = loginResult.tokens.refreshToken;

      const rotatedTokens = await authService.refreshToken(
        "127.0.0.1",
        "Vitest-Agent",
        initialRefreshToken,
      );

      expect(rotatedTokens.accessToken).toBeDefined();
      expect(rotatedTokens.refreshToken).toBeDefined();
      expect(rotatedTokens.refreshToken).not.toBe(initialRefreshToken);

      const session = await prisma.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).toBeDefined();
      expect(session!.tokenHash).toBe(hashToken(rotatedTokens.refreshToken));
    });

    it("missing refresh token throws 401", async () => {
      await expect(
        authService.refreshToken("127.0.0.1", undefined, undefined),
      ).rejects.toThrowError(UnauthorizedError);
    });

    it("invalid JWT refresh token throws 401", async () => {
      await expect(
        authService.refreshToken("127.0.0.1", undefined, "invalid.jwt.token"),
      ).rejects.toThrowError(UnauthorizedError);
    });

    it("token reuse detected → revokes session and throws 401", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );

      if (loginResult.mfaRequired) throw new Error("MFA not expected");
      const firstRefreshToken = loginResult.tokens.refreshToken;

      await authService.refreshToken("127.0.0.1", undefined, firstRefreshToken);

      await expect(
        authService.refreshToken("127.0.0.1", undefined, firstRefreshToken),
      ).rejects.toThrowError(UnauthorizedError);

      const remainingSessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(remainingSessions).toHaveLength(0);
    });
  });

  describe("Security Events Audit Trail", () => {
    it("returns security events in descending chronological order with pagination", async () => {
      const { user } = await createVerifiedUser();

      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: "LOGIN_SUCCESS",
          createdAt: new Date(Date.now() - 3000),
        },
      });
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: "PASSWORD_CHANGED",
          createdAt: new Date(Date.now() - 2000),
        },
      });
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: "LOGOUT",
          createdAt: new Date(Date.now() - 1000),
        },
      });

      const result = await authService.getSecurityEvents(user.id, {
        page: 1,
        limit: 2,
      });

      expect(result.events).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(3);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);

      expect(result.events[0].type).toBe("LOGOUT");
      expect(result.events[1].type).toBe("PASSWORD_CHANGED");
    });

    it("strictly isolates security events between users", async () => {
      const { user: userA } = await createVerifiedUser();
      const { user: userB } = await createVerifiedUser();

      await prisma.securityEvent.create({
        data: {
          userId: userA.id,
          type: "LOGIN_SUCCESS",
        },
      });

      await prisma.securityEvent.create({
        data: {
          userId: userB.id,
          type: "PASSWORD_RESET",
        },
      });

      const eventsA = await authService.getSecurityEvents(userA.id, {
        page: 1,
        limit: 10,
      });
      expect(eventsA.events).toHaveLength(1);
      expect(eventsA.events[0].type).toBe("LOGIN_SUCCESS");

      const eventsB = await authService.getSecurityEvents(userB.id, {
        page: 1,
        limit: 10,
      });
      expect(eventsB.events).toHaveLength(1);
      expect(eventsB.events[0].type).toBe("PASSWORD_RESET");
    });
  });
});
