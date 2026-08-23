import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { env } from "./config/env.js";

import { healthRouter } from "./modules/health/index.js";
import { errorHandler } from "./common/errors/index.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { requestId } from "./middlewares/request-id.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { authRouter } from "./modules/auth/index.js";
import { usersRouter } from "./modules/users/index.js";
import { rolesRouter } from "./modules/roles/index.js";

import { rateLimiter, RATE_LIMIT_POLICIES } from "./middlewares/rate-limit.js";
import { originValidation } from "./middlewares/origin-validation.js";

const app = express();

// Configure proxy trust
// Handles boolean, hop count number, or subnet/IP arrays
app.set("trust proxy", env.TRUST_PROXY);

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: { action: "deny" },
  }),
);

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// Request ID Middleware
app.use(requestId);

// Request Logger Middleware
app.use(requestLogger);

// Origin Validation Middleware
// Guards state-changing requests against untrusted browser origins
app.use(originValidation);

// Global Rate Limiter Middleware
// Defends against API-wide flooding
app.use(rateLimiter(RATE_LIMIT_POLICIES.GLOBAL));

// Body & Cookie Parsers
// Deferred until after rate-limiting & origin validation to save CPU & memory
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// Application Routes
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/roles", rolesRouter);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
