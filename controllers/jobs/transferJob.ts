import type { Request, Response } from "express";

import {
  clearCompletedJobs,
  deleteJob,
  getJob,
  getJobItemsChunk,
  listJobs,
  retryJob,
} from "../../services/transferJobService";

import type { TransferItemPageOptions } from "../../db/stores/transferItemStore";

// ─── Query Parsing ────────────────────────────────────────────────────────────

function parsePositiveInteger(
  value: unknown,
  defaultValue: number,
  max?: number,
): number {
  if (typeof value !== "string") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const positive = Math.max(parsed, 1);

  return max !== undefined ? Math.min(positive, max) : positive;
}

function parseStatus(value: unknown): TransferItemPageOptions["status"] {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }

  throw new Error("Invalid job item status");
}

// ─── List Jobs ────────────────────────────────────────────────────────────────

/**
 * GET /api/jobs
 * Returns all jobs sorted newest first with server names resolved.
 */
export async function list_jobs_get(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await listJobs();

    res.json(result);
  } catch (error) {
    console.error("List jobs error:", error);

    res.status(500).json({
      error: "Failed to list jobs",
    });
  }
}

// ─── Job Detail ───────────────────────────────────────────────────────────────

export async function get_job_items_chunk(
  req: Request,
  res: Response,
): Promise<void> {
  const { jobId } = req.params;

  if (typeof jobId !== "string" || !jobId) {
    res.status(400).json({
      error: "Invalid job ID",
    });
    return;
  }

  let status: TransferItemPageOptions["status"];

  try {
    status = parseStatus(req.query.status);
  } catch {
    res.status(400).json({
      error: "Invalid job item status",
    });
    return;
  }

  const page = parsePositiveInteger(req.query.page, 1);

  const limit = parsePositiveInteger(req.query.limit, 100, 500);

  try {
    const result = await getJobItemsChunk(jobId, {
      page,
      limit,
      status,
    });

    res.json(result);
  } catch (error) {
    console.error("Get job items chunk error:", error);

    res.status(500).json({
      error: "Failed to get job items",
    });
  }
}

/**
 * GET /api/jobs/:jobId
 * Returns a job with all its items, failed first.
 */
export async function get_job_get(req: Request, res: Response): Promise<void> {
  const { jobId } = req.params;

  if (typeof jobId !== "string" || !jobId) {
    res.status(400).json({
      error: "Invalid job ID",
    });
    return;
  }

  try {
    const result = await getJob(jobId);

    if (!result) {
      res.status(404).json({
        error: "Job not found",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error("Get job error:", error);

    res.status(500).json({
      error: "Failed to get job",
    });
  }
}

// ─── Retry Failed ─────────────────────────────────────────────────────────────

/**
 * POST /api/jobs/:jobId/retry
 * Creates a new job with the failed items from this one.
 */
export async function retry_job_post(
  req: Request,
  res: Response,
): Promise<void> {
  const { jobId } = req.params;

  if (typeof jobId !== "string" || !jobId) {
    res.status(400).json({
      error: "Invalid job ID",
    });
    return;
  }

  try {
    const result = await retryJob(jobId);

    if (result.status === "not_found") {
      res.status(404).json({
        error: "Job not found",
      });
      return;
    }

    if (result.status === "no_failed_items") {
      res.status(400).json({
        error: "No failed items to retry",
      });
      return;
    }

    res.status(201).json({
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Retry job error:", error);

    res.status(500).json({
      error: "Failed to retry job",
    });
  }
}

// ─── Delete Job ───────────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs/:jobId
 * Removes a job and all its items.
 */
export async function delete_job_delete(
  req: Request,
  res: Response,
): Promise<void> {
  const { jobId } = req.params;

  if (typeof jobId !== "string" || !jobId) {
    res.status(400).json({
      error: "Invalid job ID",
    });
    return;
  }

  try {
    const result = await deleteJob(jobId);

    if (result.status === "not_found") {
      res.status(404).json({
        error: "Job not found",
      });
      return;
    }

    if (result.status === "running") {
      res.status(400).json({
        error: "Cannot delete a running job",
      });
      return;
    }

    res.json({
      message: "Job deleted",
    });
  } catch (error) {
    console.error("Delete job error:", error);

    res.status(500).json({
      error: "Failed to delete job",
    });
  }
}

// ─── Clear Completed ──────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs
 * Removes all completed jobs and their items.
 */
export async function clear_completed_delete(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await clearCompletedJobs();

    res.json(result);
  } catch (error) {
    console.error("Clear completed error:", error);

    res.status(500).json({
      error: "Failed to clear completed jobs",
    });
  }
}
