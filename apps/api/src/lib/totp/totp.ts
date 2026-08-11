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
const verifyCode = (secret: string, code: string): boolean => {
  const result = verifySync({
    secret,
    token: code,
    epochTolerance: TOTP_WINDOW_TOLERANCE_SECONDS,
  });

  return result.valid;
};

export const totp = {
  generateSecret: createSecret,
  generateOtpUri,
  verifyCode,
};
