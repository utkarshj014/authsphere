import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  // Fail fast instead of queuing commands in memory across frozen Lambda invocations
  enableOfflineQueue: false,
  // Bounded timeouts prevent blocking requests if Redis or TLS handshakes stall
  connectTimeout: 2000,
  commandTimeout: 1000,
  retryStrategy(times) {
    if (times > 3) return null; // Stop after 3 failures during outages
    return (times - 1) * 50; // Attempt 1: 0ms (immediate SYN), Attempt 2: 50ms, Attempt 3: 100ms
  },
});

// Prevent unhandled EventEmitter 'error' crashes when idle sockets drop across Lambda freezes
redis.on("error", (err) => {
  logger.warn({ err }, "Redis client error");
});
