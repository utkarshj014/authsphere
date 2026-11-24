import { describe, it, expect, vi, afterEach } from "vitest";
import { generateSync } from "otplib";
import {
  createOAuthState,
  consumeOAuthState,
  handleOAuthCallback,
  unlinkOAuthAccount,
} from "../../src/modules/auth/oauth/oauth.service.js";
import { authService } from "../../src/modules/auth/auth.service.js";
import { googleOAuthProvider } from "../../src/modules/auth/oauth/google.provider.js";
import {
  prisma,
  createVerifiedUser,
  createOAuthUser,
  createMfaUser,
  createSession,
} from "../helpers/index.js";

describe("OAuth Integration Suite (State, Callback, Linking & Governance)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("State Token Generation & Atomic Consumption", () => {
    it("state token generation stores state in Redis and atomic GETDEL consumption prevents replay", async () => {
      const state = await createOAuthState(
        "GOOGLE",
        undefined,
        undefined,
        "/app/dashboard",
      );
      expect(state).toHaveLength(64);

      const consumed = await consumeOAuthState(state, "GOOGLE");
      expect(consumed.provider).toBe("GOOGLE");
      expect(consumed.returnTo).toBe("/app/dashboard");

      // Atomic single-use: replay attempt throws 400
      await expect(consumeOAuthState(state, "GOOGLE")).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("already consumed"),
      });
    });
  });

  describe("Callback Login & User Lifecycle", () => {
    it("handleOAuthCallback creates new user and linked OAuth account on first-time login", async () => {
      const providerId = `google-sub-${Date.now()}`;
      const email = `new-oauth-${Date.now()}@authsphere.test`;

      vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
        providerId,
        email,
        firstName: "New",
        lastName: "GoogleUser",
        avatarUrl: null,
      });

      const state = await createOAuthState("GOOGLE");
      const result = await handleOAuthCallback(
        "GOOGLE",
        "mock-code",
        state,
        "127.0.0.1",
        "Vitest-Agent",
      );

      expect(result.mfaRequired).toBe(false);
      if (!result.mfaRequired && "tokens" in result) {
        expect(result.tokens.accessToken).toBeDefined();
        expect(result.tokens.refreshToken).toBeDefined();
      }

      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { oauthAccounts: true },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.isEmailVerified).toBe(true);
      expect(dbUser?.oauthAccounts).toHaveLength(1);
      expect(dbUser?.oauthAccounts[0]?.providerId).toBe(providerId);
    });

    it("handleOAuthCallback logs in existing OAuth user without duplication, triggering MFA if enabled", async () => {
      const { user, rawSecret } = await createMfaUser();
      const providerId = `google-mfa-${Date.now()}`;

      await prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: "GOOGLE",
          providerId,
        },
      });

      vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
        providerId,
        email: user.email,
        firstName: "Mfa",
        lastName: "User",
        avatarUrl: null,
      });

      const state = await createOAuthState("GOOGLE");
      const result = await handleOAuthCallback(
        "GOOGLE",
        "mock-code",
        state,
        "127.0.0.1",
      );

      expect(result.mfaRequired).toBe(true);
      if (!result.mfaRequired || !("mfaToken" in result)) {
        throw new Error("Expected MFA challenge required");
      }

      // Fulfill MFA challenge with TOTP
      const validCode = generateSync({ secret: rawSecret });
      const verifyResult = await authService.mfaVerifyLogin(
        { mfaToken: result.mfaToken, code: validCode },
        "127.0.0.1",
      );

      expect(verifyResult.tokens.accessToken).toBeDefined();

      const userCount = await prisma.user.count({
        where: { email: user.email },
      });
      expect(userCount).toBe(1);

      const event = await prisma.securityEvent.findFirst({
        where: { userId: user.id, type: "OAUTH_LOGIN" },
      });
      expect(event).toBeDefined();
    });
  });

  describe("Conflict Defense & Account Linking", () => {
    it("conflict defense: throws 409 Conflict when unauthenticated OAuth email matches existing password account", async () => {
      const { user } = await createVerifiedUser();

      vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
        providerId: `google-sub-${Date.now()}`,
        email: user.email,
        firstName: "Existing",
        lastName: "User",
        avatarUrl: null,
      });

      const state = await createOAuthState("GOOGLE");

      await expect(
        handleOAuthCallback("GOOGLE", "mock-code", state, "127.0.0.1"),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining("already exists"),
      });
    });

    it("account linking: links OAuth account to authenticated user session", async () => {
      const { user } = await createVerifiedUser();
      const { session } = await createSession(user.id);
      const newProviderId = `new-google-${Date.now()}`;

      vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
        providerId: newProviderId,
        email: user.email,
        firstName: "Google",
        lastName: "Linked",
        avatarUrl: null,
      });

      const state = await createOAuthState("GOOGLE", user.id, session.id);
      const result = await handleOAuthCallback(
        "GOOGLE",
        "mock-code",
        state,
        "127.0.0.1",
      );

      expect(result.mfaRequired).toBe(false);

      const linked = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider: "GOOGLE",
            providerId: newProviderId,
          },
        },
      });
      expect(linked).toBeDefined();
      expect(linked?.userId).toBe(user.id);
    });
  });

  describe("Zero-Orphan Invariant & Unlink Governance", () => {
    it("Zero-Orphan disconnect protection: allows unlinking when password exists, but blocks disconnecting only login method with 400", async () => {
      // 1. Blocks disconnecting only login method
      const { user: oauthOnlyUser } = await createOAuthUser("GOOGLE");
      await expect(
        unlinkOAuthAccount(oauthOnlyUser.id, "GOOGLE"),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("only sign-in method"),
      });

      // 2. Allows unlinking when password exists
      const { user: passwordUser } = await createVerifiedUser();
      await prisma.oAuthAccount.create({
        data: {
          userId: passwordUser.id,
          provider: "GOOGLE",
          providerId: `google-${Date.now()}`,
        },
      });

      await unlinkOAuthAccount(passwordUser.id, "GOOGLE");
      const remainingAccounts = await prisma.oAuthAccount.findMany({
        where: { userId: passwordUser.id },
      });
      expect(remainingAccounts).toHaveLength(0);
    });
  });
});
