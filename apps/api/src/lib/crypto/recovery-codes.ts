import crypto from "node:crypto";
import { hashToken } from "./token.js";

/**
 * Generates formatted plaintext recovery codes (XXXXX-XXXXX) and their SHA-256 hashes.
 */
export function generateRecoveryCodes(count = 10): {
  recoveryCodes: string[];
  recoveryCodeHashes: string[];
} {
  const recoveryCodes: string[] = [];
  const recoveryCodeHashes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    recoveryCodes.push(formatted);
    recoveryCodeHashes.push(hashToken(formatted));
  }

  return { recoveryCodes, recoveryCodeHashes };
}
