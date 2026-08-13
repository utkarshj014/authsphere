import crypto from "node:crypto";

/**
 * Generates a cryptographically secure random token in hex format.
 */
export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Hashes a raw token string using SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Performs a constant-time in-memory comparison between a stored SHA-256 token hash and a candidate token.
 *
 * Note: Database lookups using `where: { tokenHash: hashToken(candidateToken) }` are inherently immune to timing
 * attacks due to SHA-256's avalanche property. Use `verifyToken` when verifying candidate tokens against an
 * in-memory stored hash object.
 */
export function verifyToken(
  hashedToken: string,
  candidateToken: string,
): boolean {
  try {
    const bufferA = Buffer.from(hashedToken, "hex");
    const bufferB = Buffer.from(hashToken(candidateToken), "hex");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}
