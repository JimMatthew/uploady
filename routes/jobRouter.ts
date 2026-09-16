import { Router } from "express";
import authenticateJWT from "../middlewares/jwtAuth";
import { get_transfer_progress } from "../controllers/progressController";

import {
  list_jobs_get,
  get_job_get,
  retry_job_post,
  delete_job_delete,
  clear_completed_delete,
  get_job_items_chunk,
} from "../controllers/jobs/transferJob";

const router = Router();

router.get("/api/jobs", list_jobs_get);

router.get("/api/jobs/:jobId", authenticateJWT, get_job_get);

router.post("/api/jobs/:jobId/retry", authenticateJWT, retry_job_post);

router.delete("/api/jobs/:jobId", authenticateJWT, delete_job_delete);

router.delete("/api/jobs", authenticateJWT, clear_completed_delete);

router.get("/api/progress/:transferId", get_transfer_progress);

router.get("/api/jobs/:jobId/items", authenticateJWT, get_job_items_chunk);

export default router;
