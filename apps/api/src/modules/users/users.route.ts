import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import {
  requireRole,
  requireSelfOrPermission,
} from "../authorization/authorization.middleware.js";
import { PERMISSIONS, ROLES } from "@authsphere/shared";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import { usersSchema } from "./users.validation.js";
import { usersController } from "./users.controller.js";

const router = Router();

router
  .get(
    "/:id",
    auth,
    validate(usersSchema.getUser, ValidationTarget.PARAMS),
    requireSelfOrPermission(PERMISSIONS.USER_READ),
    usersController.getUser,
  )
  .patch(
    "/:id/role",
    auth,
    validate(usersSchema.getUser, ValidationTarget.PARAMS),
    validate(usersSchema.role, ValidationTarget.BODY),
    requireRole(ROLES.ADMIN),
    usersController.changeRole,
  );

export default router;
