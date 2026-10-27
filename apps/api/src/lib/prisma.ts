import { Pool, type PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// Detect if executing inside an AWS Lambda serverless microVM
const isLambdaRuntime = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT,
);

// Bound pool dynamically: Lambda microVMs handle 1 request at a time (max 2 sockets);
// ECS / long-running servers handle concurrent event loop requests (max 10 sockets)
const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX ?? (isLambdaRuntime ? 2 : 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: isLambdaRuntime ? 15000 : 30000,
  allowExitOnIdle: true,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma, pool };
