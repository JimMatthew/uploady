import { Router } from "express";

import {
  notes_get,
  note_get,
  note_create_post,
  note_update_post,
  note_delete,
} from "../controllers/noteController";

import authenticateJWT from "../middlewares/jwtAuth";

const router = Router();

router.get(
  "/",
  authenticateJWT,
  notes_get,
);

router.get(
  "/:id",
  authenticateJWT,
  note_get,
);

router.post(
  "/",
  authenticateJWT,
  note_create_post,
);

router.post(
  "/:id",
  authenticateJWT,
  note_update_post,
);

router.delete(
  "/:id",
  authenticateJWT,
  note_delete,
);

export default router;