import { Router } from "express";
import authenticateJWT from "../middlewares/jwtAuth";

import {
  getAll,
  getById,
  create,
  update,
  deleteAction,
  run,
} from "../controllers/actionController";

const router = Router();

router.get("/", authenticateJWT, getAll);

router.get("/:id", authenticateJWT, getById);

router.post("/", authenticateJWT, create);

router.put("/:id", authenticateJWT, update);

router.delete("/:id", authenticateJWT, deleteAction);

router.post("/:id/run", authenticateJWT, run);

export default router;
