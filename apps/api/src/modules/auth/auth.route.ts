import { Router } from "express";
import {
  signupController,
  verifyEmailController,
  resendEmailVerificationTokenController,
} from "./auth.controller.js";

const router = Router();

router
  .post("/signup", signupController)
  .post("/verify-email", verifyEmailController)
  .post("/resend-verification-email", resendEmailVerificationTokenController);

export default router;
