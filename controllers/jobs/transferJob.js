const TransferJob = require("../../models/transferJobs");
const TransferItem = require("../../models/TransferItem");
const SftpServer = require("../../models/SftpServer");
const executor = require("../../services/transferExecutor");
const { JobStatus, ItemStatus } = require("./jobConstants");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves server IDs to hostnames for display.
 * Returns a map of serverId → host, plus "local" for null.
 */
const resolveServerNames = async (serverIds) => {
  const ids = [...serverIds].filter(Boolean);
  if (!ids.length) return {};
  const servers = await SftpServer.find({ _id: { $in: ids } }).select(
    "_id host",
  );
  return Object.fromEntries(servers.map((s) => [s._id.toString(), s.host]));
};

const formatServer = (serverId, nameMap) => {
  if (!serverId) return "local";
  return nameMap[serverId] ?? serverId;
};

// ─── List Jobs ────────────────────────────────────────────────────────────────

/**
 * GET /api/jobs
 * Returns all jobs sorted newest first with server names resolved.
 */
const list_jobs_get = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const jobs = await TransferJob.find().sort({ createdAt: -1 }).lean();

    // collect all unique server IDs across jobs
    const serverIds = new Set();
    for (const job of jobs) {
      if (job.destServerId) serverIds.add(job.destServerId);
    }

    // also get source server IDs from items for display
    const jobIds = jobs.map((j) => j._id);
    const sourceServers = await TransferItem.distinct("sourceServerId", {
      jobId: { $in: jobIds },
      sourceServerId: { $ne: null },
    });
    for (const id of sourceServers) serverIds.add(id);

    const nameMap = await resolveServerNames(serverIds);
    const sourceByJob = await TransferItem.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id: "$jobId",
          sourceServerIds: { $addToSet: "$sourceServerId" },
        },
      },
    ]);

    const sourceMap = Object.fromEntries(
      sourceByJob.map((r) => [r._id.toString(), r.sourceServerIds]),
    );
    // overlay live state for running jobs
    const result = jobs.map((job) => {
      const liveJob = executor.getJob(job._id.toString());
      const sourceIds = sourceMap[job._id.toString()] ?? [];
      const sourceServers = [
        ...new Set(sourceIds.map((id) => (id ? (nameMap[id] ?? id) : "local"))),
      ];
      const durationMs =
        job.startedAt && job.finishedAt
          ? new Date(job.finishedAt) - new Date(job.startedAt)
          : null;
      return {
        ...job,
        completedFiles: liveJob?.completedFiles ?? job.completedFiles,
        failedFiles: liveJob?.failedFiles ?? job.failedFiles,
        currentFile: liveJob?.currentFile ?? job.currentFile,
        destServer: formatServer(job.destServerId, nameMap),
        sourceServers,
        durationMs,
      };
    });

    res.json({ jobs: result, nameMap });
  } catch (err) {
    console.error("List jobs error:", err);
    res.status(500).json({ error: "Failed to list jobs" });
  }
};

// ─── Job Detail ───────────────────────────────────────────────────────────────

/**
 * GET /api/jobs/:jobId
 * Returns a job with all its items, failed first.
 */
const get_job_get = async (req, res) => {
  try {
    const { jobId } = req.params;

    const [job, items] = await Promise.all([
      TransferJob.findById(jobId).lean(),
      TransferItem.find({ jobId }).sort({ status: 1 }).lean(),
    ]);

    if (!job) return res.status(404).json({ error: "Job not found" });

    // collect server IDs
    const serverIds = new Set();
    if (job.destServerId) serverIds.add(job.destServerId);
    for (const item of items) {
      if (item.sourceServerId) serverIds.add(item.sourceServerId);
    }
    const nameMap = await resolveServerNames(serverIds);

    // overlay live state if job is active
    const liveJob = executor.getJob(jobId);
    const liveItems = liveJob?.items;

    const formattedItems = items.map((item) => {
      const live = liveItems?.get(item._id.toString());
      const durationMs =
        item.startedAt && item.completedAt
          ? new Date(item.completedAt) - new Date(item.startedAt)
          : null;
      const speedMBs =
        durationMs && item.size
          ? (item.size / 1024 / 1024 / (durationMs / 1000)).toFixed(2)
          : null;

      return {
        ...item,
        percent:
          live?.percent ?? (item.status === ItemStatus.COMPLETED ? 100 : 0),
        durationMs,
        speedMBs,
        sourceServer: formatServer(item.sourceServerId, nameMap),
      };
    });

    // sort — failed first, then in_progress, then completed
    const order = {
      [ItemStatus.FAILED]: 0,
      [ItemStatus.IN_PROGRESS]: 1,
      [ItemStatus.PENDING]: 2,
      [ItemStatus.COMPLETED]: 3,
      [ItemStatus.SKIPPED]: 4,
    };
    formattedItems.sort(
      (a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5),
    );

    const durationMs =
      job.startedAt && job.finishedAt
        ? new Date(job.finishedAt) - new Date(job.startedAt)
        : null;

    res.json({
      job: {
        ...job,
        durationMs,
        destServer: formatServer(job.destServerId, nameMap),
      },
      items: formattedItems,
    });
  } catch (err) {
    console.error("Get job error:", err);
    res.status(500).json({ error: "Failed to get job" });
  }
};

// ─── Retry Failed ─────────────────────────────────────────────────────────────

/**
 * POST /api/jobs/:jobId/retry
 * Creates a new job with the failed items from this one.
 */
const retry_job_post = async (req, res) => {
  try {
    const { jobId } = req.params;

    const [originalJob, failedItems] = await Promise.all([
      TransferJob.findById(jobId).lean(),
      TransferItem.find({ jobId, status: ItemStatus.FAILED }).lean(),
    ]);

    if (!originalJob) return res.status(404).json({ error: "Job not found" });
    if (!failedItems.length)
      return res.status(400).json({ error: "No failed items to retry" });

    const newJob = await TransferJob.create({
      destServerId: originalJob.destServerId,
      destPath: originalJob.destPath,
      totalFiles: failedItems.length,
    });

    await TransferItem.insertMany(
      failedItems.map((item) => ({
        jobId: newJob._id,
        sourceServerId: item.sourceServerId,
        filename: item.filename,
        rootItem: item.rootItem,
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
        kind: item.kind,
        size: item.size,
      })),
    );

    executor.enqueue(newJob._id);

    res.status(201).json({ jobId: newJob._id });
  } catch (err) {
    console.error("Retry job error:", err);
    res.status(500).json({ error: "Failed to retry job" });
  }
};

// ─── Delete Job ───────────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs/:jobId
 * Removes a job and all its items.
 */
const delete_job_delete = async (req, res) => {
  try {
    const { jobId } = req.params;

    // don't delete running jobs
    const job = await TransferJob.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (
      job.status === JobStatus.RUNNING ||
      job.status === JobStatus.EXPANDING
    ) {
      return res.status(400).json({ error: "Cannot delete a running job" });
    }

    await Promise.all([
      TransferJob.findByIdAndDelete(jobId),
      TransferItem.deleteMany({ jobId }),
    ]);

    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ error: "Failed to delete job" });
  }
};

// ─── Clear Completed ──────────────────────────────────────────────────────────

/**
 * DELETE /api/jobs
 * Removes all completed jobs and their items.
 */
const clear_completed_delete = async (req, res) => {
  try {
    const completed = await TransferJob.find({
      status: JobStatus.COMPLETED,
    })
      .select("_id")
      .lean();

    const ids = completed.map((j) => j._id);

    await Promise.all([
      TransferJob.deleteMany({ _id: { $in: ids } }),
      TransferItem.deleteMany({ jobId: { $in: ids } }),
    ]);

    res.json({ deleted: ids.length });
  } catch (err) {
    console.error("Clear completed error:", err);
    res.status(500).json({ error: "Failed to clear completed jobs" });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  list_jobs_get,
  get_job_get,
  retry_job_post,
  delete_job_delete,
  clear_completed_delete,
};
