import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(50);

export const authSchema = {
  signup: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
  }),

  verifyEmail: z.object({
    token: z.string().trim().min(1),
  }),

  resendVerificationToken: z.object({
    email: z.email(),
  }),

  login: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
  }),

  forgotPassword: z.object({
    email: z.email(),
  }),

  resetPassword: z.object({
    token: z.string().trim().min(1),
    password: z.string().min(8).max(128),
  }),
};

export type SignupInput = z.infer<typeof authSchema.signup>;
export type VerifyEmailInput = z.infer<typeof authSchema.verifyEmail>;
export type ResendVerificationTokenInput = z.infer<
  typeof authSchema.resendVerificationToken
>;
export type LoginInput = z.infer<typeof authSchema.login>;
export type ForgotPasswordInput = z.infer<typeof authSchema.forgotPassword>;
export type ResetPasswordInput = z.infer<typeof authSchema.resetPassword>;
