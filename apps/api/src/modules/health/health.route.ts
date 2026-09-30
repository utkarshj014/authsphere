import { Router } from "express";
import { getHealth, getLiveness, getReadiness } from "./health.controller.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

// Root alias for backward compatibility (delegates to liveness)
router.get("/", rateLimiter(RATE_LIMIT_POLICIES.HEALTH), getHealth);

// ALB liveness probe: lightweight, in-memory, zero external I/O
router.get("/live", rateLimiter(RATE_LIMIT_POLICIES.HEALTH), getLiveness);

// Dependency readiness probe: checks PostgreSQL and Redis availability
router.get("/ready", rateLimiter(RATE_LIMIT_POLICIES.HEALTH), getReadiness);

export default router;
