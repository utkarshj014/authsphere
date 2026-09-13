import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnrecoverableError } from "bullmq";
import { emailService } from "../../src/modules/email/email.service.js";
import {
  EMAIL_JOB_TYPES,
  SECURITY_NOTIFICATION_EVENTS,
  EmailDeliveryError,
  type EmailProvider,
  type EmailPayload,
} from "../../src/modules/email/email.types.js";

describe("emailService.processJob - Template Rendering & Dispatch", () => {
  let mockProvider: EmailProvider;
  let sentPayloads: EmailPayload[];

  beforeEach(() => {
    sentPayloads = [];
    mockProvider = {
      name: "mock",
      send: vi.fn(async (payload: EmailPayload) => {
        sentPayloads.push(payload);
        return { id: "mock-msg-id-123" };
      }),
    };
  });

  it("processes verification email job and dispatches via provider", async () => {
    await emailService.processJob(
      {
        type: EMAIL_JOB_TYPES.VERIFICATION,
        email: "user@example.com",
        token: "test-verification-token",
      },
      mockProvider,
    );

    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    expect(sentPayloads[0]?.to).toBe("user@example.com");
    expect(sentPayloads[0]?.subject).toContain("Verify your email");
    expect(sentPayloads[0]?.html).toContain("test-verification-token");
    expect(sentPayloads[0]?.html).toContain("verify-email?token=");
  });

  it("processes password reset email job and dispatches via provider", async () => {
    await emailService.processJob(
      {
        type: EMAIL_JOB_TYPES.PASSWORD_RESET,
        email: "reset@example.com",
        token: "test-reset-token",
      },
      mockProvider,
    );

    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    expect(sentPayloads[0]?.to).toBe("reset@example.com");
    expect(sentPayloads[0]?.subject).toContain("Reset your password");
    expect(sentPayloads[0]?.html).toContain("test-reset-token");
    expect(sentPayloads[0]?.html).toContain("reset-password?token=");
  });

  it("processes magic link email job and dispatches via provider", async () => {
    await emailService.processJob(
      {
        type: EMAIL_JOB_TYPES.MAGIC_LINK,
        email: "magic@example.com",
        token: "test-magic-token",
      },
      mockProvider,
    );

    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    expect(sentPayloads[0]?.to).toBe("magic@example.com");
    expect(sentPayloads[0]?.subject).toContain("sign-in link");
    expect(sentPayloads[0]?.html).toContain("test-magic-token");
    expect(sentPayloads[0]?.html).toContain("magic-link/verify?token=");
  });

  it("processes security notification email job with formatted message", async () => {
    await emailService.processJob(
      {
        type: EMAIL_JOB_TYPES.SECURITY_NOTIFICATION,
        email: "alert@example.com",
        eventType: SECURITY_NOTIFICATION_EVENTS.PASSWORD_CHANGED,
      },
      mockProvider,
    );

    expect(mockProvider.send).toHaveBeenCalledTimes(1);
    expect(sentPayloads[0]?.to).toBe("alert@example.com");
    expect(sentPayloads[0]?.subject).toBe(
      "Security Alert: Password Changed - AuthSphere",
    );
    expect(sentPayloads[0]?.html).toContain("Password Changed");
    expect(sentPayloads[0]?.html).toContain(
      "The password for your AuthSphere account was successfully changed.",
    );
  });

  it("fails fast with UnrecoverableError on unsupported job type", async () => {
    await expect(
      emailService.processJob(
        {
          type: "unknown.type" as any,
          email: "test@example.com",
        } as any,
        mockProvider,
      ),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it("propagates transient errors for BullMQ worker retry", async () => {
    mockProvider.send = vi
      .fn()
      .mockRejectedValue(new EmailDeliveryError("Rate limit 429", false));

    await expect(
      emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.VERIFICATION,
          email: "user@example.com",
          token: "tok",
        },
        mockProvider,
      ),
    ).rejects.toThrow("Rate limit 429");
  });
});
