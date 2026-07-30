import { Router } from "express";
import {
  signupController,
  verifyEmailController,
  resendVerificationTokenController,
  loginController,
} from "./auth.controller.js";

const router = Router();

router
  .post("/signup", signupController)
  .post("/verify-email", verifyEmailController)
  .post("/resend-verification-token", resendVerificationTokenController)
  .post("/login", loginController);

export default router;
