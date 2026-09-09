import { DelayedError, Worker } from "bullmq";
import redis from "../config/redis";
import { indexEmail } from "../services/elasticsearch.service";
import {
  getEmailById,
  markEmailProcessing,
  markEmailSent,
  markEmailFailed
} from "../models/email.model";
import { getSenderById } from "../models/sender.model";
import { sendEmail } from "../services/mail.service";
import {
  reserveHourlySlot,
  releaseHourlySlot,
  shouldNotifyHourlyLimit
} from "../services/rate-limit.service";
import {
  getCampaignById,
  getCampaignUserId
} from "../models/campaign.model";
import { sendSlackNotification } from "../services/slack.service";

const workers = new Map<number, Worker>();

const waitForMinimumDelay = async (
  senderId: number,
  delaySeconds: number
) => {
  const minDelay =
    Math.max(0, Number(delaySeconds) || 0) * 1000;

  if (minDelay <= 0) {
    return;
  }

  const key = `sender-last-send:${senderId}`;
  const lastSend =
    Number(await redis.get(key) || 0);

  const waitTime =
    minDelay - (Date.now() - lastSend);

  if (waitTime > 0) {
    await new Promise(resolve =>
      setTimeout(resolve, waitTime)
    );
  }
};

const markSendTime = async (
  senderId: number,
  delaySeconds: number
) => {
  const minDelay =
    Math.max(0, Number(delaySeconds) || 0) * 1000;

  const ttl = Math.max(
    minDelay * 2,
    60000
  );

  await redis.set(
    `sender-last-send:${senderId}`,
    String(Date.now()),
    "PX",
    ttl
  );
};

const processEmail = async (job: any, token?: string) => {
  const { emailId, senderId } = job.data;

  const email: any = await getEmailById(emailId);

  if (!email.length) {
    throw new Error("Email not found");
  }

  if (email[0].status === "sent") {
    return;
  }

  const campaign: any =
  await getCampaignById(email[0].campaign_id);

if (!campaign.length) {
  throw new Error("Campaign not found");
}

  const sender = await getSenderById(senderId);

  if (!sender.length) {
    throw new Error("Sender not found");
  }

  const hourlyLimit =
  Number(campaign[0].hourly_limit) || 100;

const rateLimit = await reserveHourlySlot(
  String(senderId),
  hourlyLimit
);

  if (!rateLimit.allowed) {
    const shouldNotify =
      await shouldNotifyHourlyLimit(String(senderId));

    if (shouldNotify) {
      const userId =
        await getCampaignUserId(email[0].campaign_id);

      if (userId) {
        try {
          await sendSlackNotification(
            userId,
            `Hourly email limit reached for sender ${sender[0].email}. Emails are being delayed until the next available hour.`
          );
        } catch (error) {
          console.error(
            "Failed to send Slack hourly limit notification:",
            error
          );
        }
      }
    }

    const delayUntil =
      Date.now() + Math.max(
        rateLimit.retryAfterMs,
        1000
      );

    if (!token) {
      throw new Error("Worker lock token is missing");
    }

    await job.moveToDelayed(
      delayUntil,
      token
    );

    throw new DelayedError();
  }

  const claimed = await markEmailProcessing(emailId);

  if (!claimed) {
    await releaseHourlySlot(String(senderId));
    return;
  }

  let smtpCompleted = false;

  try {
    await waitForMinimumDelay(
  senderId,
  Number(campaign[0].delay_seconds)
);

    await sendEmail(
      email[0].recipient,
      email[0].subject,
      email[0].body,
      sender[0].email
    );

    smtpCompleted = true;

    await markSendTime(
  senderId,
  Number(campaign[0].delay_seconds)
);

    await markEmailSent(emailId);

    const updatedEmail: any =
      await getEmailById(emailId);

    await indexEmail({
      id: updatedEmail[0].id,
      campaign_id: updatedEmail[0].campaign_id,
      sender_id: updatedEmail[0].sender_id,
      recipient: updatedEmail[0].recipient,
      subject: updatedEmail[0].subject,
      body: updatedEmail[0].body,
      scheduled_at: updatedEmail[0].scheduled_at,
      sent_at: updatedEmail[0].sent_at,
      status: updatedEmail[0].status
    });
  } catch (error: any) {
    if (!smtpCompleted) {
      await releaseHourlySlot(String(senderId));
    }

    const maxAttempts =
      Number(job.opts.attempts) || 3;

    const currentAttempt =
      job.attemptsMade + 1;

    if (currentAttempt >= maxAttempts) {
      await markEmailFailed(
        emailId,
        error.message
      );
    }

    throw error;
  }
};

export const startSenderWorker = (
  senderId: number
) => {
  if (workers.has(senderId)) {
    return;
  }

  const configuredConcurrency =
    Number(process.env.WORKER_CONCURRENCY) || 1;

  const worker = new Worker(
    `email-queue-sender-${senderId}`,
    processEmail,
    {
      connection: redis,
      concurrency: Math.min(configuredConcurrency, 1)
    }
  );

  worker.on("completed", job => {
    console.log(
      `Sender ${senderId} email ${job.id} completed`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `Sender ${senderId} email ${job?.id} failed:`,
      error.message
    );
  });

  workers.set(senderId, worker);
};