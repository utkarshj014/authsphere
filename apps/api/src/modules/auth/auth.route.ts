import { Router } from "express";
import { authSchema } from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { auth } from "../../middlewares/auth.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

router
  .post("/signup", validate(authSchema.signup), authController.signup)
  .post(
    "/verify-email",
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
  .post("/refresh-token", authController.refreshToken)
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
    validate(authSchema.changePassword),
    authController.changePassword,
  )
  .post("/mfa/setup", auth, authController.mfaSetup)
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
    validate(authSchema.mfaDisable),
    authController.mfaDisable,
  )
  .post(
    "/mfa/regenerate-recovery-codes",
    auth,
    validate(authSchema.mfaRegenerateRecoveryCodes),
    authController.mfaRegenerateRecoveryCodes,
  );

export default router;
