import dotenv from "dotenv";
import z from "zod";
import { formatZodError } from "../common/errors/format-zod-error.js";
import { parseDurationToMs } from "../common/utils/time.js";

// Always loads apps/api/.env regardless of current working directory
dotenv.config({ path: new URL("../../.env", import.meta.url) });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production"]),
    PORT: z.coerce.number().int().positive(),
    FRONTEND_URL: z.url(),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    JWT_ACCESS_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1),
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
