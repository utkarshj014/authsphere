import { env } from "../../config/env.js";
import type { EmailProvider } from "./email.types.js";

export async function getEmailProvider(): Promise<EmailProvider> {
  const providerType =
    env.EMAIL_PROVIDER || (env.GMAIL_REFRESH_TOKEN ? "gmail" : "resend");

  if (providerType === "gmail") {
    const { gmailOAuthProvider } = await import("./gmail.provider.js");
    return gmailOAuthProvider;
  }

  const { resendProvider } = await import("./resend.provider.js");
  return resendProvider;
}
