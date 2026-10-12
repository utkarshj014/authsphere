import dotenv from "dotenv";
import z from "zod";
import { formatZodError } from "../common/errors/format-zod-error.js";
import { parseDurationToMs } from "../common/utils/time.js";

// Load local/test environment files in non-production environments
if (process.env.NODE_ENV !== "production") {
  const envFile =
    process.env.NODE_ENV === "test" ? "../../.env.test" : "../../.env";
  dotenv.config({ path: new URL(envFile, import.meta.url), quiet: true });
}

const isWorker = process.env.APP_ROLE === "worker";

// 1. Shared Infrastructure (Required by both Express API & Background Worker)
const sharedConfig = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_ROLE: z.enum(["api", "worker"]).default("api"),
  QUEUE_DRIVER: z
    .enum(["bullmq", "inline", "sync"])
    .default(process.env.AWS_LAMBDA_FUNCTION_NAME ? "sync" : "bullmq"),
  FRONTEND_URL: z.url(),
  REDIS_URL: z.url(),
});

// 2. Email Worker Config (Only required by BullMQ background worker)
const workerConfig = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

// 3. API Server, Database & Auth Config (Only required by Express API)
const apiConfig = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  TRUST_PROXY: z
    .string()
    .default("false")
    .transform((val): boolean | number | string | string[] => {
      if (!val || val === "false") return false;
      if (val === "true") return true;
      const trimmed = val.trim();
      if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return trimmed;
    }),
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  AUTH_REUSE_DELETION_MODE: z.enum(["SESSION", "GLOBAL"]).default("SESSION"),
  AUTH_REFRESH_TOKEN_LEEWAY_SECONDS: z.coerce.number().int().min(0).default(30),
  MFA_ENCRYPTION_KEY: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_CALLBACK_BASE_URL: z.string().optional(), //keep string because url validation will fail on empty strings provided during deployment
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const apiSchema = sharedConfig
  .extend(apiConfig.shape)
  .transform((config) => ({
    ...config,
    JWT_ACCESS_EXPIRES_IN_MS: parseDurationToMs(config.JWT_ACCESS_EXPIRES_IN),
    JWT_REFRESH_EXPIRES_IN_MS: parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN),
  }))
  .refine(
    (data) =>
      (data.QUEUE_DRIVER !== "inline" && data.QUEUE_DRIVER !== "sync") ||
      Boolean(data.RESEND_API_KEY && data.EMAIL_FROM),
    {
      message:
        "RESEND_API_KEY and EMAIL_FROM are required when QUEUE_DRIVER is inline or sync",
      path: ["RESEND_API_KEY"],
    },
  );

const workerSchema = sharedConfig.extend(workerConfig.shape);

const activeSchema = isWorker ? workerSchema : apiSchema;

const parsed = activeSchema.safeParse(process.env);

if (!parsed.success) {
  const formattedErrors = formatZodError(parsed.error);
  console.error(
    `Invalid environment variables for ${isWorker ? "Worker" : "API"}:`,
  );
  formattedErrors.forEach((err) => {
    console.error(`- ${err.field}: ${err.message}`);
  });
  process.exit(1);
}

const fullSchema = sharedConfig
  .extend(apiConfig.shape)
  .extend(workerConfig.shape);

export type EnvConfig = z.infer<typeof fullSchema> & {
  JWT_ACCESS_EXPIRES_IN_MS: number;
  JWT_REFRESH_EXPIRES_IN_MS: number;
};

export const env = parsed.data as EnvConfig;
