import { Router } from "express";
import {
  signupController,
  verifyEmailController,
  resendVerificationTokenController,
  loginController,
  refreshTokenController,
} from "./auth.controller.js";

const router = Router();

router
  .post("/signup", signupController)
  .post("/verify-email", verifyEmailController)
  .post("/resend-verification-token", resendVerificationTokenController)
  .post("/login", loginController)
  .post("/refresh-token", refreshTokenController);

export default router;
