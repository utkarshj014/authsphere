import { env } from "../../config/env.js";
import type { EmailProvider } from "./email.types.js";

export async function getEmailProvider(): Promise<EmailProvider> {
  const providerType =
    env.EMAIL_PROVIDER ||
    (env.GMAIL_APP_PASSWORD || env.GMAIL_REFRESH_TOKEN ? "gmail" : "resend");

  if (providerType === "gmail") {
    const { gmailProvider } = await import("./gmail.provider.js");
    return gmailProvider;
  }

  const { resendProvider } = await import("./resend.provider.js");
  return resendProvider;
}
