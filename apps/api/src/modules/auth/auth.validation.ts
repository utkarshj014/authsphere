import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(50);
const password = z.string().min(8).max(128);

export const authSchema = {
  signup: z.object({
    email: z.email(),
    password: password,
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
    password: password,
  }),

  forgotPassword: z.object({
    email: z.email(),
  }),

  resetPassword: z.object({
    token: z.string().trim().min(1),
    password: password,
  }),

  changePassword: z.object({
    oldPassword: password,
    newPassword: password,
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
export type ChangePasswordInput = z.infer<typeof authSchema.changePassword>;
