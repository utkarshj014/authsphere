import { z } from "zod";

const healthStatusSchema = z.enum(["UP", "DOWN"]);

export const healthResponseSchema = {
  healthData: z.object({
    api: healthStatusSchema,
    database: healthStatusSchema,
    redis: healthStatusSchema,
  }),
};

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthDataResponse = z.infer<
  typeof healthResponseSchema.healthData
>;
