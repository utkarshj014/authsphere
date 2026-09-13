export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSendResult {
  id: string;
}

export interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<EmailSendResult>;
}

export class EmailDeliveryError extends Error {
  readonly isPermanent: boolean;

  constructor(message: string, isPermanent = false) {
    super(message);
    this.name = "EmailDeliveryError";
    this.isPermanent = isPermanent;
  }
}

export const EMAIL_JOB_TYPES = {
  VERIFICATION: "email.verification",
  PASSWORD_RESET: "email.password-reset",
  MAGIC_LINK: "email.magic-link",
  SECURITY_NOTIFICATION: "email.security-notification",
} as const;

export interface VerificationEmailJobData {
  type: typeof EMAIL_JOB_TYPES.VERIFICATION;
  email: string;
  token: string;
}

export interface PasswordResetEmailJobData {
  type: typeof EMAIL_JOB_TYPES.PASSWORD_RESET;
  email: string;
  token: string;
}

export interface MagicLinkEmailJobData {
  type: typeof EMAIL_JOB_TYPES.MAGIC_LINK;
  email: string;
  token: string;
}

export const SECURITY_NOTIFICATION_EVENTS = {
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET: "PASSWORD_RESET",
  MFA_DISABLED: "MFA_DISABLED",
} as const;

export type SecurityNotificationEventType =
  (typeof SECURITY_NOTIFICATION_EVENTS)[keyof typeof SECURITY_NOTIFICATION_EVENTS];

export interface SecurityNotificationEmailJobData {
  type: typeof EMAIL_JOB_TYPES.SECURITY_NOTIFICATION;
  email: string;
  eventType: SecurityNotificationEventType;
}

export type EmailJobData =
  | VerificationEmailJobData
  | PasswordResetEmailJobData
  | MagicLinkEmailJobData
  | SecurityNotificationEmailJobData;
