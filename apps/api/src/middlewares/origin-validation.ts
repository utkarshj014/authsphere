import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { ForbiddenError } from "../common/errors/index.js";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TRUSTED_ORIGIN = new URL(env.FRONTEND_URL).origin;

const normalizeOrigin = (url: string | null): string | null => {
  if (!url || url === "null") return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const getRequestOrigin = (req: Request): string | null => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (typeof origin === "string") {
    return normalizeOrigin(origin.trim());
  }
  if (typeof referer === "string") {
    return normalizeOrigin(referer.trim());
  }

  return null;
};

export const originValidation = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // 1. Allow safe / idempotent methods
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  const secFetchSite = req.headers["sec-fetch-site"];

  // 2. Fast-Path: Allow verified same-origin browser requests
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return next();
  }

  // 3. Strict Guard: If browser explicitly reports cross-site, BLOCK immediately
  if (secFetchSite === "cross-site") {
    const origin = getRequestOrigin(req);
    // Allow ONLY if it explicitly matches our trusted origin
    if (origin === TRUSTED_ORIGIN) {
      return next();
    }

    logger.warn(
      { origin, secFetchSite, method: req.method, url: req.originalUrl },
      "Blocked cross-site state change attempt",
    );
    return next(new ForbiddenError("Cross-origin mutations forbidden"));
  }

  // 4. Fallback for older browsers / clients without Fetch Metadata
  const origin = getRequestOrigin(req);

  // If a browser explicitly sent Origin: "null" (e.g. sandboxed iframe attack)
  if (req.headers.origin === "null") {
    return next(new ForbiddenError("Opaque / null origins are forbidden"));
  }

  // Allow non-browser clients (cURL, native apps, Postman) that don't send Origin/Referer
  if (!origin) {
    return next();
  }

  // Validate the present origin against whitelist
  if (origin !== TRUSTED_ORIGIN) {
    logger.warn(
      { origin, secFetchSite, method: req.method, url: req.originalUrl },
      "Request blocked: untrusted origin",
    );
    return next(new ForbiddenError("Untrusted request origin"));
  }

  return next();
};
