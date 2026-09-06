import { vi } from "vitest";

export interface SentEmail {
  token: string;
  email: string;
}

export const emailMocks = {
  sendVerificationEmail: vi.fn(
    async (verificationToken: string, userEmail: string) => "email sent",
  ),
  sendForgotPasswordEmail: vi.fn(
    async (passwordResetToken: string, userEmail: string) => "email sent",
  ),
  sendMagicLinkEmail: vi.fn(
    async (magicLinkToken: string, userEmail: string) => "email sent",
  ),
};

export function getEmailMocks() {
  return emailMocks;
}

export function resetEmailMocks() {
  emailMocks.sendVerificationEmail.mockClear();
  emailMocks.sendForgotPasswordEmail.mockClear();
  emailMocks.sendMagicLinkEmail.mockClear();
}

export function getLastSentVerificationEmail(): SentEmail | undefined {
  const calls = emailMocks.sendVerificationEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [token, email] = calls[calls.length - 1];
  return { token, email };
}

export function getLastSentForgotPasswordEmail(): SentEmail | undefined {
  const calls = emailMocks.sendForgotPasswordEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [token, email] = calls[calls.length - 1];
  return { token, email };
}

export function getLastSentMagicLinkEmail(): SentEmail | undefined {
  const calls = emailMocks.sendMagicLinkEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [token, email] = calls[calls.length - 1];
  return { token, email };
}
