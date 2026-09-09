import { Router } from "express";
import {
  addScheduledEmail,
  addBulkScheduledEmails,
  listScheduledEmails,
  listSentEmails
} from "../controllers/email.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/scheduled", authenticate, listScheduledEmails);

router.get("/sent", authenticate, listSentEmails);

router.post("/:id/emails", authenticate, addScheduledEmail);

router.post(
  "/:id/emails/bulk",
  authenticate,
  addBulkScheduledEmails
);

export default router;