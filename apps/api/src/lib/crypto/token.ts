import crypto from "node:crypto";

export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(
  hashedToken: string,
  candidateToken: string,
): boolean {
  try {
    const bufferA = Buffer.from(hashedToken, "hex");
    const bufferB = Buffer.from(hashToken(candidateToken), "hex");

    // timingSafeEqual requires buffers to be of identical length.
    // Since we hash both tokens to SHA-256 digests first, they will always
    // be exactly 32 bytes. However, we check length equality as an extra safety measure.
    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}
