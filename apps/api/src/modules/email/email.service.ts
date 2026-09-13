import { UnrecoverableError } from "bullmq";
import {
  EMAIL_JOB_TYPES,
  type EmailJobData,
  type EmailProvider,
  type EmailSendResult,
} from "./email.types.js";
import { emailTemplates } from "./email.templates.js";

const processJob = async (
  data: EmailJobData,
  provider: EmailProvider,
): Promise<EmailSendResult> => {
  let template: { subject: string; html: string };

  switch (data.type) {
    case EMAIL_JOB_TYPES.VERIFICATION:
      template = emailTemplates.verification(data.token);
      break;

    case EMAIL_JOB_TYPES.PASSWORD_RESET:
      template = emailTemplates.passwordReset(data.token);
      break;

    case EMAIL_JOB_TYPES.MAGIC_LINK:
      template = emailTemplates.magicLink(data.token);
      break;

    case EMAIL_JOB_TYPES.SECURITY_NOTIFICATION:
      template = emailTemplates.securityNotification(data.eventType);
      break;

    default: {
      const exhaustiveCheck: never = data;
      throw new UnrecoverableError(
        `Unsupported email job type: ${(exhaustiveCheck as any)?.type}`,
      );
    }
  }

  return provider.send({
    to: data.email,
    subject: template.subject,
    html: template.html,
  });
};

export const emailService = {
  processJob,
};
