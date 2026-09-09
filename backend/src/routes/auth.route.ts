import { Router } from "express";
import {
  googleLogin,
  googleCallback,
  getCurrentUser
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", authenticate, getCurrentUser);

export default router;