import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(32),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
