import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("../../src/modules/email/email.queue.js");

vi.mock("../../src/lib/queue.js", () => ({
  EMAIL_QUEUE_NAME: "authsphere-email",
  emailQueue: {
    add: vi.fn().mockResolvedValue({} as any),
  },
  createBullMQConnection: vi.fn(),
}));

vi.mock("../../src/modules/email/email.service.js", () => ({
  emailService: {
    processJob: vi.fn().mockResolvedValue(undefined),
  },
}));

import { emailQueue } from "../../src/lib/queue.js";
import { emailService } from "../../src/modules/email/email.service.js";
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
    vi.clearAllMocks();
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

  it("dispatches email job inline asynchronously when QUEUE_DRIVER is inline", async () => {
    const { env } = await import("../../src/config/env.js");
    const originalDriver = env.QUEUE_DRIVER;
    (env as any).QUEUE_DRIVER = "inline";

    try {
      await enqueueVerificationEmail("inline@example.com", "inline-tok-123");
      expect(emailQueue.add).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(emailService.processJob).toHaveBeenCalledWith(
          expect.objectContaining({
            type: EMAIL_JOB_TYPES.VERIFICATION,
            email: "inline@example.com",
            token: "inline-tok-123",
          }),
          expect.anything(),
        );
      });
    } finally {
      (env as any).QUEUE_DRIVER = originalDriver;
    }
  });

  it("dispatches email job synchronously when QUEUE_DRIVER is sync", async () => {
    const { env } = await import("../../src/config/env.js");
    const originalDriver = env.QUEUE_DRIVER;
    (env as any).QUEUE_DRIVER = "sync";

    try {
      await enqueueVerificationEmail("sync@example.com", "sync-tok-456");
      expect(emailQueue.add).not.toHaveBeenCalled();
      expect(emailService.processJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EMAIL_JOB_TYPES.VERIFICATION,
          email: "sync@example.com",
          token: "sync-tok-456",
        }),
        expect.anything(),
      );
    } finally {
      (env as any).QUEUE_DRIVER = originalDriver;
    }
  });
});
