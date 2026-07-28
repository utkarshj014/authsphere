import { Router } from "express";
import { signupController, verifyEmailController } from "./auth.controller.js";

const router = Router();

router
  .post("/signup", signupController)
  .post("/verify-email", verifyEmailController);

export default router;
