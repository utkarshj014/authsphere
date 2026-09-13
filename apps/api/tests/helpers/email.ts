import { vi } from "vitest";

export interface SentEmail {
  token: string;
  email: string;
}

export interface SentSecurityAlert {
  email: string;
  eventType: string;
}

export const emailQueueMocks = {
  enqueueVerificationEmail: vi.fn(
    async (email: string, token: string) => undefined,
  ),
  enqueuePasswordResetEmail: vi.fn(
    async (email: string, token: string) => undefined,
  ),
  enqueueMagicLinkEmail: vi.fn(
    async (email: string, token: string) => undefined,
  ),
  enqueueSecurityNotificationEmail: vi.fn(
    async (email: string, eventType: string) => undefined,
  ),
  enqueueEmailJob: vi.fn(async () => undefined),
};

export function resetEmailMocks() {
  emailQueueMocks.enqueueVerificationEmail.mockClear();
  emailQueueMocks.enqueuePasswordResetEmail.mockClear();
  emailQueueMocks.enqueueMagicLinkEmail.mockClear();
  emailQueueMocks.enqueueSecurityNotificationEmail.mockClear();
  emailQueueMocks.enqueueEmailJob.mockClear();
}

export function getLastSentVerificationEmail(): SentEmail | undefined {
  const calls = emailQueueMocks.enqueueVerificationEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [email, token] = calls[calls.length - 1];
  return { email, token };
}

export function getLastSentForgotPasswordEmail(): SentEmail | undefined {
  const calls = emailQueueMocks.enqueuePasswordResetEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [email, token] = calls[calls.length - 1];
  return { email, token };
}

export function getLastSentMagicLinkEmail(): SentEmail | undefined {
  const calls = emailQueueMocks.enqueueMagicLinkEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [email, token] = calls[calls.length - 1];
  return { email, token };
}

export function getLastSentSecurityNotificationEmail():
  | SentSecurityAlert
  | undefined {
  const calls = emailQueueMocks.enqueueSecurityNotificationEmail.mock.calls;
  if (calls.length === 0) return undefined;
  const [email, eventType] = calls[calls.length - 1];
  return { email, eventType };
}
