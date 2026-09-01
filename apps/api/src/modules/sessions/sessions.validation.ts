import { z } from "zod";

const idSchema = z.uuidv7();

export const sessionsSchema = {
  revokeSessionParams: z.object({
    id: idSchema,
  }),
};

export type RevokeSessionParamsInput = z.infer<
  typeof sessionsSchema.revokeSessionParams
>;
