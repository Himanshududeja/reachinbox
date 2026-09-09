import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { getAllSenders } from "../models/sender.model";
import { getSenderQueue } from "../queues/email.queue";

export const setupBullBoard = async () => {
  const adapter = new ExpressAdapter();

  adapter.setBasePath("/admin/queues");

  const senders = await getAllSenders();

  const queueAdapters = senders.map(sender => {
    const queue = getSenderQueue(sender.id);
    return new BullMQAdapter(queue);
  });

  createBullBoard({
    queues: queueAdapters,
    serverAdapter: adapter
  });

  return adapter;
};