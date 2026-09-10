import { z } from "zod";

const idSchema = z.uuidv7();

export const sessionsRequestSchema = {
  revokeSessionParams: z.object({
    id: idSchema,
  }),
};

export const sessionsResponseSchema = {
  sessionItem: z.object({
    id: idSchema,
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    createdAt: z.date().or(z.string()),
    expiresAt: z.date().or(z.string()),
    isCurrent: z.boolean(),
  }),
};

export type RevokeSessionParamsInput = z.infer<
  typeof sessionsRequestSchema.revokeSessionParams
>;
export type SessionItemResponse = z.infer<
  typeof sessionsResponseSchema.sessionItem
>;

// Backwards-compatible alias for routers/tests
export const sessionsSchema = sessionsRequestSchema;
