import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { env } from "./config/env.js";

import healthRouter from "./routes/health.route.js";
import testRouter from "./routes/test.route.js";
import { errorHandler } from "./common/errors/error-handler.js";

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

// Routes
app.use("/health", healthRouter);
app.use("/test", testRouter);

// Error Handling
app.use(errorHandler);

export default app;
