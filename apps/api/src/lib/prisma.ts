import { Pool, type PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// Detect if executing inside an AWS Lambda serverless microVM
const isLambdaRuntime = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT,
);

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  // Hard ceiling protects database: Lambda (max 2 sockets), ECS (max 10 sockets)
  max: env.DATABASE_POOL_MAX ?? (isLambdaRuntime ? 2 : 10),
  // 5s headroom accommodates Neon serverless compute cold resume when waking from auto-suspend
  connectionTimeoutMillis: 5000,
  // 0 disables client-side timer eviction: lets Neon PgBouncer manage idle socket lifecycle
  // without artificial reconnect penalties during warm pauses (15s - 60s)
  idleTimeoutMillis: 0,
  // Unrefs idle sockets in libuv: allows CLI scripts (seed/migrate) and test runners to exit cleanly
  // without hanging. (In Lambda, callbackWaitsForEmptyEventLoop=false already handles freeze/exit;
  // in ECS, server.ts explicitly calls prisma.$disconnect() on SIGTERM).
  allowExitOnIdle: true,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma, pool };
