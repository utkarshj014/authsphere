import { Resend } from "resend";
import { env } from "../../config/env.js";
import { EmailDeliveryError, type EmailProvider } from "./email.types.js";

let resendClient: Resend | null = null;

export const resendProvider: EmailProvider = {
  name: "resend",

  async send({ to, subject, html }) {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new EmailDeliveryError(
        "Resend credentials (RESEND_API_KEY, EMAIL_FROM) are not configured",
        true,
      );
    }

    // Lazy singleton: instantiates once per process while avoiding top-level import crashes when unconfigured
    resendClient ??= new Resend(env.RESEND_API_KEY);
    const { data, error } = await resendClient.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      const errorName = error.name?.toLowerCase() || "";
      const isPermanent =
        errorName.includes("validation") ||
        errorName.includes("invalid") ||
        errorName.includes("missing") ||
        errorName.includes("restricted");

      throw new EmailDeliveryError(
        `Resend [${errorName}]: ${error.message}`,
        isPermanent,
      );
    }

    return data;
  },
};
