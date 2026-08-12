import { generateSecret, generateURI, verifySync } from "otplib";

const DEFAULT_ISSUER = "AuthSphere";
const TOTP_WINDOW_TOLERANCE_SECONDS = 30; // 1 adjacent 30-second period for clock-skew tolerance

/**
 * Generates a cryptographically random base32 TOTP secret key.
 */
const createSecret = (): string => {
  return generateSecret();
};

/**
 * Generates an otpauth:// URI string suitable for QR code generation in authenticator apps.
 */
const generateOtpUri = (
  secret: string,
  accountName: string,
  issuer: string = DEFAULT_ISSUER,
): string => {
  return generateURI({
    issuer,
    label: accountName,
    secret,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
};

/**
 * Verifies a 6-digit TOTP code against a base32 secret with 30s clock-skew tolerance.
 */
const verifyCode = (
  secret: string,
  code: string,
): { valid: boolean; matchedWindow?: number } => {
  const epochInSeconds = Math.floor(Date.now() / 1000);

  const result = verifySync({
    secret,
    token: code,
    epoch: epochInSeconds,
    epochTolerance: TOTP_WINDOW_TOLERANCE_SECONDS,
  });

  if (!result || !result.valid) {
    return { valid: false };
  }

  const currentWindow = Math.floor(epochInSeconds / 30);
  const matchedWindow = currentWindow + (result.delta ?? 0);

  return { valid: true, matchedWindow };
};

export const TOTP_CODE_REGEX = /^\d{6}$/;

/**
 * Checks if a string conforms to the 6-digit TOTP code format.
 */
const isTotpCode = (code: string): boolean => {
  return TOTP_CODE_REGEX.test(code.trim());
};

export const totp = {
  generateSecret: createSecret,
  generateOtpUri,
  verifyCode,
  isTotpCode,
};
