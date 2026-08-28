const express = require("express");
const authenticateJWT = require("../middlewares/jwtAuth");
const progressController = require("../controllers/progressController");
const transferJobController = require("../controllers/jobs/transferJob");
const router = express.Router();

router.get("/api/jobs", transferJobController.list_jobs_get);

router.get(
  "/api/jobs/:jobId",
  authenticateJWT,
  transferJobController.get_job_get,
);

router.post(
  "/api/jobs/:jobId/retry",
  authenticateJWT,
  transferJobController.retry_job_post,
);

router.delete(
  "/api/jobs/:jobId",
  authenticateJWT,
  transferJobController.delete_job_delete,
);

router.delete(
  "/api/jobs",
  authenticateJWT,
  transferJobController.clear_completed_delete,
);

router.get(
  "/api/progress/:transferId",
  progressController.get_transfer_progress,
);

router.get(
  "/api/jobs/:jobId/items",
  authenticateJWT,
  transferJobController.get_job_items_chunk,
);

module.exports = router;