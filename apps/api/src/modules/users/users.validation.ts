import { z } from "zod";

const idSchema = z.uuidv7();

export const usersSchema = {
  getUser: z.object({
    id: idSchema,
  }),
};

export type GetUserInput = z.infer<typeof usersSchema.getUser>;
