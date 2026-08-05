import "express";
import type { RoleName } from "@authsphere/shared";

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth: {
        userId: string;
        sessionId: string;
        role: RoleName;
      };
    }
  }
}

export {};
