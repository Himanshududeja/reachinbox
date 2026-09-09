import pool from "../config/database";

export const createCampaign = async (
  userId: number,
  name: string,
  delaySeconds: number,
  hourlyLimit: number
) => {
  const [result] = await pool.execute(
    `INSERT INTO campaigns
     (user_id, name, delay_seconds, hourly_limit)
     VALUES (?, ?, ?, ?)`,
    [userId, name, delaySeconds, hourlyLimit]
  );

  return result;
};

export const getCampaignById = async (id: number) => {
  const [rows] = await pool.execute(
    `SELECT
      id,
      user_id,
      name,
      status,
      delay_seconds,
      hourly_limit,
      created_at,
      updated_at
     FROM campaigns
     WHERE id = ?`,
    [id]
  );

  return rows;
};

export const updateCampaignStatus = async (
  id: number,
  status: string
) => {
  await pool.execute(
    "UPDATE campaigns SET status = ? WHERE id = ?",
    [status, id]
  );
};

export const getCampaignUserId = async (
  campaignId: number
) => {
  const [rows] = await pool.execute(
    `SELECT user_id
     FROM campaigns
     WHERE id = ?`,
    [campaignId]
  );

  const result = rows as { user_id: number }[];

  return result.length ? result[0].user_id : null;
};