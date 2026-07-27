import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { env } from "./config/env.js";

import { healthRouter } from "./modules/health/index.js";
import testRouter from "./routes/test.route.js";
import { errorHandler } from "./common/errors/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { requestId } from "./middlewares/request-id.js";
import { requestLogger } from "./middlewares/request-logger.js";
import { authRouter } from "./modules/auth/index.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Request ID Middleware
app.use(requestId);

// Request Logger Middleware
app.use(requestLogger);

// Routes
app.use("/health", healthRouter);
app.use("/test", testRouter);
app.use("/auth", authRouter);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
