import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { EmailDeliveryError, type EmailProvider } from "./email.types.js";

let transporter: Transporter | null = null;

const TIMEOUT_MS = 5000; // Fast fail: Google SMTP & token exchange complete in <1s; bounds delays before BullMQ retries

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

    // Lazy singleton: reuses the transporter instance and in-memory OAuth2 token cache across invocations.
    transporter ??= nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
      auth: {
        type: "OAuth2",
        user: env.GMAIL_USER,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
        requestTimeout: TIMEOUT_MS,
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
      transporter = null;

      if (err instanceof EmailDeliveryError) {
        throw err;
      }

      const errorObj = err as {
        message?: string;
        responseCode?: number;
        code?: string;
      };
      const message = errorObj?.message || "Unknown Gmail delivery error";
      const responseCode = errorObj?.responseCode || 0;

      const isPermanent =
        (responseCode >= 500 && responseCode < 600) ||
        /invalid|rejected|unauthorized|invalid_grant|recipient/i.test(message);

      throw new EmailDeliveryError(
        `Gmail OAuth2 [${responseCode || errorObj?.code || "error"}]: ${message}`,
        isPermanent,
      );
    }
  },
};
