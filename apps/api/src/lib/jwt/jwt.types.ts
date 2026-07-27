import type { RoleName } from "@authsphere/shared";

export interface TokenPayload {
  sub: string; // userId
  sid: string; // sessionId
  role: RoleName;
}
