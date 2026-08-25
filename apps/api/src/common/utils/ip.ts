import type { Request } from "express";

export const DEFAULT_CLIENT_IP = "127.0.0.1";

/**
 * Returns verified client IP address from Express req.ip (configured via trust proxy).
 * Falls back to DEFAULT_CLIENT_IP ('127.0.0.1') for synthetic/test environments where req.ip is undefined.
 *
 * NOTE: In production, ensure TRUST_PROXY is correctly configured in your Express app.
 * For local development or CI/CD pipelines where req.ip might not be populated,
 * this function provides a safe default to prevent runtime errors.
 */
export const getClientIp = (req: Request): string =>
  req.ip || DEFAULT_CLIENT_IP;
