import { z } from "zod";
import { TOTP_CODE_REGEX } from "../../lib/totp/index.js";

const nameSchema = z.string().trim().min(1).max(50);
const password = z.string().min(8).max(128);
const totpCode = z
  .string()
  .trim()
  .regex(TOTP_CODE_REGEX, "MFA code must be exactly 6 digits");
const idSchema = z.uuidv7();
const backupCodeSchema = z
  .string()
  .trim()
  .length(11)
  .regex(/^[a-zA-Z0-9]{11}$/);

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

  mfaVerifySetup: z.object({
    code: totpCode,
  }),

  mfaVerifyLogin: z.object({
    mfaToken: idSchema,
    code: z.union([totpCode, backupCodeSchema]),
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
export type MfaVerifySetupInput = z.infer<typeof authSchema.mfaVerifySetup>;
export type MfaVerifyLoginInput = z.infer<typeof authSchema.mfaVerifyLogin>;
