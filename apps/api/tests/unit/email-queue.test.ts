import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("../../src/modules/email/email.queue.js");

import { emailQueue } from "../../src/lib/queue.js";
import {
  enqueueVerificationEmail,
  enqueuePasswordResetEmail,
  enqueueMagicLinkEmail,
  enqueueSecurityNotificationEmail,
} from "../../src/modules/email/email.queue.js";
import {
  EMAIL_JOB_TYPES,
  SECURITY_NOTIFICATION_EVENTS,
} from "../../src/modules/email/email.types.js";

describe("Email Queue Enqueue Operations", () => {
  beforeEach(() => {
    vi.spyOn(emailQueue, "add").mockResolvedValue({} as any);
  });

  it("enqueueVerificationEmail adds a verification job with correct data", async () => {
    await enqueueVerificationEmail("test@example.com", "token123");

    expect(emailQueue.add).toHaveBeenCalledWith(EMAIL_JOB_TYPES.VERIFICATION, {
      type: EMAIL_JOB_TYPES.VERIFICATION,
      email: "test@example.com",
      token: "token123",
    });
  });

  it("enqueuePasswordResetEmail adds a password reset job with correct data", async () => {
    await enqueuePasswordResetEmail("reset@example.com", "reset-token-456");

    expect(emailQueue.add).toHaveBeenCalledWith(
      EMAIL_JOB_TYPES.PASSWORD_RESET,
      {
        type: EMAIL_JOB_TYPES.PASSWORD_RESET,
        email: "reset@example.com",
        token: "reset-token-456",
      },
    );
  });

  it("enqueueMagicLinkEmail adds a magic link job with correct data", async () => {
    await enqueueMagicLinkEmail("magic@example.com", "magic-token-789");

    expect(emailQueue.add).toHaveBeenCalledWith(EMAIL_JOB_TYPES.MAGIC_LINK, {
      type: EMAIL_JOB_TYPES.MAGIC_LINK,
      email: "magic@example.com",
      token: "magic-token-789",
    });
  });

  it("enqueueSecurityNotificationEmail adds a security notification job with correct event type", async () => {
    await enqueueSecurityNotificationEmail(
      "sec@example.com",
      SECURITY_NOTIFICATION_EVENTS.PASSWORD_CHANGED,
    );

    expect(emailQueue.add).toHaveBeenCalledWith(
      EMAIL_JOB_TYPES.SECURITY_NOTIFICATION,
      {
        type: EMAIL_JOB_TYPES.SECURITY_NOTIFICATION,
        email: "sec@example.com",
        eventType: SECURITY_NOTIFICATION_EVENTS.PASSWORD_CHANGED,
      },
    );
  });
});
