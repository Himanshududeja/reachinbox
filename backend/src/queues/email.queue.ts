import { Queue } from "bullmq";
import redis from "../config/redis";

const queues = new Map<number, Queue>();

export const getSenderQueue = (senderId: number) => {
  let queue = queues.get(senderId);

  if (!queue) {
    queue = new Queue(`email-queue-sender-${senderId}`, {
      connection: redis
    });

    queues.set(senderId, queue);
  }

  return queue;
};