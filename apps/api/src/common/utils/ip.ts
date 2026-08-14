import type { Request } from "express";

export const DEFAULT_CLIENT_IP = "127.0.0.1";

/**
 * Returns verified client IP address from Express req.ip (configured via trust proxy).
 * Falls back to DEFAULT_CLIENT_IP ('127.0.0.1') for synthetic/test environments where req.ip is undefined.
 */
export const getClientIp = (req: Request): string =>
  req.ip || DEFAULT_CLIENT_IP;
