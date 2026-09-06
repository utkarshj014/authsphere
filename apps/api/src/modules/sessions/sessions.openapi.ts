import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import {
  cookieSecurity,
  authedErrors,
  successResponse,
  messageResponse,
  errorResponse,
} from "../../common/openapi/schemas.js";
import { sessionsSchema } from "./sessions.validation.js";

// ─── Session Schemas ───────────────────────────────────────────────

export const SessionItemSchema = registry.register(
  "SessionItem",
  z
    .object({
      id: z.string(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      createdAt: z.string(),
      expiresAt: z.string(),
      isCurrent: z.boolean(),
    })
    .openapi("SessionItem", {
      description: "Active user session details",
    }),
);

// ─── GET /sessions ─────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/sessions",
  tags: ["Sessions"],
  summary: "List active sessions",
  description:
    "Returns all active sessions for the authenticated user, with the current session flagged.",
  security: cookieSecurity,
  responses: {
    200: successResponse("List of active sessions", z.array(SessionItemSchema)),
    401: authedErrors[401],
    429: authedErrors[429],
  },
});

// ─── DELETE /sessions/{id} ─────────────────────────────────────────

registry.registerPath({
  method: "delete",
  path: "/sessions/{id}",
  tags: ["Sessions"],
  summary: "Revoke a session",
  description:
    "Revokes a specific session by ID. If the revoked session is the current one, auth cookies are cleared.",
  security: cookieSecurity,
  request: {
    params: sessionsSchema.revokeSessionParams,
  },
  responses: {
    200: messageResponse("Session revoked successfully"),
    ...authedErrors,
    403: errorResponse("Forbidden — cannot revoke another user's session"),
    404: errorResponse("Session not found"),
  },
});
