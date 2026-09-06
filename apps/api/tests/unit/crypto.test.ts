import { describe, it, expect } from "vitest";
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
import { UnauthorizedError } from "../../src/common/errors/index.js";
import { SignJWT } from "jose";
import { env } from "../../src/config/env.js";

describe("Cryptographic Utilities Unit Tests", () => {
  describe("Password Hashing & Verification (Argon2id)", () => {
    it("hashes and verifies password correctly", async () => {
      const password = "SuperSecretPassword123!";
      const hash = await hashPassword(password);

      expect(hash.startsWith("$argon2id$")).toBe(true);
      expect(await verifyPassword(hash, password)).toBe(true);
      expect(await verifyPassword(hash, "WrongPassword!")).toBe(false);
    });

    it("handles malformed or empty password hashes gracefully without throwing", async () => {
      expect(await verifyPassword("malformed-hash", "password")).toBe(false);
      expect(await verifyPassword("", "password")).toBe(false);
    });

    it("exports precomputed valid DUMMY_PASSWORD_HASH", () => {
      expect(DUMMY_PASSWORD_HASH).toBeDefined();
      expect(DUMMY_PASSWORD_HASH.startsWith("$argon2id$")).toBe(true);
    });
  });

  describe("JWT Tokens (Access & Refresh)", () => {
    const samplePayload = {
      sub: "01912345-6789-7abc-def0-123456789abc",
      sid: "01912345-6789-7abc-def0-fedcba987654",
      role: "USER" as const,
    };

    it("signs and verifies access and refresh tokens", async () => {
      const accessToken = await signAccessToken(samplePayload);
      const decodedAccess = await verifyAccessToken(accessToken);
      expect(decodedAccess.sub).toBe(samplePayload.sub);
      expect(decodedAccess.role).toBe(samplePayload.role);

      const refreshToken = await signRefreshToken(samplePayload);
      const decodedRefresh = await verifyRefreshToken(refreshToken);
      expect(decodedRefresh.sid).toBe(samplePayload.sid);
    });

    it("rejects tampered and malformed access tokens", async () => {
      const token = await signAccessToken(samplePayload);
      const tampered = token.slice(0, -5) + "abcde";

      await expect(verifyAccessToken(tampered)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired access token",
      });
      await expect(verifyAccessToken("invalid.jwt")).rejects.toThrowError(
        UnauthorizedError,
      );
    });

    it("rejects expired access token", async () => {
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

    it("enforces key separation between access and refresh secrets", async () => {
      const refreshToken = await signRefreshToken(samplePayload);
      await expect(verifyAccessToken(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        message: "Invalid or expired access token",
      });
    });
  });

  describe("Opaque Tokens & Hashes (SHA-256)", () => {
    it("generates unique tokens and deterministic hashes", () => {
      const token = generateToken(32);
      expect(token).toHaveLength(64);

      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);

      expect(verifyToken(hash1, token)).toBe(true);
      expect(verifyToken(hash1, "wrong-token")).toBe(false);
    });

    it("verifyToken returns false gracefully on malformed hash", () => {
      expect(verifyToken("not-hex", "token")).toBe(false);
      expect(verifyToken("", "token")).toBe(false);
    });
  });

  describe("MFA Secret Encryption (AES-256-GCM)", () => {
    it("encrypts and decrypts secrets with unique random IVs", () => {
      const rawSecret = "JBSWY3DPEHPK3PXP";
      const enc1 = encryptMfaSecret(rawSecret);
      const enc2 = encryptMfaSecret(rawSecret);

      expect(enc1).not.toBe(enc2);
      expect(decryptMfaSecret(enc1)).toBe(rawSecret);
      expect(decryptMfaSecret(enc2)).toBe(rawSecret);
    });

    it("handles legacy and malformed encrypted values gracefully", () => {
      expect(decryptMfaSecret("PLAINTEXTSECRET")).toBe("PLAINTEXTSECRET");
      expect(decryptMfaSecret("part1:part2")).toBe("part1:part2");
    });
  });

  describe("Recovery Codes Generation", () => {
    it("generates formatted recovery codes and hashes", () => {
      const { recoveryCodes, recoveryCodeHashes } = generateRecoveryCodes(10);

      expect(recoveryCodes).toHaveLength(10);
      expect(recoveryCodeHashes).toHaveLength(10);

      for (let i = 0; i < recoveryCodes.length; i++) {
        expect(recoveryCodes[i]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
        expect(recoveryCodeHashes[i]).toBe(hashToken(recoveryCodes[i]!));
      }
    });
  });
});
