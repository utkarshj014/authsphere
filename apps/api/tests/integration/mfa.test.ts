import { describe, it, expect } from "vitest";
import request from "supertest";
import { generateSync } from "otplib";
import {
  app,
  prisma,
  createVerifiedUser,
  createMfaUser,
  createSession,
  getAuthCookies,
  getLastSentSecurityNotificationEmail,
} from "../helpers/index.js";
import { authService } from "../../src/modules/auth/auth.service.js";

describe("MFA Integration Suite (Setup, Login Challenge, Recovery, Disablement)", () => {
  describe("MFA Setup & Verification", () => {
    it("initiates TOTP setup, returns secret and otpauth URI, then verifies setup and issues 10 recovery codes", async () => {
      const { user } = await createVerifiedUser();
      const setup = await authService.mfaSetup(user.id);

      expect(setup.secret).toBeDefined();
      expect(setup.otpauthUri).toContain("otpauth://totp/");

      const userBeforeVerify = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(userBeforeVerify.mfaSecret).toBeDefined();
      expect(userBeforeVerify.mfaEnabled).toBe(false);

      const validTotp = generateSync({ secret: setup.secret });
      const result = await authService.mfaVerifySetup(user.id, {
        code: validTotp,
      });

      expect(result.recoveryCodes).toHaveLength(10);

      const userAfterVerify = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { mfaRecoveryCodes: true },
      });
      expect(userAfterVerify.mfaEnabled).toBe(true);
      expect(userAfterVerify.mfaRecoveryCodes).toHaveLength(10);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "MFA_ENABLED" },
      });
      expect(event).toBeDefined();
    });

    it("rejects TOTP setup verification with invalid code with 400", async () => {
      const { user } = await createVerifiedUser();
      await authService.mfaSetup(user.id);

      await expect(
        authService.mfaVerifySetup(user.id, { code: "000000" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid MFA code",
      });
    });
  });

  describe("MFA Login Challenge & Recovery", () => {
    it("login with MFA returns challenge token, and fulfilling challenge with valid TOTP issues auth cookies", async () => {
      const { user, password, rawSecret } = await createMfaUser();

      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: user.email, password });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.mfaRequired).toBe(true);
      const mfaToken = loginRes.body.data.mfaToken;
      expect(mfaToken).toBeDefined();

      const validCode = generateSync({ secret: rawSecret });
      const verifyRes = await request(app)
        .post("/auth/mfa/verify")
        .send({ mfaToken, code: validCode });

      expect(verifyRes.status).toBe(200);
      const cookies = getAuthCookies(verifyRes);
      expect(cookies.accessToken).toBeDefined();
      expect(cookies.refreshToken).toBeDefined();

      const challenge = await prisma.mfaChallenge.findUnique({
        where: { id: mfaToken },
      });
      expect(challenge).toBeNull();
    });

    it("fulfills login challenge with valid recovery code and invalidates it, rejecting reuse with 400", async () => {
      const { user, password, recoveryCodes } = await createMfaUser();
      const codeToUse = recoveryCodes[0];

      // Login 1: fulfill with recovery code
      const login1 = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!login1.mfaRequired) throw new Error("Expected MFA required");

      const result1 = await authService.mfaVerifyLogin(
        { mfaToken: login1.mfaToken, code: codeToUse },
        "127.0.0.1",
      );
      expect(result1.tokens.accessToken).toBeDefined();

      const usedCode = await prisma.mfaRecoveryCode.findFirst({
        where: { userId: user.id, usedAt: { not: null } },
      });
      expect(usedCode).toBeDefined();

      // Login 2: attempt to re-use same recovery code
      const login2 = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!login2.mfaRequired) throw new Error("Expected MFA required");

      await expect(
        authService.mfaVerifyLogin(
          { mfaToken: login2.mfaToken, code: codeToUse },
          "127.0.0.1",
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("regenerates 10 new recovery codes with valid TOTP and invalidates old ones", async () => {
      const {
        user,
        rawSecret,
        recoveryCodeHashes: oldHashes,
      } = await createMfaUser();
      const validCode = generateSync({ secret: rawSecret });

      const result = await authService.mfaRegenerateRecoveryCodes(user.id, {
        code: validCode,
      });

      expect(result.recoveryCodes).toHaveLength(10);

      const newCodes = await prisma.mfaRecoveryCode.findMany({
        where: { userId: user.id },
      });
      expect(newCodes).toHaveLength(10);

      for (const code of newCodes) {
        expect(oldHashes).not.toContain(code.codeHash);
      }
    });
  });

  describe("MFA Disablement", () => {
    it("disables MFA with valid code: clears MFA fields, deletes recovery codes, and revokes active sessions", async () => {
      const { user, rawSecret } = await createMfaUser();
      await createSession(user.id);
      await createSession(user.id);

      const validCode = generateSync({ secret: rawSecret });
      await authService.mfaDisable(user.id, { code: validCode });

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { mfaRecoveryCodes: true, sessions: true },
      });

      expect(updatedUser.mfaEnabled).toBe(false);
      expect(updatedUser.mfaSecret).toBeNull();
      expect(updatedUser.mfaRecoveryCodes).toHaveLength(0);
      expect(updatedUser.sessions).toHaveLength(0);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "MFA_DISABLED" },
      });
      expect(event).toBeDefined();

      const securityAlert = getLastSentSecurityNotificationEmail();
      expect(securityAlert).toBeDefined();
      expect(securityAlert?.email).toBe(user.email);
      expect(securityAlert?.eventType).toBe("MFA_DISABLED");
    });
  });
});
