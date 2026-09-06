import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import {
  cookieSecurity,
  authedErrors,
  successResponse,
  errorResponse,
  jsonBody,
} from "../../common/openapi/schemas.js";
import { usersSchema } from "./users.validation.js";

// ─── User Profile Schema ───────────────────────────────────────────

export const UserProfileSchema = registry.register(
  "UserProfile",
  z
    .object({
      id: z.string(),
      email: z.string().email(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      role: z.string(),
      isEmailVerified: z.boolean(),
      createdAt: z.string(),
    })
    .openapi("UserProfile", {
      description: "User profile details",
    }),
);

// ─── GET /users/{id} ───────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/users/{id}",
  tags: ["Users"],
  summary: "Get user by ID",
  description:
    "Returns a user's profile. The requester must be the user themselves or have the user.read permission.",
  security: cookieSecurity,
  request: {
    params: usersSchema.getUser,
  },
  responses: {
    200: successResponse("User profile", UserProfileSchema),
    ...authedErrors,
    403: errorResponse("Forbidden — insufficient permissions"),
    404: errorResponse("User not found"),
  },
});

// ─── PATCH /users/{id}/role ────────────────────────────────────────

registry.registerPath({
  method: "patch",
  path: "/users/{id}/role",
  tags: ["Users"],
  summary: "Change user role",
  description:
    "Changes a user's role. Requires admin role. Guarded against last-admin demotion.",
  security: cookieSecurity,
  request: {
    params: usersSchema.getUser,
    body: jsonBody(usersSchema.role),
  },
  responses: {
    200: successResponse("Role updated successfully", UserProfileSchema),
    ...authedErrors,
    403: errorResponse(
      "Forbidden — admin role required, self-role change prohibited, or last-admin demotion prevented",
    ),
    404: errorResponse("User not found"),
  },
});
