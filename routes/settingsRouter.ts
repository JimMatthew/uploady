import { Router } from "express";

import authenticateJWT from "../middlewares/jwtAuth";

import {
  certificate_info_get,
  getSettings,
  updateSessionSettings,
} from "../controllers/settingsController";

const router = Router();

router.get("/", authenticateJWT, getSettings);

router.patch("/session", authenticateJWT, updateSessionSettings);

router.get(
  "/certificate",
  certificate_info_get,
);
export default router;
