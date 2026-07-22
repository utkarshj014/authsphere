import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export interface HealthCheckStatus {
  api: "UP";
  database: "UP" | "DOWN";
  redis: "UP" | "DOWN";
}

export const healthService = async (): Promise<HealthCheckStatus> => {
  const checkDb = async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return "UP";
    } catch (error) {
      return "DOWN";
    }
  };
  const checkRedis = async () => {
    try {
      await redis.ping();
      return "UP";
    } catch (error) {
      return "DOWN";
    }
  };

  const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);

  return {
    api: "UP",
    database: dbStatus,
    redis: redisStatus,
  };
};
