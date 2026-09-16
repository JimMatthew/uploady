import { Router } from "express";
import authenticateJWT from "../middlewares/jwtAuth";

import {
  listLocalArchive,
  getLocalArchiveEntry,
} from "../controllers/archiveController";

const router = Router();

router.get("/local", authenticateJWT, listLocalArchive);

router.get("/local/entry", authenticateJWT, getLocalArchiveEntry);

export default router;
