import { Queue } from "bullmq";
import redis from "../src/config/redis";

const main = async () => {
  const queue = new Queue("email-queue-sender-1", {
    connection: redis
  });

  const job = await queue.getJob("email-1074");

  if (!job) {
    console.log("Job not found");
  } else {
    console.log("Before:", await job.getState());
    await job.promote();
    console.log("After:", await job.getState());
  }

  await queue.close();
  await redis.quit();
};

main().catch(async error => {
  console.error(error);
  await redis.quit();
  process.exit(1);
});
