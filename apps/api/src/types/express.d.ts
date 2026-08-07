import "express";
import type { RoleName, PermissionName } from "@authsphere/shared";

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth: {
        userId: string;
        role: RoleName;
        sessionId: string;
        permissions: PermissionName[];
      };
    }
  }
}

export {};
