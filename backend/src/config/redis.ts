import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || process.env.REDISHOST,
  port: Number(process.env.REDIS_PORT || process.env.REDISPORT || 6379),
  username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
  password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
  maxRetriesPerRequest: null
});

export default redis;