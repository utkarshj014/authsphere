import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import { jsonContent, successResponse } from "../../common/openapi/schemas.js";
import {
  livenessDataSchema,
  readinessDataSchema,
} from "./health.validation.js";

// ─── Health Schemas ────────────────────────────────────────────────

export const LivenessDataSchema = registry.register(
  "LivenessData",
  livenessDataSchema.openapi("LivenessData", {
    description: "API process liveness status and timestamp",
  }),
);

export const ReadinessDataSchema = registry.register(
  "ReadinessData",
  readinessDataSchema.openapi("ReadinessData", {
    description: "PostgreSQL and Redis dependency connectivity status",
  }),
);

// ─── GET /health ───────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Service liveness check (root alias)",
  description:
    "Lightweight process liveness check for backwards compatibility.",
  responses: {
    200: successResponse("Service is live", LivenessDataSchema),
  },
});

// ─── GET /health/live ──────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/health/live",
  tags: ["Health"],
  summary: "AWS ALB liveness probe",
  description:
    "Lightweight process liveness probe for AWS ALB and container orchestrators. Returns 200 with zero external I/O.",
  responses: {
    200: successResponse("Process is live", LivenessDataSchema),
  },
});

// ─── GET /health/ready ─────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/health/ready",
  tags: ["Health"],
  summary: "Dependency readiness probe",
  description:
    "Deep dependency readiness probe checking PostgreSQL and Redis connectivity. Returns 200 when all dependencies are available, 503 if any dependency is down.",
  responses: {
    200: successResponse("Dependencies are available", ReadinessDataSchema),
    503: {
      description: "One or more dependencies are unavailable",
      content: jsonContent(
        z.object({
          success: z.literal(false),
          message: z.string(),
          data: ReadinessDataSchema,
        }),
      ),
    },
  },
});
