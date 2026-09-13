import dotenv from "dotenv";
import z from "zod";
import { formatZodError } from "../common/errors/format-zod-error.js";
import { parseDurationToMs } from "../common/utils/time.js";

// Loads apps/api/.env.test in test mode, or apps/api/.env otherwise
const envFile =
  process.env.NODE_ENV === "test" ? "../../.env.test" : "../../.env";
dotenv.config({ path: new URL(envFile, import.meta.url), quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.coerce.number().int().positive(),
    FRONTEND_URL: z.url(),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1),
    AUTH_REUSE_DELETION_MODE: z.enum(["SESSION", "GLOBAL"]).default("SESSION"),
    MFA_ENCRYPTION_KEY: z.string().min(16),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    OAUTH_CALLBACK_BASE_URL: z.url(),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    TRUST_PROXY: z
      .string()
      .optional()
      .transform((val): boolean | number | string | string[] => {
        if (!val || val === "false") return false;
        if (val === "true") return true;

        const trimmed = val.trim();
        if (/^\d+$/.test(trimmed)) {
          return parseInt(trimmed, 10);
        }

        if (trimmed.includes(",")) {
          return trimmed
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        return trimmed;
      })
      .default("false"),
  })
  .transform((config) => ({
    ...config,
    JWT_ACCESS_EXPIRES_IN_MS: parseDurationToMs(config.JWT_ACCESS_EXPIRES_IN),
    JWT_REFRESH_EXPIRES_IN_MS: parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN),
  }));

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formattedErrors = formatZodError(parsed.error);

  console.error("Invalid environment variables configuration:");
  formattedErrors.forEach((err) => {
    console.error(`- ${err.field}: ${err.message}`);
  });

  process.exit(1);
}

const env = parsed.data;

export type EnvConfig = z.infer<typeof envSchema>;
export { env };
