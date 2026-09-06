/// <reference path="../../src/types/express.d.ts" />
import { describe, it, expect, vi } from "vitest";
import { totp } from "../../src/lib/totp/index.js";
import { requestId } from "../../src/middlewares/request-id.js";
import type { Request, Response, NextFunction } from "express";

describe("Security Utilities & Request ID Middleware Unit Tests", () => {
  describe("TOTP Utilities", () => {
    it("generates valid base32 secret and otpauth URI", () => {
      const secret = totp.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(secret).toMatch(/^[A-Z2-7]+=*$/i);

      const uri = totp.generateOtpUri(secret, "user@example.com");
      expect(uri.startsWith("otpauth://totp/")).toBe(true);
      expect(uri).toContain("secret=" + secret);
      expect(uri).toContain("issuer=AuthSphere");
    });

    it("validates 6-digit numeric codes accurately", () => {
      expect(totp.isTotpCode("123456")).toBe(true);
      expect(totp.isTotpCode("000000")).toBe(true);
      expect(totp.isTotpCode("999999")).toBe(true);

      expect(totp.isTotpCode("12345")).toBe(false);
      expect(totp.isTotpCode("1234567")).toBe(false);
      expect(totp.isTotpCode("abcdef")).toBe(false);
      expect(totp.isTotpCode("")).toBe(false);
    });
  });

  describe("Request ID Middleware", () => {
    it("generates a new UUID when no X-Request-Id header is present", () => {
      const req = { headers: {} } as unknown as Request;
      const res = { setHeader: vi.fn() } as unknown as Response;
      const next: NextFunction = vi.fn();

      requestId(req, res, next);

      expect(req.id).toBeDefined();
      expect(req.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.id);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("preserves valid incoming X-Request-Id header", () => {
      const customId = "my-custom-trace-id-12345";
      const req = {
        headers: { "x-request-id": customId },
      } as unknown as Request;
      const res = { setHeader: vi.fn() } as unknown as Response;
      const next: NextFunction = vi.fn();

      requestId(req, res, next);
      expect(req.id).toBe(customId);
      expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", customId);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("strips CRLF and control injection characters from X-Request-Id", () => {
      const req = {
        headers: { "x-request-id": "header\r\ninjection\x00-attempt" },
      } as unknown as Request;
      const res = { setHeader: vi.fn() } as unknown as Response;
      const next: NextFunction = vi.fn();

      requestId(req, res, next);
      expect(req.id).toBe("headerinjection-attempt");
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Request-Id",
        "headerinjection-attempt",
      );
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("truncates oversized incoming X-Request-Id to max 128 characters", () => {
      const req = {
        headers: { "x-request-id": "a".repeat(200) },
      } as unknown as Request;
      const res = { setHeader: vi.fn() } as unknown as Response;
      const next: NextFunction = vi.fn();

      requestId(req, res, next);
      expect(req.id).toHaveLength(128);
      expect(req.id).toBe("a".repeat(128));
      expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.id);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
