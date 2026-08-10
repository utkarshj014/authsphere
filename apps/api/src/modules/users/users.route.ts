import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireSelfOrPermission } from "../authorization/authorization.middleware.js";
import { PERMISSIONS } from "@authsphere/shared";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import { usersSchema } from "./users.validation.js";
import { usersController } from "./users.controller.js";

const router = Router();

router.get(
  "/:id",
  auth,
  validate(usersSchema.getUser, ValidationTarget.PARAMS),
  requireSelfOrPermission(PERMISSIONS.USER_READ),
  usersController.getUser,
);

export default router;
