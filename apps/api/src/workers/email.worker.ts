import { Worker, type Job, UnrecoverableError } from "bullmq";
import { EMAIL_QUEUE_NAME, createBullMQConnection } from "../lib/queue.js";
import { emailService } from "../modules/email/email.service.js";
import { resendProvider } from "../modules/email/resend.provider.js";
import {
  EmailDeliveryError,
  type EmailJobData,
} from "../modules/email/email.types.js";
import { logger } from "../lib/logger.js";

const connection = createBullMQConnection();

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { id, data, attemptsMade } = job;

    try {
      await emailService.processJob(data, resendProvider);
      logger.info(
        { jobId: id, jobType: data.type, email: data.email },
        "Email delivered successfully",
      );
    } catch (err: unknown) {
      if (err instanceof UnrecoverableError) throw err;

      if (err instanceof EmailDeliveryError && err.isPermanent) {
        logger.error(
          { jobId: id, err },
          "Permanent email failure; aborting retries",
        );
        throw new UnrecoverableError(err.message);
      }

      const maxAttempts = job.opts.attempts ?? 5;
      const currentAttempt = attemptsMade + 1;

      if (currentAttempt < maxAttempts) {
        logger.warn(
          { jobId: id, attempt: currentAttempt, maxAttempts, err },
          "Transient email failure; BullMQ will retry with backoff",
        );
      } else {
        logger.error(
          { jobId: id, attemptsMade: currentAttempt, maxAttempts, err },
          "Email delivery exhausted all retry attempts; moved to dead-letter",
        );
      }
      throw err;
    }
  },
  {
    connection,
    concurrency: 5,
  },
);

emailWorker.on("error", (err) => {
  logger.error({ err }, "BullMQ email worker internal error");
});

let isShuttingDown = false;

const handleShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress!");
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}, stopping email worker...`);

  const timer = setTimeout(() => {
    logger.error("Email worker shutdown timed out, exiting forcefully");
    process.exit(1);
  }, 10000);
  timer.unref();

  try {
    await emailWorker.close();
    await connection.quit();
    logger.flush?.();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during email worker shutdown");
    logger.flush?.();
    process.exit(1);
  }
};

(["SIGINT", "SIGTERM"] as const).forEach((signal) => {
  process.on(signal, () => handleShutdown(signal));
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Worker uncaught exception");
  handleShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Worker unhandled rejection");
  handleShutdown("unhandledRejection");
});

logger.info(
  { queue: EMAIL_QUEUE_NAME },
  "Email worker process initialized and listening for jobs",
);
