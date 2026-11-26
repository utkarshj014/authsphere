import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env.test when running under NODE_ENV=test, otherwise default to .env
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: new URL(envFile, import.meta.url) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
