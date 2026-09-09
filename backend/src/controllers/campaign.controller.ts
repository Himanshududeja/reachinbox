import { Response } from "express";
import {
  createCampaign,
  getCampaignById
} from "../models/campaign.model";
import { AuthRequest } from "../middleware/auth.middleware";

export const addCampaign = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const {
  name,
  delaySeconds = 5,
  hourlyLimit = 2
} = req.body;

    if (!name) {
      return res.status(400).json({
        message: "name is required"
      });
    }

    const result: any = await createCampaign(
  req.user.userId,
  name,
  Number(delaySeconds),
  Number(hourlyLimit)
);

    return res.status(201).json({
      message: "Campaign created",
      campaignId: result.insertId
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create campaign"
    });
  }
};

export const getCampaign = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Invalid campaign id"
      });
    }

    const campaign: any =
      await getCampaignById(id);

    if (!campaign.length) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    if (
      campaign[0].user_id !== req.user.userId
    ) {
      return res.status(403).json({
        message: "You do not have access to this campaign"
      });
    }

    return res.json(campaign[0]);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch campaign"
    });
  }
};