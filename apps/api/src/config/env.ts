import dotenv from "dotenv";
import z from "zod";

// Always loads apps/api/.env regardless of current working directory
dotenv.config({ path: new URL("../../.env", import.meta.url) });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.issues);
  process.exit(1);
}

const env = parsed.data;

export type EnvConfig = z.infer<typeof envSchema>;
export { env };
