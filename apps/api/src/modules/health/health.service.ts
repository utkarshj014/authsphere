import { healthRepository } from "./health.repository.js";
import type {
  HealthStatus,
  LivenessData,
  ReadinessData,
} from "./health.validation.js";

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

export const healthService = {
  /**
   * Pure in-memory process liveness check for AWS ALB / orchestrators.
   * Zero external I/O ensures load balancer target groups don't experience
   * cascading failure during temporary database or cache blips.
   */
  getLiveness: (): LivenessData => ({
    status: "UP",
    timestamp: new Date().toISOString(),
  }),

  /**
   * Deep dependency readiness check evaluating PostgreSQL and Redis connectivity.
   */
  getReadiness: async (): Promise<ReadinessData> => {
    const [database, redis] = await Promise.all([checkDb(), checkRedis()]);
    const isHealthy = database === "UP" && redis === "UP";

    return {
      status: isHealthy ? "UP" : "DOWN",
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  },
};
