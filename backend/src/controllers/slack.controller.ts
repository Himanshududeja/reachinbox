import { Request, Response } from "express";
import {
  createSlackState,
  getSlackAuthorizationUrl,
  consumeSlackState,
  connectSlack,
  getConnectedSlack,
  disconnectSlack,
  sendSlackNotification
} from "../services/slack.service";

export const startSlackOAuth = (
  req: Request,
  res: Response
) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({
      message: "userId is required"
    });
  }

  const state = createSlackState(userId);

  return res.redirect(
    getSlackAuthorizationUrl(state)
  );
};

export const slackOAuthCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        message: `Slack authorization failed: ${error}`
      });
    }

    if (
      typeof code !== "string" ||
      typeof state !== "string"
    ) {
      return res.status(400).json({
        message: "Missing OAuth code or state"
      });
    }

    const userId = consumeSlackState(state);

    if (!userId) {
      return res.status(400).json({
        message: "Invalid or expired OAuth state"
      });
    }

    const connection = await connectSlack(
      userId,
      code
    );

    return res.json({
      message: "Slack connected successfully",
      connection
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to connect Slack"
    });
  }
};

export const getSlackStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        message: "userId is required"
      });
    }

    const connections =
      await getConnectedSlack(userId);

    if (!connections.length) {
      return res.json({
        connected: false
      });
    }

    return res.json({
      connected: true,
      teamName: connections[0].team_name,
      channelName: connections[0].channel_name
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch Slack status"
    });
  }
};

export const disconnectSlackController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        message: "userId is required"
      });
    }

    await disconnectSlack(userId);

    return res.json({
      message: "Slack disconnected"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to disconnect Slack"
    });
  }
};

export const testSlackNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        message: "userId is required"
      });
    }

    const sent = await sendSlackNotification(
      userId,
      "ReachInbox Slack integration is working."
    );

    if (!sent) {
      return res.status(404).json({
        message: "Slack is not connected"
      });
    }

    return res.json({
      message: "Slack notification sent"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to send Slack notification"
    });
  }
};