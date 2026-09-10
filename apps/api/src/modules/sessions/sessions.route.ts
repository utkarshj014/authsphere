import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";
import { sessionsRequestSchema } from "./sessions.validation.js";
import { sessionsController } from "./sessions.controller.js";

const router = Router();

router
  .get(
    "/",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.SESSIONS_READ),
    sessionsController.getActiveSessions,
  )
  .delete(
    "/:id",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.SESSION_REVOKE),
    validate(
      sessionsRequestSchema.revokeSessionParams,
      ValidationTarget.PARAMS,
    ),
    sessionsController.revokeSession,
  );

export default router;
