import { emailQueue } from "../../lib/queue.js";
import {
  EMAIL_JOB_TYPES,
  type EmailJobData,
  type SecurityNotificationEventType,
} from "./email.types.js";
import { logger } from "../../lib/logger.js";

export const enqueueEmailJob = async (data: EmailJobData): Promise<void> => {
  logger.debug(
    { jobType: data.type, email: data.email },
    "Enqueuing email job to BullMQ",
  );

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
