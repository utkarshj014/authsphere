import { z } from "zod";

export const healthStatusSchema = z.enum(["UP", "DOWN"]);

export const livenessDataSchema = z.object({
  status: healthStatusSchema,
  timestamp: z.string().datetime(),
});

export const readinessDataSchema = z.object({
  status: healthStatusSchema,
  database: healthStatusSchema,
  redis: healthStatusSchema,
  timestamp: z.string().datetime(),
});

export const healthResponseSchema = {
  livenessData: livenessDataSchema,
  readinessData: readinessDataSchema,
};

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type LivenessData = z.infer<typeof livenessDataSchema>;
export type ReadinessData = z.infer<typeof readinessDataSchema>;
