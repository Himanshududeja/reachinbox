import {
  recoverStaleEmails,
  getPendingEmails
} from "../models/email.model";
import { getCampaignById } from "../models/campaign.model";
import { getSenderQueue } from "../queues/email.queue";

export const recoverEmails = async () => {
  const recovered = await recoverStaleEmails();

  const pendingEmails = await getPendingEmails();

  const grouped = new Map<number, typeof pendingEmails>();

  for (const email of pendingEmails) {
    const list = grouped.get(email.sender_id) || [];
    list.push(email);
    grouped.set(email.sender_id, list);
  }

  let queued = 0;

  for (const [senderId, emails] of grouped) {
    let nextAvailableAt = Date.now();

    for (const email of emails) {
      const campaigns: any =
        await getCampaignById(email.campaign_id);

      if (!campaigns.length) {
        console.error(
          `Campaign ${email.campaign_id} not found for email ${email.id}`
        );
        continue;
      }

      const campaignDelayMs =
        Math.max(
          0,
          Number(campaigns[0].delay_seconds) || 0
        ) * 1000;

      const scheduledAt =
        new Date(email.scheduled_at).getTime();

      const availableAt =
        Math.max(
          scheduledAt,
          nextAvailableAt
        );

      const delay =
        Math.max(
          0,
          availableAt - Date.now()
        );

      const queue = getSenderQueue(senderId);

      const existingJob = await queue.getJob(
        `email-${email.id}`
      );

      if (!existingJob) {
        await queue.add(
          "send-email",
          {
            emailId: email.id,
            senderId,
            senderSequence: email.sender_sequence
          },
          {
            jobId: `email-${email.id}`,
            delay,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000
            },
            removeOnComplete: true
          }
        );

        queued++;
      }

      nextAvailableAt =
        availableAt + campaignDelayMs;
    }
  }

  console.log(
    `Recovery completed. Reset ${recovered} stale emails and queued ${queued} emails.`
  );
};