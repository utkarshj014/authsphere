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
  // 5s headroom accommodates Neon serverless compute cold resume when establishing new connections
  connectionTimeoutMillis: 5000,
  // 10s query timeout bounds individual SQL operations, preventing indefinite hangs on frozen/stalled connections
  query_timeout: 10000,
  // 0 disables client-side timer eviction to favor connection reuse across warm invocations
  idleTimeoutMillis: 0,
  // Unrefs idle sockets in libuv: allows CLI scripts (seed/migrate) and test runners to exit cleanly
  // without hanging. (In Lambda, async Promise resolution governs execution completion;
  // in ECS, server.ts explicitly calls prisma.$disconnect() on SIGTERM).
  allowExitOnIdle: true,
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma, pool };
