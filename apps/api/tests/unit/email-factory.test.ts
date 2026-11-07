import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEmailProvider } from "../../src/modules/email/email.factory.js";
import { env } from "../../src/config/env.js";

describe("email.factory - Dynamic Email Provider Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
