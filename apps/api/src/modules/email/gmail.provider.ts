import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { EmailDeliveryError, type EmailProvider } from "./email.types.js";

let transporter: Transporter | null = null;

export const gmailOAuthProvider: EmailProvider = {
  name: "gmail",

  async send({ to, subject, html }) {
    if (
      !env.GMAIL_USER ||
      !env.GOOGLE_CLIENT_ID ||
      !env.GOOGLE_CLIENT_SECRET ||
      !env.GMAIL_REFRESH_TOKEN
    ) {
      throw new EmailDeliveryError(
        "Gmail OAuth2 credentials are not configured",
        true,
      );
    }

    // Lazy singleton: preserves OAuth2 token cache and SMTP connection pool across dispatches without eager top-level initialization
    // Explicit timeouts bound SMTP duration within Lambda's 15s execution ceiling
    transporter ??= nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
      auth: {
        type: "OAuth2",
        user: env.GMAIL_USER,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `"AuthSphere" <${env.GMAIL_USER}>`,
        to,
        subject,
        html,
      });

      return { id: info.messageId || "gmail-sent" };
    } catch (err: unknown) {
      const errorObj = err as { message?: string; responseCode?: number };
      const message = errorObj?.message || "Unknown Gmail delivery error";
      const responseCode = errorObj?.responseCode || 0;

      const isPermanent =
        (responseCode >= 500 && responseCode < 600) ||
        /invalid|rejected|unauthorized|invalid_grant|recipient/i.test(message);

      throw new EmailDeliveryError(
        `Gmail OAuth2 [${responseCode || "error"}]: ${message}`,
        isPermanent,
      );
    }
  },
};
