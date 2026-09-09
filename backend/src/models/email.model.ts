import pool from "../config/database";

export const createEmail = async (
  campaignId: number,
  senderId: number,
  recipient: string,
  subject: string,
  body: string,
  scheduledAt: Date,
  idempotencyKey: string
) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      "SELECT id FROM senders WHERE id = ? FOR UPDATE",
      [senderId]
    );

    const [sequenceRows]: any = await connection.execute(
      `SELECT COALESCE(MAX(sender_sequence), 0) + 1 AS next_sequence
       FROM emails
       WHERE sender_id = ?`,
      [senderId]
    );

    const senderSequence =
      Number(sequenceRows[0].next_sequence);

    const [result]: any = await connection.execute(
      `INSERT INTO emails
      (
        campaign_id,
        sender_id,
        recipient,
        subject,
        body,
        scheduled_at,
        idempotency_key,
        sender_sequence
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        campaignId,
        senderId,
        recipient,
        subject,
        body,
        scheduledAt,
        idempotencyKey,
        senderSequence
      ]
    );

    await connection.commit();

    return {
      insertId: result.insertId,
      senderSequence
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPendingCountBefore = async (
  senderId: number,
  senderSequence: number
) => {
  const [rows]: any = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM emails
     WHERE sender_id = ?
     AND sender_sequence < ?
     AND status IN ('pending', 'processing')`,
    [senderId, senderSequence]
  );

  return Number(rows[0].count);
};

export const getEmailById = async (id: number) => {
  const [rows] = await pool.execute(
    "SELECT * FROM emails WHERE id = ?",
    [id]
  );

  return rows;
};

export const markEmailProcessing = async (id: number) => {
  const [result]: any = await pool.execute(
    `UPDATE emails
     SET status = 'processing',
         attempts = attempts + 1,
         processing_started_at = NOW(),
         last_attempt_at = NOW()
     WHERE id = ?
     AND status = 'pending'`,
    [id]
  );

  return result.affectedRows === 1;
};

export const markEmailSent = async (id: number) => {
  await pool.execute(
    `UPDATE emails
     SET status = 'sent',
         sent_at = NOW(),
         processing_started_at = NULL
     WHERE id = ?
     AND status = 'processing'`,
    [id]
  );
};

export const markEmailFailed = async (
  id: number,
  errorMessage: string
) => {
  await pool.execute(
    `UPDATE emails
     SET status = 'failed',
         error_message = ?,
         processing_started_at = NULL
     WHERE id = ?
     AND status = 'processing'`,
    [errorMessage, id]
  );
};

export const markEmailPending = async (id: number) => {
  await pool.execute(
    `UPDATE emails
     SET status = 'pending',
         processing_started_at = NULL
     WHERE id = ?
     AND status = 'processing'`,
    [id]
  );
};

export const getEmailByIdempotencyKey = async (
  idempotencyKey: string
) => {
  const [rows] = await pool.execute(
    `SELECT * FROM emails
     WHERE idempotency_key = ?`,
    [idempotencyKey]
  );

  return rows;
};

export const recoverStaleEmails = async () => {
  const [result]: any = await pool.execute(
    `UPDATE emails
     SET status = 'pending',
         processing_started_at = NULL
     WHERE status = 'processing'
     AND processing_started_at IS NOT NULL
     AND processing_started_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
  );

  return result.affectedRows;
};

export const getPendingEmails = async () => {
  const [rows] = await pool.execute(
    `SELECT id, campaign_id, sender_id, scheduled_at, sender_sequence
FROM emails
     WHERE status = 'pending'
     AND sender_id IS NOT NULL
     ORDER BY sender_id, scheduled_at ASC, sender_sequence ASC, id ASC`
  );

  return rows as {
  id: number;
  campaign_id: number;
  sender_id: number;
  scheduled_at: Date;
  sender_sequence: number;
}[];
};

export const getEarlierPendingEmail = async (
  senderId: number,
  senderSequence: number
) => {
  const [rows] = await pool.execute(
    `SELECT id
     FROM emails
     WHERE sender_id = ?
     AND sender_sequence < ?
     AND status IN ('pending', 'processing')
     ORDER BY sender_sequence ASC
     LIMIT 1`,
    [senderId, senderSequence]
  );

  return rows as { id: number }[];
};

export const getScheduledEmails = async (userId: number) => {
  const [rows] = await pool.execute(
    `SELECT
      e.id,
      e.recipient,
      e.subject,
      e.body,
      e.scheduled_at,
      e.status,
      s.email AS sender_email
     FROM emails e
     JOIN campaigns c ON e.campaign_id = c.id
     LEFT JOIN senders s ON e.sender_id = s.id
     WHERE e.status = 'pending'
     AND c.user_id = ?
     ORDER BY e.scheduled_at ASC`,
    [userId]
  );

  return rows;
};

export const getSentEmails = async (userId: number) => {
  const [rows] = await pool.execute(
    `SELECT
      e.id,
      e.recipient,
      e.subject,
      e.body,
      e.scheduled_at,
      e.sent_at,
      e.status,
      s.email AS sender_email
     FROM emails e
     JOIN campaigns c ON e.campaign_id = c.id
     LEFT JOIN senders s ON e.sender_id = s.id
     WHERE e.status = 'sent'
     AND c.user_id = ?
     ORDER BY e.sent_at DESC`,
    [userId]
  );

  return rows;
};
