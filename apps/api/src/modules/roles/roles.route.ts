import { Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../authorization/authorization.middleware.js";
import { ROLES } from "@authsphere/shared";
import { validate, ValidationTarget } from "../../middlewares/validate.js";
import { rolesSchema } from "./roles.validation.js";
import { rolesController } from "./roles.controller.js";

const router = Router();

router.put(
  "/:roleName/permissions",
  auth,
  validate(rolesSchema.updatePermissionsParams, ValidationTarget.PARAMS),
  validate(rolesSchema.updatePermissionsBody, ValidationTarget.BODY),
  requireRole(ROLES.ADMIN),
  rolesController.updatePermissions,
);

export default router;
