import crypto from "node:crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";

/**
 * Derives a 32-byte key for AES-256 from env.MFA_ENCRYPTION_KEY using SHA-256.
 */
function getDerivedKey(): Buffer {
  return crypto.createHash("sha256").update(env.MFA_ENCRYPTION_KEY).digest();
}

/**
 * Encrypts a plaintext string (e.g., raw Base32 TOTP secret) using AES-256-GCM.
 * Output format: "ivHex:authTagHex:ciphertextHex"
 */
export function encryptMfaSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted MFA secret string ("ivHex:authTagHex:ciphertextHex").
 * Returns the raw plaintext secret string. Fail-safe for unencrypted legacy secrets.
 */
export function decryptMfaSecret(secret: string): string {
  if (!secret.includes(":")) {
    return secret;
  }

  const parts = secret.split(":");
  if (parts.length !== 3) {
    return secret;
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    return secret;
  }
}
