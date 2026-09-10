import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import {
  cookieSecurity,
  authedErrors,
  successResponse,
  messageResponse,
  errorResponse,
} from "../../common/openapi/schemas.js";
import {
  sessionsRequestSchema,
  sessionsResponseSchema,
} from "./sessions.validation.js";

// ─── Session Schemas ───────────────────────────────────────────────

export const SessionItemSchema = registry.register(
  "SessionItem",
  sessionsResponseSchema.sessionItem.openapi("SessionItem", {
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
    ...authedErrors,
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
    params: sessionsRequestSchema.revokeSessionParams,
  },
  responses: {
    200: messageResponse("Session revoked successfully"),
    ...authedErrors,
    403: errorResponse("Forbidden — cannot revoke another user's session"),
    404: errorResponse("Session not found"),
  },
});
