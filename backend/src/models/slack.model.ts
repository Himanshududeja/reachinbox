import pool from "../config/database";

export interface SlackConnection {
  id: number;
  user_id: number;
  team_id: string;
  team_name: string | null;
  slack_user_id: string | null;
  channel_id: string | null;
  channel_name: string | null;
  webhook_url: string;
  access_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export const saveSlackConnection = async (
  userId: number,
  teamId: string,
  teamName: string | null,
  slackUserId: string | null,
  channelId: string | null,
  channelName: string | null,
  webhookUrl: string,
  accessToken: string | null
) => {
  await pool.execute(
    `INSERT INTO slack_connections
    (
      user_id,
      team_id,
      team_name,
      slack_user_id,
      channel_id,
      channel_name,
      webhook_url,
      access_token
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      team_name = VALUES(team_name),
      slack_user_id = VALUES(slack_user_id),
      channel_id = VALUES(channel_id),
      channel_name = VALUES(channel_name),
      webhook_url = VALUES(webhook_url),
      access_token = VALUES(access_token),
      updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      teamId,
      teamName,
      slackUserId,
      channelId,
      channelName,
      webhookUrl,
      accessToken
    ]
  );
};

export const getSlackConnection = async (userId: number) => {
  const [rows] = await pool.execute(
    `SELECT *
     FROM slack_connections
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );

  return rows as SlackConnection[];
};

export const deleteSlackConnection = async (userId: number) => {
  await pool.execute(
    `DELETE FROM slack_connections
     WHERE user_id = ?`,
    [userId]
  );
};