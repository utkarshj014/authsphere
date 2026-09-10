import { healthRepository } from "./health.repository.js";
import type { HealthStatus, HealthDataResponse } from "./health.validation.js";

const checkDb = async (): Promise<HealthStatus> => {
  try {
    await healthRepository.checkDatabase();
    return "UP";
  } catch {
    return "DOWN";
  }
};

const checkRedis = async (): Promise<HealthStatus> => {
  try {
    await healthRepository.checkRedis();
    return "UP";
  } catch {
    return "DOWN";
  }
};

export const healthService = async (): Promise<HealthDataResponse> => {
  const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);

  return {
    api: "UP",
    database: dbStatus,
    redis: redisStatus,
  };
};
