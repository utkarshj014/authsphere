import { randomUUID } from "node:crypto";
// import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"];

  // Lightweight sanitization that strips control,
  // newline characters (\r\n) and caps the ID
  // length at 128 characters
  const sanitizedId =
    typeof incomingId === "string"
      ? incomingId
          .replace(/[\r\n\x00-\x1F]/g, "")
          .trim()
          .slice(0, 128)
      : "";

  const id = sanitizedId !== "" ? sanitizedId : randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};
