import crypto from "crypto";
import { getSenderQueue } from "../queues/email.queue";
import {
  createEmail,
  getEmailById,
  getEmailByIdempotencyKey,
  getPendingCountBefore
} from "../models/email.model";
import { indexEmail } from "./elasticsearch.service";
import { getCampaignById } from "../models/campaign.model";

interface ScheduledEmail {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}

export const scheduleEmail = async (
  campaignId: number,
  senderId: number,
  recipient: string,
  subject: string,
  body: string,
  scheduledAt: Date,
  idempotencyKey: string
) => {
  const existing: any =
    await getEmailByIdempotencyKey(idempotencyKey);

  if (existing.length) {
    return existing[0].id;
  }

  const result: any = await createEmail(
    campaignId,
    senderId,
    recipient,
    subject,
    body,
    scheduledAt,
    idempotencyKey
  );

  const emailId = result.insertId;

  const campaigns: any =
  await getCampaignById(campaignId);

if (!campaigns.length) {
  throw new Error("Campaign not found");
}

const campaignDelayMs =
  Number(campaigns[0].delay_seconds) * 1000;

  const email: any = await getEmailById(emailId);

  if (!email.length) {
    throw new Error("Email could not be loaded after creation");
  }

  await indexEmail({
    id: email[0].id,
    campaign_id: email[0].campaign_id,
    sender_id: email[0].sender_id,
    recipient: email[0].recipient,
    subject: email[0].subject,
    body: email[0].body,
    scheduled_at: email[0].scheduled_at,
    sent_at: email[0].sent_at,
    status: email[0].status
  });

  const minDelay = Math.max(
  0,
  campaignDelayMs
);

  const pendingBefore =
    await getPendingCountBefore(
      senderId,
      result.senderSequence
    );

  const delay =
    Math.max(
      0,
      scheduledAt.getTime() - Date.now()
    ) +
    pendingBefore * minDelay;

  const senderQueue = getSenderQueue(senderId);

  await senderQueue.add(
    "send-email",
    {
      emailId,
      senderId,
      senderSequence: result.senderSequence
    },
    {
      jobId: `email-${emailId}`,
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: true
    }
  );

  return emailId;
};

export const scheduleBulkEmails = async (
  campaignId: number,
  senderId: number,
  emails: ScheduledEmail[]
) => {
  const emailIds: number[] = [];

  for (const email of emails) {
    const emailId = await scheduleEmail(
      campaignId,
      senderId,
      email.recipient,
      email.subject,
      email.body,
      email.scheduledAt,
      crypto.randomUUID()
    );

    emailIds.push(emailId);
  }

  return emailIds;
};
