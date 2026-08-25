import { Router } from "express";
import { authSchema } from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import { googleInitiate, googleCallback } from "./oauth/oauth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { auth, optionalAuth } from "../../middlewares/auth.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

router
  .get("/oauth/google", optionalAuth, googleInitiate)
  .get("/oauth/google/callback", googleCallback)
  .post(
    "/signup",
    rateLimiter(RATE_LIMIT_POLICIES.SIGNUP),
    validate(authSchema.signup),
    authController.signup,
  )
  .post(
    "/verify-email",
    rateLimiter(RATE_LIMIT_POLICIES.VERIFY_EMAIL),
    validate(authSchema.verifyEmail),
    authController.verifyEmail,
  )
  .post(
    "/resend-verification-token",
    rateLimiter(RATE_LIMIT_POLICIES.RESEND_VERIFICATION),
    validate(authSchema.resendVerificationToken),
    authController.resendVerificationToken,
  )
  .post(
    "/resend-verification",
    rateLimiter(RATE_LIMIT_POLICIES.RESEND_VERIFICATION),
    validate(authSchema.resendVerificationToken),
    authController.resendVerificationToken,
  )
  .post(
    "/login",
    rateLimiter(RATE_LIMIT_POLICIES.LOGIN),
    validate(authSchema.login),
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
    validate(authSchema.forgotPassword),
    authController.forgotPassword,
  )
  .post(
    "/reset-password",
    rateLimiter(RATE_LIMIT_POLICIES.RESET_PASSWORD),
    validate(authSchema.resetPassword),
    authController.resetPassword,
  )
  .post(
    "/change-password",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.CHANGE_PASSWORD),
    validate(authSchema.changePassword),
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
    validate(authSchema.mfaVerifySetup),
    authController.mfaVerifySetup,
  )
  .post(
    "/mfa/verify",
    rateLimiter(RATE_LIMIT_POLICIES.MFA_VERIFY),
    validate(authSchema.mfaVerifyLogin),
    authController.mfaVerifyLogin,
  )
  .post(
    "/mfa/disable",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_DISABLE),
    validate(authSchema.mfaDisable),
    authController.mfaDisable,
  )
  .post(
    "/mfa/regenerate-recovery-codes",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.MFA_REGENERATE_RECOVERY_CODES),
    validate(authSchema.mfaRegenerateRecoveryCodes),
    authController.mfaRegenerateRecoveryCodes,
  );

export default router;
