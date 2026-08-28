const transferJobService = require("../../services/transferJobService");

// ─── List Jobs ────────────────────────────────────────────────────────────────

/**
 * GET /api/jobs
 * Returns all jobs sorted newest first with server names resolved.
 */
const list_jobs_get = async (req, res) => {
  try {
    const result = await transferJobService.listJobs();

    res.json(result);
  } catch (err) {
    console.error("List jobs error:", err);

    res.status(500).json({
      error: "Failed to list jobs",
    });
  }
};

// ─── Job Detail ───────────────────────────────────────────────────────────────
const get_job_items_chunk = async (req, res) => {
  try {
    const { jobId } = req.params;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "100", 10), 1),
      500,
    );

    const status = req.query.status;

    const result = await transferJobService.getJobItemsChunk(jobId, {
      page,
      limit,
      status,
    });

    res.json(result);
  } catch (err) {
    console.error("Get job items chunk error:", err);

    res.status(500).json({
      error: "Failed to get job items",
    });
  }
};

/**
 * GET /api/jobs/:jobId
 * Returns a job with all its items, failed first.
 */
const get_job_get = async (req, res) => {
  try {
    const result = await transferJobService.getJob(req.params.jobId);

    if (!result) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Get job error:", err);

    res.status(500).json({
      error: "Failed to get job",
    });
  }
};

// ─── Retry Failed ─────────────────────────────────────────────────────────────

/**
 * POST /api/jobs/:jobId/retry
 * Creates a new job with the failed items from this one.
 */
const retry_job_post = async (req, res) => {
  try {
    const result = await transferJobService.retryJob(req.params.jobId);

    if (result.status === "not_found") {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (result.status === "no_failed_items") {
      return res.status(400).json({
        error: "No failed items to retry",
      });
    }

    res.status(201).json({
      jobId: result.jobId,
    });
  } catch (err) {
    console.error("Retry job error:", err);

    res.status(500).json({
      error: "Failed to retry job",
    });
  }
};

// ─── Delete Job ───────────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs/:jobId
 * Removes a job and all its items.
 */
const delete_job_delete = async (req, res) => {
  try {
    const result = await transferJobService.deleteJob(req.params.jobId);

    if (result.status === "not_found") {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (result.status === "running") {
      return res.status(400).json({
        error: "Cannot delete a running job",
      });
    }

    res.json({
      message: "Job deleted",
    });
  } catch (err) {
    console.error("Delete job error:", err);

    res.status(500).json({
      error: "Failed to delete job",
    });
  }
};

// ─── Clear Completed ──────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs
 * Removes all completed jobs and their items.
 */
const clear_completed_delete = async (req, res) => {
  try {
    const result = await transferJobService.clearCompletedJobs();

    res.json(result);
  } catch (err) {
    console.error("Clear completed error:", err);

    res.status(500).json({
      error: "Failed to clear completed jobs",
    });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  list_jobs_get,
  get_job_get,
  retry_job_post,
  delete_job_delete,
  clear_completed_delete,
  get_job_items_chunk,
};
