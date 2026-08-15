import { Router } from "express";
import { getHealth } from "./health.controller.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

router.get("/", rateLimiter(RATE_LIMIT_POLICIES.HEALTH), getHealth);

export default router;
