import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload } from "./jwt.types.js";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../common/errors/index.js";

const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, sid: payload.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify<TokenPayload>(token, secret);

    return {
      sub: payload.sub,
      sid: payload.sid,
      role: payload.role,
    };
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}
