import { Router } from "express";
import { searchEmailController } from "../controllers/email-search.controller";

const router = Router();

router.get("/", searchEmailController);

export default router;