import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

export const healthRepository = {
  checkDatabase: () => prisma.$queryRaw`SELECT 1`,
  checkRedis: () => redis.ping(),
};
