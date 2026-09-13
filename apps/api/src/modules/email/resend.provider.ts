import { Resend } from "resend";
import { env } from "../../config/env.js";
import { EmailDeliveryError, type EmailProvider } from "./email.types.js";

const resend = new Resend(env.RESEND_API_KEY);

export const resendProvider: EmailProvider = {
  name: "resend",

  async send({ to, subject, html }) {
    const { data, error } = await resend.emails.send({
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
