import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import { jsonContent, successResponse } from "../../common/openapi/schemas.js";

// ─── Health Schemas ────────────────────────────────────────────────

export const HealthDataSchema = registry.register(
  "HealthData",
  z
    .object({
      status: z.enum(["UP", "DOWN"]),
      database: z.enum(["UP", "DOWN"]),
      redis: z.enum(["UP", "DOWN"]),
    })
    .openapi("HealthData", {
      description: "Service and dependency connectivity status",
    }),
);

// ─── GET /health ───────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Service health check",
  description:
    "Returns the health status of the API, database, and Redis connections.",
  responses: {
    200: successResponse("Service is healthy", HealthDataSchema),
    503: {
      description: "Service is unhealthy",
      content: jsonContent(
        z.object({
          success: z.literal(false),
          message: z.string(),
          data: HealthDataSchema,
        }),
      ),
    },
  },
});
