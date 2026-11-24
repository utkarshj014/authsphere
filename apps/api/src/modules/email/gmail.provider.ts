import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import { EmailDeliveryError, type EmailProvider } from "./email.types.js";

let transporter: Transporter | null = null;

const TIMEOUT_MS = 5000; // Fast fail: bounds delays before BullMQ retries

export const gmailProvider: EmailProvider = {
  name: "gmail",

  async send({ to, subject, html }) {
    if (!env.GMAIL_USER) {
      throw new EmailDeliveryError("GMAIL_USER is not configured", true);
    }

    const hasAppPassword = Boolean(env.GMAIL_APP_PASSWORD);
    const hasOAuth2 = Boolean(
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET &&
      env.GMAIL_REFRESH_TOKEN,
    );

    if (!hasAppPassword && !hasOAuth2) {
      throw new EmailDeliveryError(
        "Gmail credentials are not configured. Provide GMAIL_APP_PASSWORD or OAuth2 refresh credentials.",
        true,
      );
    }

    // Lazy singleton: reuses transporter instance across invocations.
    if (!transporter) {
      if (hasAppPassword) {
        // Mode A: Gmail SMTP with Google App Password (Recommended: no OAuth scope verification or domain required)
        transporter = nodemailer.createTransport({
          service: "gmail",
          connectionTimeout: TIMEOUT_MS,
          greetingTimeout: TIMEOUT_MS,
          socketTimeout: TIMEOUT_MS,
          auth: {
            user: env.GMAIL_USER,
            pass: env.GMAIL_APP_PASSWORD!.replace(/\s+/g, ""),
          },
        });
      } else {
        // Mode B: Gmail OAuth2 Refresh Token (Preserved alternative)
        transporter = nodemailer.createTransport({
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
      }
    }

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
        `Gmail [${responseCode || errorObj?.code || "error"}]: ${message}`,
        isPermanent,
      );
    }
  },
};

// Backward-compatible alias for existing consumers and tests
export const gmailOAuthProvider = gmailProvider;
