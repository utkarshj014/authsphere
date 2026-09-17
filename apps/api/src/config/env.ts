import dotenv from "dotenv";
import z from "zod";
import { formatZodError } from "../common/errors/format-zod-error.js";
import { parseDurationToMs } from "../common/utils/time.js";

// Load test environment if running under Vitest, otherwise load default .env
const envFile =
  process.env.NODE_ENV === "test" ? "../../.env.test" : "../../.env";
dotenv.config({ path: new URL(envFile, import.meta.url), quiet: true });

const isWorker = process.env.APP_ROLE === "worker";

// 1. Shared Infrastructure & Email Config (Required by both API & Worker)
const sharedConfig = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  FRONTEND_URL: z.url(),
  REDIS_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
});

// 2. API Server, Database & Auth Config (Only required by Express API)
const apiConfig = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  AUTH_REUSE_DELETION_MODE: z.enum(["SESSION", "GLOBAL"]).default("SESSION"),
  MFA_ENCRYPTION_KEY: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  OAUTH_CALLBACK_BASE_URL: z.url(),
  TRUST_PROXY: z
    .string()
    .optional()
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
    })
    .default("false"),
});

const fullApiSchema = sharedConfig.extend(apiConfig.shape);
const activeSchema = isWorker
  ? sharedConfig.extend(apiConfig.partial().shape)
  : fullApiSchema;

const envSchema = activeSchema.transform((config) => ({
  ...config,
  JWT_ACCESS_EXPIRES_IN_MS: parseDurationToMs(
    config.JWT_ACCESS_EXPIRES_IN ?? "15m",
  ),
  JWT_REFRESH_EXPIRES_IN_MS: parseDurationToMs(
    config.JWT_REFRESH_EXPIRES_IN ?? "30d",
  ),
}));

const parsed = envSchema.safeParse(process.env);

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

export type EnvConfig = z.infer<typeof fullApiSchema> & {
  JWT_ACCESS_EXPIRES_IN_MS: number;
  JWT_REFRESH_EXPIRES_IN_MS: number;
};

export const env = parsed.data as unknown as EnvConfig;
