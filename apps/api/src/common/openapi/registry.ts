import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";

// Extend Zod with .openapi() method — must be called before any schema uses .openapi()
extendZodWithOpenApi(z);

// Central registry shared by all module *.openapi.ts files
export const registry = new OpenAPIRegistry();

// ─── Security Schemes ─────────────────────────────────────────────
// AuthSphere uses HttpOnly cookies, not Authorization headers.
// OpenAPI represents cookie auth as apiKey with in: "cookie".

export const accessTokenSecurity = registry.registerComponent(
  "securitySchemes",
  "accessTokenCookie",
  {
    type: "apiKey",
    in: "cookie",
    name: "accessToken",
    description: "JWT access token delivered via HttpOnly cookie",
  },
);

export const refreshTokenSecurity = registry.registerComponent(
  "securitySchemes",
  "refreshTokenCookie",
  {
    type: "apiKey",
    in: "cookie",
    name: "refreshToken",
    description: "JWT refresh token delivered via HttpOnly cookie",
  },
);
