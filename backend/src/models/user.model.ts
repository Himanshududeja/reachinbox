import pool from "../config/database";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

export const createUser = async (name: string, email: string) => {
  const [result]: any = await pool.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email]
  );

  return result.insertId;
};

export const getUserById = async (id: number) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  return rows;
};

export const getUserByEmail = async (email: string) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows as User[];
};