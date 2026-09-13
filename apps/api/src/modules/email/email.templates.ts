import { env } from "../../config/env.js";
import type { SecurityNotificationEventType } from "./email.types.js";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
};

export const escapeHtml = (str: string): string =>
  str.replace(/[&<>'"]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);

const baseTemplate = (title: string, bodyContent: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333333; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f7; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 32px 40px; background: #0f172a; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">AuthSphere</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 32px 40px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 8px 0;">This email was sent by AuthSphere Security Service.</p>
              <p style="margin: 0;">If you did not initiate this request, please disregard this email or secure your account.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const emailTemplates = {
  verification(token: string, frontendUrl: string = env.FRONTEND_URL) {
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = "Verify your email address - AuthSphere";
    const html = baseTemplate(
      subject,
      `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a;">Verify Your Email Address</h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">
        Thank you for signing up for AuthSphere. To complete your registration and activate your account, please verify your email address by clicking the button below:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 6px;">
          Verify Email Address
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">
        Or copy and paste this link into your browser:<br/>
        <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
      </p>
    `,
    );
    return { subject, html };
  },

  passwordReset(token: string, frontendUrl: string = env.FRONTEND_URL) {
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = "Reset your password - AuthSphere";
    const html = baseTemplate(
      subject,
      `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a;">Password Reset Request</h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">
        We received a request to reset your AuthSphere account password. Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 6px;">
          Reset Password
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">
        This link is single-use and will expire shortly. If you did not request a password reset, no further action is required.
      </p>
    `,
    );
    return { subject, html };
  },

  magicLink(token: string, frontendUrl: string = env.FRONTEND_URL) {
    const magicLinkUrl = `${frontendUrl}/magic-link/verify?token=${encodeURIComponent(token)}`;
    const subject = "Your sign-in link - AuthSphere";
    const html = baseTemplate(
      subject,
      `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a;">Sign in with Magic Link</h2>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569;">
        Click the button below to sign in to your AuthSphere account securely without a password:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 6px;">
          Sign In Instantly
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8;">
        This sign-in link is single-use and valid for a short duration. If you didn't request this link, you can safely ignore it.
      </p>
    `,
    );
    return { subject, html };
  },

  securityNotification(eventType: SecurityNotificationEventType) {
    const eventMessages: Record<
      SecurityNotificationEventType,
      { title: string; description: string }
    > = {
      PASSWORD_CHANGED: {
        title: "Password Changed",
        description:
          "The password for your AuthSphere account was successfully changed.",
      },
      PASSWORD_RESET: {
        title: "Password Reset",
        description:
          "Your AuthSphere account password was reset using a recovery link.",
      },
      MFA_DISABLED: {
        title: "Two-Factor Authentication Disabled",
        description:
          "Two-factor authentication (MFA) has been turned off for your AuthSphere account.",
      },
    };

    const event = eventMessages[eventType] ?? {
      title: "Security Settings Updated",
      description: "A security setting on your AuthSphere account was updated.",
    };
    const subject = `Security Alert: ${event.title} - AuthSphere`;

    const html = baseTemplate(
      subject,
      `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #dc2626;">Security Notification</h2>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; font-weight: 600; color: #991b1b; font-size: 16px;">${escapeHtml(event.title)}</p>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
        ${escapeHtml(event.description)}
      </p>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">
        If you made this change, you can safely disregard this email. If you did not make this change, please secure your account immediately or contact support.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Timestamp: ${new Date().toUTCString()}
      </p>
    `,
    );
    return { subject, html };
  },
};
