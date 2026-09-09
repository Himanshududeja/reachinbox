import { Response } from "express";
import {
  scheduleEmail,
  scheduleBulkEmails
} from "../services/email.service";
import {
  getScheduledEmails,
  getSentEmails
} from "../models/email.model";
import {
  getCampaignById
} from "../models/campaign.model";
import {
  AuthRequest
} from "../middleware/auth.middleware";

export const addScheduledEmail = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const campaignId = Number(req.params.id);

    const {
      senderId,
      recipient,
      subject,
      body,
      scheduledAt
    } = req.body;

    if (
      !campaignId ||
      !senderId ||
      !recipient ||
      !subject ||
      !body ||
      !scheduledAt
    ) {
      return res.status(400).json({
        message:
          "campaignId, senderId, recipient, subject, body and scheduledAt are required"
      });
    }

    const campaigns: any = await getCampaignById(campaignId);

    if (!campaigns.length) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    if (campaigns[0].user_id !== req.user.userId) {
      return res.status(403).json({
        message: "You do not have access to this campaign"
      });
    }

    const idempotencyKey =
      req.header("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({
        message: "Idempotency-Key header is required"
      });
    }

    const date = new Date(scheduledAt);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduledAt"
      });
    }

    if (date.getTime() <= Date.now()) {
      return res.status(400).json({
        message: "scheduledAt must be in the future"
      });
    }

    const emailId = await scheduleEmail(
      campaignId,
      Number(senderId),
      recipient,
      subject,
      body,
      date,
      idempotencyKey
    );

    return res.status(201).json({
      message: "Email scheduled",
      emailId,
      scheduledAt: date
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to schedule email"
    });
  }
};

export const addBulkScheduledEmails = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const campaignId = Number(req.params.id);
    const { senderId, emails } = req.body;

    if (
      !campaignId ||
      !senderId ||
      !Array.isArray(emails) ||
      !emails.length
    ) {
      return res.status(400).json({
        message:
          "campaignId, senderId and emails are required"
      });
    }

    const campaigns: any = await getCampaignById(campaignId);

    if (!campaigns.length) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    if (campaigns[0].user_id !== req.user.userId) {
      return res.status(403).json({
        message: "You do not have access to this campaign"
      });
    }

    const formattedEmails = emails.map(
      (email: any) => ({
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        scheduledAt: new Date(email.scheduledAt)
      })
    );

    const invalidEmail = formattedEmails.some(
      email =>
        !email.recipient ||
        !email.subject ||
        !email.body ||
        Number.isNaN(email.scheduledAt.getTime()) ||
        email.scheduledAt.getTime() <= Date.now()
    );

    if (invalidEmail) {
      return res.status(400).json({
        message: "Invalid email data or scheduledAt"
      });
    }

    const emailIds = await scheduleBulkEmails(
      campaignId,
      Number(senderId),
      formattedEmails
    );

    return res.status(201).json({
      message: "Emails scheduled",
      emailIds
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to schedule emails"
    });
  }
};

export const listScheduledEmails = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const emails = await getScheduledEmails(req.user.userId);
    return res.status(200).json({
      emails
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch scheduled emails"
    });
  }
};

export const listSentEmails = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const emails = await getSentEmails(req.user.userId);

    return res.status(200).json({
      emails
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch sent emails"
    });
  }
};