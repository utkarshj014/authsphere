import { Router } from "express";
import { authSchema } from "./auth.validation.js";
import { authController } from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { auth } from "../../middlewares/auth.js";

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
    validate(authSchema.resendVerificationToken),
    authController.resendVerificationToken,
  )
  .post("/login", validate(authSchema.login), authController.login)
  .post("/refresh-token", authController.refreshToken)
  .post("/logout", authController.logout)
  .post("/logout-all", authController.logoutAll)
  .get("/me", auth, authController.getMe)
  .post(
    "/forgot-password",
    validate(authSchema.forgotPassword),
    authController.forgotPassword,
  )
  .post(
    "/reset-password",
    validate(authSchema.resetPassword),
    authController.resetPassword,
  );

export default router;
