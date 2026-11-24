import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../src/lib/jwt/index.js";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "../../src/lib/crypto/password.js";
import {
  generateToken,
  hashToken,
  verifyToken,
} from "../../src/lib/crypto/token.js";
import {
  encryptMfaSecret,
  decryptMfaSecret,
} from "../../src/lib/crypto/mfa-encryption.js";
import { generateRecoveryCodes } from "../../src/lib/crypto/recovery-codes.js";
import { totp } from "../../src/lib/totp/index.js";
import { UnauthorizedError } from "../../src/common/errors/index.js";
import { env } from "../../src/config/env.js";

describe("Cryptographic & Security Primitives Unit Tests", () => {
  describe("Password Hashing & Timing-Safe Verification (Argon2id)", () => {
    it("hashes and verifies passwords correctly, handling malformed hashes and exposing dummy hash", async () => {
      const password = "SuperSecretPassword123!";
      const hash = await hashPassword(password);

      expect(hash.startsWith("$argon2id$")).toBe(true);
      expect(await verifyPassword(hash, password)).toBe(true);
      expect(await verifyPassword(hash, "WrongPassword!")).toBe(false);
      expect(await verifyPassword("malformed-hash", password)).toBe(false);
      expect(await verifyPassword("", password)).toBe(false);

      expect(DUMMY_PASSWORD_HASH).toBeDefined();
      expect(DUMMY_PASSWORD_HASH.startsWith("$argon2id$")).toBe(true);
    });
  });

  describe("JWT HS256 Token Lifecycle & Key Separation", () => {
    const samplePayload = {
      sub: "01912345-6789-7abc-def0-123456789abc",
      sid: "01912345-6789-7abc-def0-fedcba987654",
      role: "USER" as const,
    };

    it("signs and verifies access and refresh tokens with correct payload claims", async () => {
      const accessToken = await signAccessToken(samplePayload);
      const decodedAccess = await verifyAccessToken(accessToken);
      expect(decodedAccess.sub).toBe(samplePayload.sub);
      expect(decodedAccess.role).toBe(samplePayload.role);

      const refreshToken = await signRefreshToken(samplePayload);
      const decodedRefresh = await verifyRefreshToken(refreshToken);
      expect(decodedRefresh.sid).toBe(samplePayload.sid);
      expect(decodedRefresh.sub).toBe(samplePayload.sub);
    });

    it("enforces key separation and rejects tampered or expired tokens", async () => {
      const accessToken = await signAccessToken(samplePayload);
      const tampered = accessToken.slice(0, -5) + "abcde";

      // Tampered signature rejection
      await expect(verifyAccessToken(tampered)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired access token",
      });
      await expect(verifyAccessToken("invalid.jwt")).rejects.toThrowError(
        UnauthorizedError,
      );

      // Key separation: refresh token must be rejected when presented as access token
      const refreshToken = await signRefreshToken(samplePayload);
      await expect(verifyAccessToken(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired access token",
      });

      // Expired token rejection
      const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
      const expiredToken = await new SignJWT({
        role: samplePayload.role,
        sid: samplePayload.sid,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(samplePayload.sub)
        .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
        .sign(secret);

      await expect(verifyAccessToken(expiredToken)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired access token",
      });
    });
  });

  describe("Opaque Tokens & SHA-256 Hashes", () => {
    it("generates unique tokens, deterministic hashes, and verifies timing-safely", () => {
      const token = generateToken(32);
      expect(token).toHaveLength(64);

      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);

      expect(verifyToken(hash1, token)).toBe(true);
      expect(verifyToken(hash1, "wrong-token")).toBe(false);
      expect(verifyToken("not-hex", "token")).toBe(false);
      expect(verifyToken("", "token")).toBe(false);
    });
  });

  describe("AES-256-GCM Secret Encryption & Decryption", () => {
    it("encrypts and decrypts secrets with unique IVs and supports legacy fallback", () => {
      const rawSecret = "JBSWY3DPEHPK3PXP";
      const enc1 = encryptMfaSecret(rawSecret);
      const enc2 = encryptMfaSecret(rawSecret);

      expect(enc1).not.toBe(enc2); // Unique IV per encryption
      expect(decryptMfaSecret(enc1)).toBe(rawSecret);
      expect(decryptMfaSecret(enc2)).toBe(rawSecret);

      // Legacy plain-text fallback handling
      expect(decryptMfaSecret("PLAINTEXTSECRET")).toBe("PLAINTEXTSECRET");
      expect(decryptMfaSecret("part1:part2")).toBe("part1:part2");
    });
  });

  describe("Recovery Codes Generation", () => {
    it("generates formatted recovery codes (XXXXX-XXXXX) and deterministic hashes", () => {
      const { recoveryCodes, recoveryCodeHashes } = generateRecoveryCodes(10);

      expect(recoveryCodes).toHaveLength(10);
      expect(recoveryCodeHashes).toHaveLength(10);

      for (let i = 0; i < recoveryCodes.length; i++) {
        expect(recoveryCodes[i]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
        expect(recoveryCodeHashes[i]).toBe(hashToken(recoveryCodes[i]!));
      }
    });
  });

  describe("TOTP Utilities", () => {
    it("generates valid base32 secret and compliant otpauth URI", () => {
      const secret = totp.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThanOrEqual(16);
      expect(secret).toMatch(/^[A-Z2-7]+=*$/i);

      const uri = totp.generateOtpUri(secret, "user@example.com");
      expect(uri.startsWith("otpauth://totp/")).toBe(true);
      expect(uri).toContain("secret=" + secret);
      expect(uri).toContain("issuer=AuthSphere");
    });

    it("validates 6-digit numeric codes and rejects invalid shapes", () => {
      expect(totp.isTotpCode("123456")).toBe(true);
      expect(totp.isTotpCode("000000")).toBe(true);
      expect(totp.isTotpCode("999999")).toBe(true);

      expect(totp.isTotpCode("12345")).toBe(false);
      expect(totp.isTotpCode("1234567")).toBe(false);
      expect(totp.isTotpCode("abcdef")).toBe(false);
      expect(totp.isTotpCode("")).toBe(false);
    });
  });
});
