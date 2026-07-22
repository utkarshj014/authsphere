import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

type ServiceStatus = "UP" | "DOWN";

interface HealthCheckStatus {
  api: ServiceStatus;
  database: ServiceStatus;
  redis: ServiceStatus;
}

const checkDb = async (): Promise<ServiceStatus> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "UP";
  } catch {
    return "DOWN";
  }
};

const checkRedis = async (): Promise<ServiceStatus> => {
  try {
    await redis.ping();
    return "UP";
  } catch {
    return "DOWN";
  }
};

export const healthService = async (): Promise<HealthCheckStatus> => {
  const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);

  return {
    api: "UP",
    database: dbStatus,
    redis: redisStatus,
  };
};
