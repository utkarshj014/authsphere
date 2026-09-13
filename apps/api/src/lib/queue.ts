import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import type { EmailJobData } from "../modules/email/email.types.js";

export const EMAIL_QUEUE_NAME = "authsphere-email";

export const createBullMQConnection = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createBullMQConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s, 16s, 32s
    },
    removeOnComplete: true,
    removeOnFail: {
      count: 500, // Retain last 500 failed jobs for inspection
    },
  },
});
