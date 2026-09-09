import dotenv from "dotenv";
import { Queue } from "bullmq";
import redis from "../src/config/redis";

dotenv.config();

const queue = new Queue("email-queue-sender-1", {
  connection: redis
});

const main = async () => {
  await queue.obliterate({ force: true });

  console.log("Sender 1 queue cleaned");

  await queue.close();
  await redis.quit();
};

main().catch(async error => {
  console.error(error);

  try {
    await queue.close();
  } catch {}

  try {
    await redis.quit();
  } catch {}

  process.exit(1);
});