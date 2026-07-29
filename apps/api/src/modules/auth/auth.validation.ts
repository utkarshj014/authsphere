import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(32),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});

export const resendEmailVerificationTokenSchema = z.object({
  email: z.email(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendEmailVerificationTokenInput = z.infer<
  typeof resendEmailVerificationTokenSchema
>;
