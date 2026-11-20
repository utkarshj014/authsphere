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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; line-height: 1.5; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- Minimal Brand Header -->
          <tr>
            <td style="padding: 28px 32px 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="font-size: 15px; font-weight: 600; color: #0f172a; letter-spacing: -0.02em;">AuthSphere</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Security</span>
                  </td>
                </tr>
              </table>
              <div style="height: 1px; background-color: #f1f5f9; margin-top: 18px;"></div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 32px 32px 32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Minimal Restrained Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">Automated message from AuthSphere Control Plane.</p>
              <p style="margin: 0;">If you did not initiate this request, you can safely disregard this email or review active sessions.</p>
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
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #0f172a; letter-spacing: -0.02em;">Verify Your Email Address</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        Thank you for signing up for AuthSphere. To complete your registration and activate your account, please verify your email address by clicking the button below:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 11px 26px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 6px;">
          Verify Email Address
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        Or copy and paste this link into your browser:<br/>
        <a href="${verifyUrl}" style="color: #0f172a; text-decoration: underline; word-break: break-all;">${verifyUrl}</a>
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
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #0f172a; letter-spacing: -0.02em;">Password Reset Request</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        We received a request to reset your AuthSphere account password. Click the button below to choose a new password:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 11px 26px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 6px;">
          Reset Password
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        This single-use link expires shortly. If you did not request a password reset, no further action is required.
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
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #0f172a; letter-spacing: -0.02em;">Sign in with Magic Link</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        Click the button below to sign in to your AuthSphere account securely without a password:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${magicLinkUrl}" style="display: inline-block; padding: 11px 26px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 6px;">
          Sign In Instantly
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        This single-use link is valid for a short duration. If you did not request this link, you can safely ignore it.
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
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 500; color: #0f172a; letter-spacing: -0.02em;">Security Notification</h2>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 500; color: #991b1b; font-size: 14px;">${escapeHtml(event.title)}</p>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        ${escapeHtml(event.description)}
      </p>
      <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        If you made this change, you can safely disregard this email. If you did not make this change, please secure your account immediately or review active sessions.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Timestamp: ${new Date().toUTCString()}
      </p>
    `,
    );
    return { subject, html };
  },

  socialAccountReminder(
    providers: string[],
    frontendUrl: string = env.FRONTEND_URL,
  ) {
    const formattedProviders =
      providers.length > 0 ? providers.join(", ") : "social login";
    const loginUrl = `${frontendUrl}/login`;
    const subject = "Password reset request on AuthSphere";
    const html = baseTemplate(
      subject,
      `
      <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 500; color: #0f172a; letter-spacing: -0.02em;">Password Reset Request</h2>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        We received a request to reset the password for your AuthSphere account.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">
          Your account was registered using <strong>${escapeHtml(formattedProviders)}</strong> and does not currently have a password.
        </p>
      </div>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
        To access your account, please return to the login page and authenticate using <strong>${escapeHtml(formattedProviders)}</strong>.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 11px 26px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 6px;">
          Proceed to Sign In
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        If you did not initiate this request, you can safely ignore this email. Your account remains secure.
      </p>
    `,
    );
    return { subject, html };
  },
};
