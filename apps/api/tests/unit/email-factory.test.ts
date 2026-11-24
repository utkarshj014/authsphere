import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEmailProvider } from "../../src/modules/email/email.factory.js";
import { env } from "../../src/config/env.js";

describe("email.factory - Dynamic Email Provider Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as any).EMAIL_PROVIDER = undefined;
    (env as any).GMAIL_APP_PASSWORD = undefined;
    (env as any).GMAIL_REFRESH_TOKEN = undefined;
  });

  it("resolves gmail provider when EMAIL_PROVIDER is set to gmail", async () => {
    (env as any).EMAIL_PROVIDER = "gmail";

    const provider = await getEmailProvider();
    expect(provider.name).toBe("gmail");
    expect(typeof provider.send).toBe("function");
  });

  it("resolves resend provider when EMAIL_PROVIDER is set to resend", async () => {
    (env as any).EMAIL_PROVIDER = "resend";

    const provider = await getEmailProvider();
    expect(provider.name).toBe("resend");
    expect(typeof provider.send).toBe("function");
  });

  it("auto-resolves gmail provider when GMAIL_APP_PASSWORD is set without explicit EMAIL_PROVIDER", async () => {
    (env as any).EMAIL_PROVIDER = undefined;
    (env as any).GMAIL_APP_PASSWORD = "test-app-password";

    const provider = await getEmailProvider();
    expect(provider.name).toBe("gmail");
  });

  it("auto-resolves gmail provider when GMAIL_REFRESH_TOKEN is set without explicit EMAIL_PROVIDER", async () => {
    (env as any).EMAIL_PROVIDER = undefined;
    (env as any).GMAIL_REFRESH_TOKEN = "test-refresh-token";

    const provider = await getEmailProvider();
    expect(provider.name).toBe("gmail");
  });

  it("defaults to resend provider when neither gmail credential is set", async () => {
    (env as any).EMAIL_PROVIDER = undefined;
    (env as any).GMAIL_APP_PASSWORD = undefined;
    (env as any).GMAIL_REFRESH_TOKEN = undefined;

    const provider = await getEmailProvider();
    expect(provider.name).toBe("resend");
  });
});
