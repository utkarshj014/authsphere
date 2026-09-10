import { Router } from "express";
import { authRequestSchema } from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import {
  googleInitiate,
  googleCallback,
  githubInitiate,
  githubCallback,
} from "./oauth/oauth.controller.js";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import { auth, optionalAuth } from "../../middlewares/auth.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

router
  .get(
    "/oauth/google",
    rateLimiter(RATE_LIMIT_POLICIES.OAUTH_INITIATE),
    optionalAuth,
    googleInitiate,
  )
  .get(
    "/oauth/google/callback",
    rateLimiter(RATE_LIMIT_POLICIES.OAUTH_CALLBACK),
    googleCallback,
  )
  .get(
    "/oauth/github",
    rateLimiter(RATE_LIMIT_POLICIES.OAUTH_INITIATE),
    optionalAuth,
    githubInitiate,
  )
  .get(
    "/oauth/github/callback",
    rateLimiter(RATE_LIMIT_POLICIES.OAUTH_CALLBACK),
    githubCallback,
  )
  .post(
    "/signup",
    rateLimiter(RATE_LIMIT_POLICIES.SIGNUP),
    validate(authRequestSchema.signup),
    authController.signup,
  )
  .post(
    "/verify-email",
    rateLimiter(RATE_LIMIT_POLICIES.VERIFY_EMAIL),
    validate(authRequestSchema.verifyEmail),
    authController.verifyEmail,
  )
  .post(
    "/resend-verification",
    rateLimiter(RATE_LIMIT_POLICIES.RESEND_VERIFICATION),
    validate(authRequestSchema.resendVerificationToken),
    authController.resendVerificationToken,
  )
  .post(
    "/login",
    rateLimiter(RATE_LIMIT_POLICIES.LOGIN),
    validate(authRequestSchema.login),
    authController.login,
  )
  .post(
    "/refresh-token",
    rateLimiter(RATE_LIMIT_POLICIES.REFRESH_TOKEN),
    authController.refreshToken,
  )
  .post("/logout", authController.logout)
  .post("/logout-all", auth, authController.logoutAll)
  .get("/me", auth, authController.getMe)
  .post(
    "/forgot-password",
    rateLimiter(RATE_LIMIT_POLICIES.FORGOT_PASSWORD),
    validate(authRequestSchema.forgotPassword),
    authController.forgotPassword,
  )
  .post(
    "/reset-password",
    rateLimiter(RATE_LIMIT_POLICIES.RESET_PASSWORD),
    validate(authRequestSchema.resetPassword),
    authController.resetPassword,
  )
  .post(
    "/change-password",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.CHANGE_PASSWORD),
    validate(authRequestSchema.changePassword),
    authController.changePassword,
  )
  .post(
    "/mfa/setup",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_VERIFY_SETUP),
    authController.mfaSetup,
  )
  .post(
    "/mfa/verify-setup",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_VERIFY_SETUP),
    validate(authRequestSchema.mfaVerifySetup),
    authController.mfaVerifySetup,
  )
  .post(
    "/mfa/verify",
    rateLimiter(RATE_LIMIT_POLICIES.MFA_VERIFY),
    validate(authRequestSchema.mfaVerifyLogin),
    authController.mfaVerifyLogin,
  )
  .post(
    "/mfa/disable",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_DISABLE),
    validate(authRequestSchema.mfaDisable),
    authController.mfaDisable,
  )
  .post(
    "/mfa/regenerate-recovery-codes",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_REGENERATE_RECOVERY_CODES),
    validate(authRequestSchema.mfaRegenerateRecoveryCodes),
    authController.mfaRegenerateRecoveryCodes,
  )
  .post(
    "/magic-link",
    rateLimiter(RATE_LIMIT_POLICIES.MAGIC_LINK_REQUEST),
    validate(authRequestSchema.sendMagicLink),
    authController.sendMagicLink,
  )
  .post(
    "/magic-link/verify",
    rateLimiter(RATE_LIMIT_POLICIES.MAGIC_LINK_VERIFY),
    validate(authRequestSchema.verifyMagicLink),
    authController.verifyMagicLink,
  )
  .get(
    "/security-events",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.SECURITY_EVENTS_READ),
    validate(authRequestSchema.securityEventsQuery, ValidationTarget.QUERY),
    authController.getSecurityEvents,
  );

export default router;
