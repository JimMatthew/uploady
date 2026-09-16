import { Router } from "express";

import authenticateJWT from "../middlewares/jwtAuth";

import {
  getSettings,
  updateSessionSettings,
} from "../controllers/settingsController";

const router = Router();

router.get("/", authenticateJWT, getSettings);

router.patch("/session", authenticateJWT, updateSessionSettings);

export default router;
