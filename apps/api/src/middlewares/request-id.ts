import { randomUUID } from "node:crypto";
// import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"];
  const id =
    typeof incomingId === "string" && incomingId.trim() !== ""
      ? incomingId
      : randomUUID();

  req.id = id;
  res.setHeader("X-Request-Id", id);

  next();
};
