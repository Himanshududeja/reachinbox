import crypto from "crypto";
import {
  saveSlackConnection,
  getSlackConnection,
  deleteSlackConnection
} from "../models/slack.model";

const slackStates = new Map<string, number>();

export const createSlackState = (userId: number) => {
  const state = crypto.randomBytes(32).toString("hex");

  slackStates.set(state, userId);

  setTimeout(() => {
    slackStates.delete(state);
  }, 10 * 60 * 1000);

  return state;
};

export const consumeSlackState = (state: string) => {
  const userId = slackStates.get(state);

  if (!userId) {
    return null;
  }

  slackStates.delete(state);

  return userId;
};

export const getSlackAuthorizationUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || "",
    scope: "incoming-webhook",
    redirect_uri: process.env.SLACK_REDIRECT_URI || "",
    state
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

export const exchangeSlackCode = async (code: string) => {
  const body = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID || "",
    client_secret: process.env.SLACK_CLIENT_SECRET || "",
    code,
    redirect_uri: process.env.SLACK_REDIRECT_URI || ""
  });

  const response = await fetch(
    "https://slack.com/api/oauth.v2.access",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Slack OAuth failed");
  }

  return data;
};

export const connectSlack = async (
  userId: number,
  code: string
) => {
  const data = await exchangeSlackCode(code);

  if (!data.incoming_webhook?.url) {
    throw new Error("Slack did not return an incoming webhook");
  }

  await saveSlackConnection(
    userId,
    data.team?.id || "",
    data.team?.name || null,
    data.authed_user?.id || null,
    data.incoming_webhook.channel_id || null,
    data.incoming_webhook.channel || null,
    data.incoming_webhook.url,
    data.access_token || null
  );

  return {
    teamName: data.team?.name || null,
    channelName: data.incoming_webhook.channel || null
  };
};

export const getConnectedSlack = async (userId: number) => {
  return getSlackConnection(userId);
};

export const disconnectSlack = async (userId: number) => {
  await deleteSlackConnection(userId);
};

export const sendSlackNotification = async (
  userId: number,
  message: string
) => {
  const connections = await getSlackConnection(userId);

  if (!connections.length) {
    return false;
  }

  const response = await fetch(
    connections[0].webhook_url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: message
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Slack notification failed: ${response.status}`
    );
  }

  return true;
};