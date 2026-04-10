import mysql from "mysql2/promise";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const obj = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(obj);

export const connectDB = async () => {
  try {
    logger.info("Connecting to MySQL database...");

    await pool.query("SELECT 1");

    logger.info(
      {
        host: process.env.DB_HOST,
      },
      "MySQL Pool Connected Successfully"
    );

  } catch (error) {
    logger.error(
      {
        err: error,
        host: process.env.DB_HOST
      },
      "Database Connection Failed"
    );

    process.exit(1);
  }
};

export default pool;