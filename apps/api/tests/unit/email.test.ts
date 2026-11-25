import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnrecoverableError } from "bullmq";

const { mockNodemailerSend, mockResendSend } = vi.hoisted(() => ({
  mockNodemailerSend: vi.fn(),
  mockResendSend: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockNodemailerSend,
    })),
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: mockResendSend,
    };
  },
}));

vi.unmock("../../src/modules/email/email.queue.js");

vi.mock("../../src/lib/queue.js", () => ({
  EMAIL_QUEUE_NAME: "authsphere-email",
  emailQueue: {
    add: vi.fn().mockResolvedValue({} as any),
  },
  createBullMQConnection: vi.fn(),
}));

import { env } from "../../src/config/env.js";
import { getEmailProvider } from "../../src/modules/email/email.factory.js";
import { gmailProvider } from "../../src/modules/email/gmail.provider.js";
import { resendProvider } from "../../src/modules/email/resend.provider.js";
import { emailQueue } from "../../src/lib/queue.js";
import { emailService } from "../../src/modules/email/email.service.js";
import {
  enqueueVerificationEmail,
  enqueuePasswordResetEmail,
} from "../../src/modules/email/email.queue.js";
import {
  EMAIL_JOB_TYPES,
  SECURITY_NOTIFICATION_EVENTS,
  EmailDeliveryError,
  type EmailProvider,
  type EmailPayload,
} from "../../src/modules/email/email.types.js";

describe("Email Module Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dynamic Provider Resolution", () => {
    it("resolves Gmail when configured or inferred from credentials, otherwise defaults to Resend", async () => {
      // Explicit Gmail
      (env as any).EMAIL_PROVIDER = "gmail";
      expect((await getEmailProvider()).name).toBe("gmail");

      // Inferred Gmail via App Password
      (env as any).EMAIL_PROVIDER = undefined;
      (env as any).GMAIL_APP_PASSWORD = "app-password";
      expect((await getEmailProvider()).name).toBe("gmail");

      // Inferred Gmail via OAuth2 Refresh Token
      (env as any).GMAIL_APP_PASSWORD = undefined;
      (env as any).GMAIL_REFRESH_TOKEN = "refresh-token";
      expect((await getEmailProvider()).name).toBe("gmail");

      // Default fallback: Resend
      (env as any).GMAIL_REFRESH_TOKEN = undefined;
      expect((await getEmailProvider()).name).toBe("resend");

      // Explicit Resend
      (env as any).EMAIL_PROVIDER = "resend";
      expect((await getEmailProvider()).name).toBe("resend");
    });
  });

  describe("Gmail Provider Adapter", () => {
    beforeEach(() => {
      (env as any).GMAIL_USER = "test@gmail.com";
      (env as any).GMAIL_APP_PASSWORD = "test-password";
    });

    it("successfully sends email and formats payload", async () => {
      mockNodemailerSend.mockResolvedValueOnce({ messageId: "gmail-msg-123" });

      const result = await gmailProvider.send({
        to: "user@example.com",
        subject: "Verify Code",
        html: "<p>Code: 123456</p>",
      });

      expect(result).toEqual({ id: "gmail-msg-123" });
      expect(mockNodemailerSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"AuthSphere" <test@gmail.com>',
          to: "user@example.com",
          subject: "Verify Code",
        }),
      );
    });

    it("classifies missing credentials & 5xx errors as permanent, network errors as retryable", async () => {
      // Missing credentials -> permanent
      (env as any).GMAIL_APP_PASSWORD = undefined;
      (env as any).GMAIL_REFRESH_TOKEN = undefined;
      await expect(
        gmailProvider.send({ to: "user@test.com", subject: "S", html: "H" }),
      ).rejects.toMatchObject({
        name: "EmailDeliveryError",
        isPermanent: true,
      });

      // 5xx responseCode -> permanent
      (env as any).GMAIL_APP_PASSWORD = "pwd";
      mockNodemailerSend.mockRejectedValueOnce({
        responseCode: 550,
        message: "User unknown",
      });
      await expect(
        gmailProvider.send({ to: "user@test.com", subject: "S", html: "H" }),
      ).rejects.toMatchObject({
        name: "EmailDeliveryError",
        isPermanent: true,
      });

      // ECONNRESET -> retryable (not permanent)
      mockNodemailerSend.mockRejectedValueOnce({
        code: "ECONNRESET",
        message: "Connection reset",
      });
      await expect(
        gmailProvider.send({ to: "user@test.com", subject: "S", html: "H" }),
      ).rejects.toMatchObject({
        name: "EmailDeliveryError",
        isPermanent: false,
      });
    });
  });

  describe("Resend Provider Adapter", () => {
    it("successfully sends email and classifies errors into permanent vs retryable", async () => {
      // Successful dispatch
      mockResendSend.mockResolvedValueOnce({
        data: { id: "resend-msg-456" },
        error: null,
      });

      const res = await resendProvider.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hi</p>",
      });
      expect(res).toEqual({ id: "resend-msg-456" });

      // Validation error -> permanent
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { name: "validation_error", message: "Invalid email address" },
      });
      await expect(
        resendProvider.send({ to: "bad", subject: "S", html: "H" }),
      ).rejects.toMatchObject({
        name: "EmailDeliveryError",
        isPermanent: true,
      });

      // Rate limit error -> retryable (isPermanent = false)
      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { name: "rate_limit_exceeded", message: "Rate limit reached" },
      });
      await expect(
        resendProvider.send({ to: "user@test.com", subject: "S", html: "H" }),
      ).rejects.toMatchObject({
        name: "EmailDeliveryError",
        isPermanent: false,
      });
    });
  });

  describe("Queue Driver Execution", () => {
    it("enqueues jobs to BullMQ queue when QUEUE_DRIVER is bullmq", async () => {
      (env as any).QUEUE_DRIVER = "bullmq";

      await enqueueVerificationEmail("verify@example.com", "token-abc");

      expect(emailQueue.add).toHaveBeenCalledWith(
        EMAIL_JOB_TYPES.VERIFICATION,
        {
          type: EMAIL_JOB_TYPES.VERIFICATION,
          email: "verify@example.com",
          token: "token-abc",
        },
      );
    });

    it("dispatches directly via emailService on sync and inline drivers without queue I/O", async () => {
      const spyProcess = vi
        .spyOn(emailService, "processJob")
        .mockResolvedValue({ id: "mock-id" });

      // Sync driver
      (env as any).QUEUE_DRIVER = "sync";
      await enqueuePasswordResetEmail("reset@example.com", "reset-tok");
      expect(emailQueue.add).not.toHaveBeenCalled();
      expect(spyProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EMAIL_JOB_TYPES.PASSWORD_RESET,
          email: "reset@example.com",
          token: "reset-tok",
        }),
        expect.anything(),
      );

      // Inline driver
      (env as any).QUEUE_DRIVER = "inline";
      await enqueueVerificationEmail("inline@example.com", "inline-tok");
      await vi.waitFor(() => {
        expect(spyProcess).toHaveBeenCalledWith(
          expect.objectContaining({
            type: EMAIL_JOB_TYPES.VERIFICATION,
            email: "inline@example.com",
            token: "inline-tok",
          }),
          expect.anything(),
        );
      });

      spyProcess.mockRestore();
    });

    it("catches and logs errors gracefully when sync dispatch fails", async () => {
      const spyProcess = vi
        .spyOn(emailService, "processJob")
        .mockRejectedValue(new Error("SMTP Connection Refused"));

      (env as any).QUEUE_DRIVER = "sync";

      // Must not throw an unhandled exception to the caller
      await expect(
        enqueuePasswordResetEmail("fail@example.com", "fail-tok"),
      ).resolves.toBeUndefined();

      expect(spyProcess).toHaveBeenCalled();
      spyProcess.mockRestore();
    });
  });

  describe("Worker Processing & Template Rendering", () => {
    let mockProvider: EmailProvider;
    let sentPayloads: EmailPayload[];

    beforeEach(() => {
      sentPayloads = [];
      mockProvider = {
        name: "mock",
        send: vi.fn(async (payload: EmailPayload) => {
          sentPayloads.push(payload);
          return { id: "mock-id" };
        }),
      };
    });

    it("renders verification, password reset, and magic link templates with action URLs", async () => {
      // Verification
      await emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.VERIFICATION,
          email: "v@example.com",
          token: "tok-v",
        },
        mockProvider,
      );
      expect(sentPayloads[0]?.subject).toContain("Verify your email");
      expect(sentPayloads[0]?.html).toContain("verify-email?token=tok-v");

      // Password Reset
      await emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.PASSWORD_RESET,
          email: "r@example.com",
          token: "tok-r",
        },
        mockProvider,
      );
      expect(sentPayloads[1]?.subject).toContain("Reset your password");
      expect(sentPayloads[1]?.html).toContain("reset-password?token=tok-r");

      // Magic Link
      await emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.MAGIC_LINK,
          email: "m@example.com",
          token: "tok-m",
        },
        mockProvider,
      );
      expect(sentPayloads[2]?.subject).toContain("sign-in link");
      expect(sentPayloads[2]?.html).toContain("magic-link/verify?token=tok-m");
    });

    it("renders security notifications and social account reminders", async () => {
      // Security notification
      await emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.SECURITY_NOTIFICATION,
          email: "sec@example.com",
          eventType: SECURITY_NOTIFICATION_EVENTS.PASSWORD_CHANGED,
        },
        mockProvider,
      );
      expect(sentPayloads[0]?.subject).toBe(
        "Security Alert: Password Changed - AuthSphere",
      );
      expect(sentPayloads[0]?.html).toContain("Password Changed");

      // Social account reminder
      await emailService.processJob(
        {
          type: EMAIL_JOB_TYPES.SOCIAL_ACCOUNT_REMINDER,
          email: "social@example.com",
          providers: ["Google", "GitHub"],
        },
        mockProvider,
      );
      expect(sentPayloads[1]?.subject).toContain("Password reset request");
      expect(sentPayloads[1]?.html).toContain("Google, GitHub");
    });

    it("fails fast with UnrecoverableError on invalid job types and propagates transient errors", async () => {
      // Unsupported job type
      await expect(
        emailService.processJob(
          { type: "unsupported.type" as any, email: "u@example.com" } as any,
          mockProvider,
        ),
      ).rejects.toBeInstanceOf(UnrecoverableError);

      // Transient delivery error propagation for BullMQ retry
      mockProvider.send = vi
        .fn()
        .mockRejectedValue(new EmailDeliveryError("Transient 429", false));
      await expect(
        emailService.processJob(
          {
            type: EMAIL_JOB_TYPES.VERIFICATION,
            email: "retry@example.com",
            token: "tok",
          },
          mockProvider,
        ),
      ).rejects.toThrow("Transient 429");
    });
  });
});
