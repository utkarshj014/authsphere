import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import {
  requireRole,
  requireSelfOrPermission,
} from "../authorization/authorization.middleware.js";
import { PERMISSIONS, ROLES } from "@authsphere/shared";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import { usersRequestSchema } from "./users.validation.js";
import { usersController } from "./users.controller.js";

import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

router
  .get(
    "/:id",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.USER_READ),
    validate(usersRequestSchema.getUser, ValidationTarget.PARAMS),
    requireSelfOrPermission(PERMISSIONS.USER_READ),
    usersController.getUser,
  )
  .patch(
    "/:id/role",
    auth,
    rateLimiter(RATE_LIMIT_POLICIES.USER_CHANGE_ROLE),
    validate(usersRequestSchema.getUser, ValidationTarget.PARAMS),
    validate(usersRequestSchema.role, ValidationTarget.BODY),
    requireRole(ROLES.ADMIN),
    usersController.changeRole,
  );

export default router;
