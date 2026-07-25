import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Always loads apps/api/.env regardless of current working directory
dotenv.config({ path: new URL(".env", import.meta.url) });

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
