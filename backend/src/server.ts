import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database";
import redis from "./config/redis";
import { startSenderWorker } from "./queues/email.worker";
import { getAllSenders } from "./models/sender.model";
import campaignRoute from "./routes/campaign.route";
import emailRoute from "./routes/email.route";
import { recoverEmails } from "./services/recovery.service";
import {
  connectElasticsearch,
  createEmailIndex
} from "./services/elasticsearch.service";
import searchRoute from "./routes/search.route";
import { setupBullBoard } from "./config/bull-board";
import slackRoute from "./routes/slack.route";
import authRoute from "./routes/auth.route";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    message: "ReachInbox API is running"
  });
});

app.use("/api/auth", authRoute);
app.use("/api/campaigns", emailRoute);
app.use("/api/campaigns", campaignRoute);
app.use("/api/emails/search", searchRoute);
app.use("/api/slack", slackRoute);

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");

    console.log(`Server running on port ${PORT}`);
    console.log("MySQL connected");

    await redis.ping();

    console.log("Redis connected");

    await connectElasticsearch();
    await createEmailIndex();

    const bullBoard = await setupBullBoard();

    app.use("/admin/queues", bullBoard.getRouter());

    const senders = await getAllSenders();

    for (const sender of senders) {
      startSenderWorker(sender.id);
    }

    console.log(
      `Started ${senders.length} sender workers`
    );

    await recoverEmails();
  } catch (error) {
    console.error(
      "Database or Redis connection failed:",
      error
    );
  }
});