import { Router } from "express";
import {
  startSlackOAuth,
  slackOAuthCallback,
  getSlackStatus,
  disconnectSlackController,
  testSlackNotification
} from "../controllers/slack.controller";

const router = Router();

router.get("/oauth", startSlackOAuth);
router.get("/oauth/callback", slackOAuthCallback);
router.get("/status", getSlackStatus);
router.delete("/disconnect", disconnectSlackController);
router.post("/test", testSlackNotification);

export default router;