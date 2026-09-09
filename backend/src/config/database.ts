import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.DB_HOST || process.env.MYSQLHOST;
const user = process.env.DB_USER || process.env.MYSQLUSER;
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
const database = process.env.DB_NAME || process.env.MYSQLDATABASE;

if (!host || !user || !database) {
  throw new Error("MySQL environment variables are missing");
}

const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;