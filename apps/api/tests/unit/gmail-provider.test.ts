import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { env } from "../../src/config/env.js";
import { gmailOAuthProvider } from "../../src/modules/email/gmail.provider.js";

// Set required env vars for tests
(env as any).GMAIL_USER = "test@gmail.com";
(env as any).GOOGLE_CLIENT_ID = "test-client-id";
(env as any).GOOGLE_CLIENT_SECRET = "test-client-secret";
(env as any).GMAIL_REFRESH_TOKEN = "test-refresh-token";

describe("gmailOAuthProvider - Gmail OAuth2 Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully dispatches email and returns message ID", async () => {
    mockSendMail.mockResolvedValue({
      messageId: "gmail-msg-abc-123",
    });

    const result = await gmailOAuthProvider.send({
      to: "recipient@example.com",
      subject: "Verification Code",
      html: "<p>Your code</p>",
    });

    expect(result).toEqual({ id: "gmail-msg-abc-123" });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"AuthSphere" <test@gmail.com>',
        to: "recipient@example.com",
        subject: "Verification Code",
        html: "<p>Your code</p>",
      }),
    );
  });

  it("classifies 5xx rejection code as permanent delivery error", async () => {
    mockSendMail.mockRejectedValue({
      responseCode: 550,
      message: "5.1.1 User unknown",
    });

    await expect(
      gmailOAuthProvider.send({
        to: "unknown@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      isPermanent: true,
    });
  });

  it("classifies connection drop / timeout as transient error", async () => {
    mockSendMail.mockRejectedValue({
      code: "ECONNRESET",
      message: "Connection reset by peer",
    });

    await expect(
      gmailOAuthProvider.send({
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      isPermanent: false,
    });
  });
});
