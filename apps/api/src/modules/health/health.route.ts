import { Router } from "express";
import { getHealth, getLiveness, getReadiness } from "./health.controller.js";
import {
  rateLimiter,
  RATE_LIMIT_POLICIES,
} from "../../middlewares/rate-limit.js";

const router = Router();

// Root alias for backward compatibility (delegates to liveness: zero external I/O)
router.get("/", getHealth);

// Liveness probe: lightweight, in-memory, zero external I/O
router.get("/live", getLiveness);

// Dependency readiness probe: checks PostgreSQL and Redis availability (rate-limited against abuse)
router.get("/ready", rateLimiter(RATE_LIMIT_POLICIES.HEALTH), getReadiness);

export default router;
