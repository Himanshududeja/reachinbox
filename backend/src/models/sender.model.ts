import pool from "../config/database";

export interface Sender {
  id: number;
  name: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
}

export const getSenderById = async (id: number) => {
  const [rows] = await pool.execute(
    "SELECT * FROM senders WHERE id = ?",
    [id]
  );

  return rows as Sender[];
};

export const getAllSenders = async () => {
  const [rows] = await pool.execute(
    "SELECT * FROM senders ORDER BY id"
  );

  return rows as Sender[];
};