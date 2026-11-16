/// <reference path="../../../src/types/express.d.ts" />

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createOAuthState,
  consumeOAuthState,
  initiateOAuth,
  handleOAuthCallback,
} from "../../../src/modules/auth/oauth/oauth.service.js";
import { googleOAuthProvider } from "../../../src/modules/auth/oauth/google.provider.js";
import {
  prisma,
  createVerifiedUser,
  createOAuthUser,
  createMfaUser,
  createSession,
  createExpiredSession,
} from "../../helpers/index.js";
import type { OAuthProviderName } from "@authsphere/shared";

describe("OAuth Service Integration (State & Identity Resolution)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createOAuthState stores state in Redis and consumeOAuthState atomically consumes it", async () => {
    const state = await createOAuthState("GOOGLE");
    expect(state).toHaveLength(64);

    const consumed = await consumeOAuthState(state, "GOOGLE");
    expect(consumed.provider).toBe("GOOGLE");

    // Second consume attempt should fail (single-use / replay prevention)
    await expect(consumeOAuthState(state, "GOOGLE")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("already consumed"),
    });
  });

  it("consumeOAuthState throws 400 on provider mismatch", async () => {
    const state = await createOAuthState("GOOGLE");

    await expect(consumeOAuthState(state, "GITHUB")).rejects.toMatchObject({
      statusCode: 400,
      message: "OAuth state provider mismatch",
    });
  });

  it("initiateOAuth returns authorization URL containing state parameter for Google and GitHub", async () => {
    const { redirectUrl: googleUrlStr, state: googleState } =
      await initiateOAuth("GOOGLE");
    const googleUrl = new URL(googleUrlStr);
    expect(googleUrl.hostname).toContain("accounts.google.com");
    expect(googleUrl.searchParams.get("state")).toBe(googleState);

    const { redirectUrl: githubUrlStr, state: githubState } =
      await initiateOAuth("GITHUB");
    const githubUrl = new URL(githubUrlStr);
    expect(githubUrl.hostname).toContain("github.com");
    expect(githubUrl.searchParams.get("state")).toBe(githubState);
  });

  it("handleOAuthCallback creates new user and oauth account for first-time login", async () => {
    const providerId = `google-sub-${Date.now()}`;
    const email = `new-oauth-${Date.now()}@authsphere.test`;

    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId,
      email,
      firstName: "Google",
      lastName: "User",
      avatarUrl: null,
    });

    const state = await createOAuthState("GOOGLE");

    const result = await handleOAuthCallback(
      "GOOGLE",
      "mock-auth-code",
      state,
      "127.0.0.1",
      "Vitest-Agent",
    );

    expect(result.mfaRequired).toBe(false);
    if (!result.mfaRequired && "tokens" in result) {
      expect(result.tokens.accessToken).toBeDefined();
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

  it("handleOAuthCallback logs in existing OAuth user without duplication", async () => {
    const { user, providerId } = await createOAuthUser("GOOGLE");

    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId,
      email: user.email,
      firstName: "Google",
      lastName: "User",
      avatarUrl: null,
    });

    const state = await createOAuthState("GOOGLE");

    const result = await handleOAuthCallback(
      "GOOGLE",
      "mock-auth-code",
      state,
      "127.0.0.1",
    );

    expect(result.mfaRequired).toBe(false);

    // Verify no extra user created
    const count = await prisma.user.count({ where: { email: user.email } });
    expect(count).toBe(1);
  });

  it("handleOAuthCallback triggers MFA challenge when user has MFA enabled", async () => {
    const { user } = await createMfaUser();
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
      "mock-auth-code",
      state,
      "127.0.0.1",
    );

    expect(result.mfaRequired).toBe(true);
    if (result.mfaRequired && "mfaToken" in result) {
      expect(result.mfaToken).toBeDefined();
      const challenge = await prisma.mfaChallenge.findUnique({
        where: { id: result.mfaToken },
      });
      expect(challenge).toBeDefined();
      expect(challenge?.userId).toBe(user.id);
    }
  });

  it("handleOAuthCallback links OAuth account when user is authenticated (explicit linking)", async () => {
    const { user } = await createVerifiedUser();
    const { session } = await createSession(user.id);
    const newGoogleId = `new-google-${Date.now()}`;

    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: newGoogleId,
      email: user.email,
      firstName: "Google",
      lastName: "User",
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

    const linkedAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider: "GOOGLE",
          providerId: newGoogleId,
        },
      },
    });
    expect(linkedAccount).toBeDefined();
    expect(linkedAccount?.userId).toBe(user.id);
  });

  it("handleOAuthCallback throws 401 when initiating linking session has expired or is revoked, even if OAuth account already exists", async () => {
    const { user } = await createVerifiedUser();
    const { session: expiredSession } = await createExpiredSession(user.id);
    const existingGoogleId = `existing-google-${Date.now()}`;

    // Account is already linked to user
    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: "GOOGLE",
        providerId: existingGoogleId,
      },
    });

    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: existingGoogleId,
      email: user.email,
      firstName: "Google",
      lastName: "User",
      avatarUrl: null,
    });

    const state = await createOAuthState("GOOGLE", user.id, expiredSession.id);

    await expect(
      handleOAuthCallback("GOOGLE", "mock-code", state, "127.0.0.1"),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Initiating session is invalid, expired, or revoked",
    });
  });

  it("handleOAuthCallback throws 409 if unauthenticated email exists as password account", async () => {
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
      handleOAuthCallback("GOOGLE", "code", state, "127.0.0.1"),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("already exists"),
    });
  });

  it("handleOAuthCallback throws 409 when linking an OAuth account already linked to another user", async () => {
    const { user: userA } = await createVerifiedUser();
    const { session: sessionA } = await createSession(userA.id);

    const { user: userB } = await createVerifiedUser();
    const { session: sessionB } = await createSession(userB.id);
    const sharedProviderId = `shared-google-${Date.now()}`;

    // Link sharedProviderId to userA
    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: sharedProviderId,
      email: userA.email,
      firstName: "User",
      lastName: "A",
      avatarUrl: null,
    });
    const stateA = await createOAuthState("GOOGLE", userA.id, sessionA.id);
    await handleOAuthCallback("GOOGLE", "code-a", stateA, "127.0.0.1");

    // Now userB attempts to link the exact same providerId
    vi.spyOn(googleOAuthProvider, "getUserProfile").mockResolvedValue({
      providerId: sharedProviderId,
      email: userB.email,
      firstName: "User",
      lastName: "B",
      avatarUrl: null,
    });
    const stateB = await createOAuthState("GOOGLE", userB.id, sessionB.id);

    await expect(
      handleOAuthCallback("GOOGLE", "code-b", stateB, "127.0.0.1"),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "This OAuth account is already linked to another user",
    });
  });
});
