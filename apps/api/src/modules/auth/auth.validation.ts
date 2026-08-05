import { z } from "zod";

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1),
});

export const resendVerificationTokenSchema = z.object({
  email: z.email(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8).max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationTokenInput = z.infer<
  typeof resendVerificationTokenSchema
>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
