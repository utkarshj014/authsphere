import argon2, { type HashOptions } from "argon2";

/**
 * Explicit Argon2id configuration options.
 * Adheres to OWASP recommendation for general-purpose password hashing:
 * - memoryCost: 65536 KiB (64 MiB)
 * - timeCost: 3 iterations
 * - parallelism: 4 threads
 * - hashLength: 32 bytes
 * - type: Argon2id
 */
export const ARGON2_OPTIONS: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plainText: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch (error) {
    return false;
  }
}
