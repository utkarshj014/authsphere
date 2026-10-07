import {
  EMAIL_JOB_TYPES,
  type EmailJobData,
  type SecurityNotificationEventType,
} from "./email.types.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

export const enqueueEmailJob = async (data: EmailJobData): Promise<void> => {
  if (env.QUEUE_DRIVER === "sync") {
    logger.debug(
      { jobType: data.type, email: data.email },
      "Dispatching email job synchronously (QUEUE_DRIVER=sync / AWS Lambda)",
    );

    const { emailService } = await import("./email.service.js");
    const { resendProvider } = await import("./resend.provider.js");
    await emailService.processJob(data, resendProvider);
    return;
  }

  if (env.QUEUE_DRIVER === "inline") {
    logger.debug(
      { jobType: data.type, email: data.email },
      "Dispatching email job inline (QUEUE_DRIVER=inline)",
    );

    setImmediate(async () => {
      try {
        const { emailService } = await import("./email.service.js");
        const { resendProvider } = await import("./resend.provider.js");
        await emailService.processJob(data, resendProvider);
      } catch (err) {
        logger.error(
          { err, jobType: data.type, email: data.email },
          "Failed to dispatch inline email job",
        );
      }
    });
    return;
  }

  logger.debug(
    { jobType: data.type, email: data.email },
    "Enqueuing email job to BullMQ",
  );

  const { emailQueue } = await import("../../lib/queue.js");
  await emailQueue.add(data.type, data);
};

export const enqueueVerificationEmail = (
  email: string,
  token: string,
): Promise<void> =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.VERIFICATION,
    email,
    token,
  });

export const enqueuePasswordResetEmail = (
  email: string,
  token: string,
): Promise<void> =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.PASSWORD_RESET,
    email,
    token,
  });

export const enqueueMagicLinkEmail = (
  email: string,
  token: string,
): Promise<void> =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.MAGIC_LINK,
    email,
    token,
  });

export const enqueueSecurityNotificationEmail = (
  email: string,
  eventType: SecurityNotificationEventType,
): Promise<void> =>
  enqueueEmailJob({
    type: EMAIL_JOB_TYPES.SECURITY_NOTIFICATION,
    email,
    eventType,
  });
