import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const config: any = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
};

if (process.env.DB_SOCKET) {
  config.socketPath = process.env.DB_SOCKET;
}

const pool = mysql.createPool(config);

export default pool;