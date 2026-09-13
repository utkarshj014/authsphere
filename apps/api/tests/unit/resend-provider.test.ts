import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

import { resendProvider } from "../../src/modules/email/resend.provider.js";
import { EmailDeliveryError } from "../../src/modules/email/email.types.js";

describe("resendProvider - Resend API Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully dispatches email and returns message ID", async () => {
    mockSend.mockResolvedValue({
      data: { id: "msg-resend-123" },
      error: null,
    });

    const result = await resendProvider.send({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ id: "msg-resend-123" });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      }),
    );
  });

  it("classifies validation errors as permanent failure", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        name: "validation_error",
        message: "The recipient address is invalid",
      },
    });

    await expect(
      resendProvider.send({
        to: "bad-email",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      message: expect.stringContaining("validation_error"),
      isPermanent: true,
    });
  });

  it("classifies restricted domain errors as permanent failure", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        name: "domain_restricted",
        message: "Cannot send to restricted domain",
      },
    });

    await expect(
      resendProvider.send({
        to: "restricted@domain.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      isPermanent: true,
    });
  });

  it("classifies rate limit and server errors as transient failure", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        name: "rate_limit_exceeded",
        message: "Too many requests",
      },
    });

    await expect(
      resendProvider.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      message: expect.stringContaining("rate_limit_exceeded"),
      isPermanent: false,
    });
  });

  it("handles unnamed error responses gracefully as transient failure", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        message: "Internal unclassified service issue",
      } as any,
    });

    await expect(
      resendProvider.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      message: "Resend []: Internal unclassified service issue",
      isPermanent: false,
    });
  });

  it("propagates unexpected transport exceptions directly", async () => {
    mockSend.mockRejectedValue(new Error("Socket connection timeout"));

    await expect(
      resendProvider.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toThrow("Socket connection timeout");
  });
});
