import { describe, it, expect } from "vitest";
import { authService } from "../../../src/modules/auth/auth.service.js";
import {
  prisma,
  createVerifiedUser,
  createMfaUser,
  createSession,
  getLastSentSecurityNotificationEmail,
} from "../../helpers/index.js";
import { generateSync } from "otplib";

describe("MFA Lifecycle Integration (Setup, Login, Recovery, Disable)", () => {
  describe("MFA Setup & Verification", () => {
    it("initiates setup and returns secret and otpauth URI", async () => {
      const { user } = await createVerifiedUser();
      const setup = await authService.mfaSetup(user.id);

      expect(setup.secret).toBeDefined();
      expect(setup.otpauthUri).toContain("otpauth://totp/");

      const dbUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(dbUser.mfaSecret).toBeDefined();
      expect(dbUser.mfaEnabled).toBe(false);
    });

    it("throws 400 if MFA is already enabled", async () => {
      const { user } = await createMfaUser();

      await expect(authService.mfaSetup(user.id)).rejects.toMatchObject({
        statusCode: 400,
        message: "MFA is already enabled",
      });
    });

    it("enables MFA and returns 10 recovery codes upon valid TOTP verification", async () => {
      const { user } = await createVerifiedUser();
      const setup = await authService.mfaSetup(user.id);
      const validTotp = generateSync({ secret: setup.secret });

      const result = await authService.mfaVerifySetup(user.id, {
        code: validTotp,
      });

      expect(result.recoveryCodes).toHaveLength(10);

      const updatedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { mfaRecoveryCodes: true },
      });
      expect(updatedUser.mfaEnabled).toBe(true);
      expect(updatedUser.mfaRecoveryCodes).toHaveLength(10);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "MFA_ENABLED" },
      });
      expect(event).toBeDefined();
    });

    it("throws 400 when verifying setup with invalid code", async () => {
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
    it("fulfills login challenge with valid TOTP and issues auth tokens", async () => {
      const { user, password, rawSecret } = await createMfaUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );

      expect(loginResult.mfaRequired).toBe(true);
      if (!loginResult.mfaRequired) throw new Error("Expected MFA");

      const validCode = generateSync({ secret: rawSecret });
      const result = await authService.mfaVerifyLogin(
        { mfaToken: loginResult.mfaToken, code: validCode },
        "127.0.0.1",
        "Vitest-Agent",
      );

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      const challenge = await prisma.mfaChallenge.findUnique({
        where: { id: loginResult.mfaToken },
      });
      expect(challenge).toBeNull();
    });

    it("fulfills login challenge with valid recovery code and marks it used", async () => {
      const { user, password, recoveryCodes } = await createMfaUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!loginResult.mfaRequired) throw new Error("Expected MFA");

      const codeToUse = recoveryCodes[0];
      const result = await authService.mfaVerifyLogin(
        { mfaToken: loginResult.mfaToken, code: codeToUse },
        "127.0.0.1",
      );

      expect(result.tokens.accessToken).toBeDefined();

      const usedCode = await prisma.mfaRecoveryCode.findFirst({
        where: { userId: user.id, usedAt: { not: null } },
      });
      expect(usedCode).toBeDefined();
    });

    it("rejects re-use of already consumed recovery code with 400", async () => {
      const { user, password, recoveryCodes } = await createMfaUser();
      const codeToUse = recoveryCodes[0];

      const login1 = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!login1.mfaRequired) throw new Error("Expected MFA");
      await authService.mfaVerifyLogin(
        { mfaToken: login1.mfaToken, code: codeToUse },
        "127.0.0.1",
      );

      const login2 = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!login2.mfaRequired) throw new Error("Expected MFA");

      await expect(
        authService.mfaVerifyLogin(
          { mfaToken: login2.mfaToken, code: codeToUse },
          "127.0.0.1",
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("records single LOGIN_FAILED event when MFA code verification fails (no premature login success)", async () => {
      const { user, password } = await createMfaUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (!loginResult.mfaRequired) throw new Error("Expected MFA");

      // Verify no login success was logged prior to MFA fulfillment
      const preMfaEvents = await prisma.securityEvent.findMany({
        where: { userId: user.id },
      });
      expect(
        preMfaEvents.filter((e) => e.type === "LOGIN_SUCCESS"),
      ).toHaveLength(0);

      // Submit invalid code
      await expect(
        authService.mfaVerifyLogin(
          { mfaToken: loginResult.mfaToken, code: "000000" },
          "127.0.0.1",
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
      });

      // Verify activity ledger contains only the LOGIN_FAILED event
      const postMfaEvents = await prisma.securityEvent.findMany({
        where: { userId: user.id },
      });
      expect(postMfaEvents).toHaveLength(1);
      expect(postMfaEvents[0].type).toBe("LOGIN_FAILED");
    });

    it("regenerates 10 new recovery codes and invalidates old ones", async () => {
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

      const profileAfterRegen = await authService.getCurrentUser(user.id);
      expect(profileAfterRegen.remainingRecoveryCodes).toBe(10);
    });
  });

  describe("Profile Recovery Codes Introspection", () => {
    it("returns remainingRecoveryCodes for MFA users and undefined for non-MFA users", async () => {
      const { user: nonMfaUser } = await createVerifiedUser();
      const nonMfaProfile = await authService.getCurrentUser(nonMfaUser.id);
      expect(nonMfaProfile.mfaEnabled).toBe(false);
      expect(nonMfaProfile.remainingRecoveryCodes).toBeUndefined();

      const { user: mfaUser, recoveryCodes } = await createMfaUser();
      const mfaProfile = await authService.getCurrentUser(mfaUser.id);
      expect(mfaProfile.mfaEnabled).toBe(true);
      expect(mfaProfile.remainingRecoveryCodes).toBe(10);

      // Consume 1 recovery code via login challenge
      const loginRes = await authService.login(
        { email: mfaUser.email, password: "Password123!" },
        "127.0.0.1",
      );
      if (!loginRes.mfaRequired) {
        throw new Error("Expected MFA challenge required");
      }
      await authService.mfaVerifyLogin(
        { mfaToken: loginRes.mfaToken, code: recoveryCodes[0] },
        "127.0.0.1",
      );

      const profileAfterUse = await authService.getCurrentUser(mfaUser.id);
      expect(profileAfterUse.remainingRecoveryCodes).toBe(9);
    });
  });

  describe("MFA Disable", () => {
    it("clears MFA fields, deletes recovery codes, and revokes active sessions", async () => {
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

    it("throws 400 with invalid code and preserves MFA status", async () => {
      const { user } = await createMfaUser();

      await expect(
        authService.mfaDisable(user.id, { code: "999999" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("Invalid"),
      });

      const dbUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(dbUser.mfaEnabled).toBe(true);
    });
  });
});
