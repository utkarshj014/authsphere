import { z } from "zod";
import { TOTP_CODE_REGEX } from "../../lib/totp/index.js";
import { ROLES, SECURITY_EVENT_TYPES } from "@authsphere/shared";

const nameSchema = z.string().trim().min(1).max(50);
const passwordSchema = z.string().min(8).max(128);
const totpCodeSchema = z
  .string()
  .trim()
  .regex(TOTP_CODE_REGEX, "MFA code must be exactly 6 digits");
const idSchema = z.uuidv7();
const backupCodeSchema = z
  .string()
  .trim()
  .length(11)
  .regex(/^[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}$/);
const securityEventItemSchema = z.object({
  id: idSchema,
  type: z.enum(SECURITY_EVENT_TYPES),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date().or(z.string()),
});

export const authRequestSchema = {
  signup: z.object({
    email: z.email(),
    password: passwordSchema,
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
    password: passwordSchema,
  }),

  forgotPassword: z.object({
    email: z.email(),
  }),

  resetPassword: z.object({
    token: z.string().trim().min(1),
    password: passwordSchema,
    code: z.union([totpCodeSchema, backupCodeSchema]).optional(),
  }),

  changePassword: z.object({
    oldPassword: passwordSchema,
    newPassword: passwordSchema,
    code: z.union([totpCodeSchema, backupCodeSchema]).optional(),
  }),

  mfaVerifySetup: z.object({
    code: totpCodeSchema,
  }),

  mfaVerifyLogin: z.object({
    mfaToken: idSchema,
    code: z.union([totpCodeSchema, backupCodeSchema]),
  }),

  mfaDisable: z.object({
    code: z.union([totpCodeSchema, backupCodeSchema]),
  }),

  mfaRegenerateRecoveryCodes: z.object({
    code: z.union([totpCodeSchema, backupCodeSchema]),
  }),

  sendMagicLink: z.object({
    email: z.email(),
  }),

  verifyMagicLink: z.object({
    token: z.string().trim().min(1),
  }),

  securityEventsQuery: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),

  oauthCallbackQuery: z.object({
    code: z.string().trim().min(1),
    state: z.string().trim().min(1),
  }),
};

export const authResponseSchema = {
  currentUserProfile: z.object({
    id: idSchema,
    email: z.email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    role: z.enum(ROLES),
    verifiedAt: z.date().or(z.string()),
    createdAt: z.date().or(z.string()),
  }),

  securityEventItem: securityEventItemSchema,

  paginatedSecurityEvents: z.object({
    events: z.array(securityEventItemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      totalCount: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  }),

  mfaSetup: z.object({
    secret: z.string(),
    otpauthUri: z.string(),
  }),

  mfaRecoveryCodes: z.object({
    recoveryCodes: z.array(backupCodeSchema),
  }),

  mfaRequired: z.object({
    mfaRequired: z.literal(true),
    mfaToken: idSchema,
  }),

  mfaVerifyLogin: z
    .object({
      lowRecoveryCodesWarning: z.boolean(),
      remainingRecoveryCodes: z.number().int(),
    })
    .nullable(),
};

export type SignupInput = z.infer<typeof authRequestSchema.signup>;
export type VerifyEmailInput = z.infer<typeof authRequestSchema.verifyEmail>;
export type ResendVerificationTokenInput = z.infer<
  typeof authRequestSchema.resendVerificationToken
>;
export type LoginInput = z.infer<typeof authRequestSchema.login>;
export type ForgotPasswordInput = z.infer<
  typeof authRequestSchema.forgotPassword
>;
export type ResetPasswordInput = z.infer<
  typeof authRequestSchema.resetPassword
>;
export type ChangePasswordInput = z.infer<
  typeof authRequestSchema.changePassword
>;
export type MfaVerifySetupInput = z.infer<
  typeof authRequestSchema.mfaVerifySetup
>;
export type MfaVerifyLoginInput = z.infer<
  typeof authRequestSchema.mfaVerifyLogin
>;
export type MfaDisableInput = z.infer<typeof authRequestSchema.mfaDisable>;
export type MfaRegenerateRecoveryCodesInput = z.infer<
  typeof authRequestSchema.mfaRegenerateRecoveryCodes
>;
export type SendMagicLinkInput = z.infer<
  typeof authRequestSchema.sendMagicLink
>;
export type VerifyMagicLinkInput = z.infer<
  typeof authRequestSchema.verifyMagicLink
>;
export type SecurityEventsQueryInput = z.infer<
  typeof authRequestSchema.securityEventsQuery
>;
export type OAuthCallbackQueryInput = z.infer<
  typeof authRequestSchema.oauthCallbackQuery
>;

export type CurrentUserProfileResponse = z.infer<
  typeof authResponseSchema.currentUserProfile
>;
export type SecurityEventItemResponse = z.infer<
  typeof authResponseSchema.securityEventItem
>;
export type PaginatedSecurityEventsResponse = z.infer<
  typeof authResponseSchema.paginatedSecurityEvents
>;
export type MfaSetupResponse = z.infer<typeof authResponseSchema.mfaSetup>;
export type MfaRecoveryCodesResponse = z.infer<
  typeof authResponseSchema.mfaRecoveryCodes
>;
export type MfaRequiredResponseData = z.infer<
  typeof authResponseSchema.mfaRequired
>;
export type MfaVerifyLoginResponse = z.infer<
  typeof authResponseSchema.mfaVerifyLogin
>;

// Backwards-compatible alias for routers/tests
export const authSchema = authRequestSchema;
