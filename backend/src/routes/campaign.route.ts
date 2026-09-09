import { Router } from "express";
import {
  addCampaign,
  getCampaign
} from "../controllers/campaign.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, addCampaign);

router.get("/:id", authenticate, getCampaign);

export default router;