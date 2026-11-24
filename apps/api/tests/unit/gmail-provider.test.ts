import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn();
  const mockCreateTransport = vi.fn(() => ({
    sendMail: mockSendMail,
  }));
  return { mockSendMail, mockCreateTransport };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

import { env } from "../../src/config/env.js";
import {
  gmailProvider,
  gmailOAuthProvider,
} from "../../src/modules/email/gmail.provider.js";

describe("gmailProvider - Gmail SMTP & OAuth2 Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as any).GMAIL_USER = "test@gmail.com";
    (env as any).GMAIL_APP_PASSWORD = undefined;
    (env as any).GOOGLE_CLIENT_ID = "test-client-id";
    (env as any).GOOGLE_CLIENT_SECRET = "test-client-secret";
    (env as any).GMAIL_REFRESH_TOKEN = "test-refresh-token";
  });

  it("exports gmailOAuthProvider as backward-compatible alias", () => {
    expect(gmailOAuthProvider).toBe(gmailProvider);
    expect(gmailProvider.name).toBe("gmail");
  });

  it("successfully dispatches email using App Password SMTP", async () => {
    (env as any).GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop";
    mockSendMail.mockResolvedValue({
      messageId: "gmail-smtp-msg-123",
    });

    const result = await gmailProvider.send({
      to: "recipient@example.com",
      subject: "Verification Code",
      html: "<p>Your code</p>",
    });

    expect(result).toEqual({ id: "gmail-smtp-msg-123" });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"AuthSphere" <test@gmail.com>',
        to: "recipient@example.com",
        subject: "Verification Code",
        html: "<p>Your code</p>",
      }),
    );
  });

  it("successfully dispatches email using OAuth2 refresh token", async () => {
    (env as any).GMAIL_APP_PASSWORD = undefined;
    (env as any).GMAIL_REFRESH_TOKEN = "test-refresh-token";
    mockSendMail.mockResolvedValue({
      messageId: "gmail-oauth-msg-456",
    });

    const result = await gmailProvider.send({
      to: "recipient@example.com",
      subject: "Verification Code",
      html: "<p>Your code</p>",
    });

    expect(result).toEqual({ id: "gmail-oauth-msg-456" });
  });

  it("throws permanent error when neither App Password nor OAuth2 credentials exist", async () => {
    (env as any).GMAIL_APP_PASSWORD = undefined;
    (env as any).GMAIL_REFRESH_TOKEN = undefined;

    await expect(
      gmailProvider.send({
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      }),
    ).rejects.toMatchObject({
      name: "EmailDeliveryError",
      isPermanent: true,
    });
  });

  it("classifies 5xx rejection code as permanent delivery error", async () => {
    (env as any).GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    mockSendMail.mockRejectedValue({
      responseCode: 550,
      message: "5.1.1 User unknown",
    });

    await expect(
      gmailProvider.send({
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
    (env as any).GMAIL_APP_PASSWORD = "abcdefghijklmnop";
    mockSendMail.mockRejectedValue({
      code: "ECONNRESET",
      message: "Connection reset by peer",
    });

    await expect(
      gmailProvider.send({
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
