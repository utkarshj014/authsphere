import { Router } from "express";
import {
  signupController,
  verifyEmailController,
  resendVerificationTokenController,
  loginController,
  refreshTokenController,
  logoutController,
  logoutAllController,
  getMeController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller.js";
import { auth } from "../../middlewares/auth.js";

const router = Router();

router
  .post("/signup", signupController)
  .post("/verify-email", verifyEmailController)
  .post("/resend-verification-token", resendVerificationTokenController)
  .post("/login", loginController)
  .post("/refresh-token", refreshTokenController)
  .post("/logout", logoutController)
  .post("/logout-all", logoutAllController)
  .get("/me", auth, getMeController)
  .post("/forgot-password", forgotPasswordController)
  .post("/reset-password", resetPasswordController);

export default router;
