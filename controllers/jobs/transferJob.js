const SftpServer = require("../../models/SftpServer");
const executor = require("../../services/transferExecutor");
const { JobStatus, ItemStatus } = require("./jobConstants");
const { transferJobs, transferItems, servers } = require("../../db");
// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves server IDs to hostnames for display.
 *
 * @param {Set<string>|string[]} serverIds
 * @returns {Promise<Object<string, string>>}
 */
const resolveServerNames = async (serverIds) => {
  const ids = [...serverIds].filter(Boolean);

  if (!ids.length) {
    return {};
  }

  const serverList = await servers.findSummariesByIds(ids);

  return Object.fromEntries(
    serverList.map((server) => [server._id.toString(), server.host]),
  );
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
    const jobs = await transferJobs.listNewest();

    const serverIds = new Set();

    for (const job of jobs) {
      if (job.destServerId) {
        serverIds.add(job.destServerId);
      }
    }

    const jobIds = jobs.map((job) => job._id.toString());

    const sourceMap = await transferItems.getSourceServerIdsByJobIds(jobIds);

    for (const sourceIds of Object.values(sourceMap)) {
      for (const id of sourceIds) {
        if (id) {
          serverIds.add(id);
        }
      }
    }

    const nameMap = await resolveServerNames(serverIds);

    const result = jobs.map((job) => {
      const jobId = job._id.toString();

      const liveJob = executor.getJob(jobId);

      const sourceIds = sourceMap[jobId] ?? [];

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

    res.json({
      jobs: result,
      nameMap,
    });
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

    const { items, total } = await transferItems.findPageByJobId(jobId, {
      status,
      page,
      limit,
    });

    const serverIds = new Set();

    for (const item of items) {
      if (item.sourceServerId) {
        serverIds.add(item.sourceServerId);
      }
    }

    const nameMap = await resolveServerNames(serverIds);

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

    res.json({
      items: formattedItems,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
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
    const { jobId } = req.params;

    const [job, items] = await Promise.all([
      transferJobs.findById(jobId),
      transferItems.findByJobId(jobId),
    ]);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    const serverIds = new Set();

    if (job.destServerId) {
      serverIds.add(job.destServerId);
    }

    for (const item of items) {
      if (item.sourceServerId) {
        serverIds.add(item.sourceServerId);
      }
    }

    const nameMap = await resolveServerNames(serverIds);

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
    const { jobId } = req.params;

    const [originalJob, failedItems] = await Promise.all([
      transferJobs.findById(jobId),
      transferItems.findFailedByJobId(jobId),
    ]);

    if (!originalJob) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (!failedItems.length) {
      return res.status(400).json({
        error: "No failed items to retry",
      });
    }

    const newJob = await transferJobs.create({
      destServerId: originalJob.destServerId,
      destPath: originalJob.destPath,
      totalFiles: failedItems.length,
    });

    await transferItems.createMany(
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

    executor.enqueue(newJob._id.toString());

    res.status(201).json({
      jobId: newJob._id,
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
    const { jobId } = req.params;

    const job = await transferJobs.findById(jobId);

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (
      job.status === JobStatus.RUNNING ||
      job.status === JobStatus.EXPANDING
    ) {
      return res.status(400).json({
        error: "Cannot delete a running job",
      });
    }

    await Promise.all([
      transferJobs.deleteById(jobId),
      transferItems.deleteByJobId(jobId),
    ]);

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
    const ids = await transferJobs.findCompletedIds();

    if (ids.length) {
      await Promise.all([
        transferJobs.deleteByIds(ids),
        transferItems.deleteByJobIds(ids),
      ]);
    }

    res.json({
      deleted: ids.length,
    });
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
