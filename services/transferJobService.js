const { transferJobs, transferItems, servers } = require("../db");
const executor = require("./transferExecutor");
const { JobStatus, ItemStatus } = require("../controllers/jobs/jobConstants");

/**
 * Resolves a collection of server IDs into display-friendly hostnames.
 *
 * Invalid/falsy IDs are ignored. If no valid server IDs are supplied,
 * an empty object is returned without querying the server store.
 *
 * Server IDs that cannot be resolved are not included in the returned map.
 * Callers may fall back to displaying the original server ID.
 *
 * @param {Set<string>|string[]} serverIds
 *   Server IDs to resolve.
 *
 * @returns {Promise<Object<string, string>>}
 *   A map keyed by server ID whose values are server hostnames.
 *
 * @example
 * const names = await resolveServerNames(
 *   new Set(["server1", "server2"]),
 * );
 *
 * // {
 * //   server1: "nas.lan",
 * //   server2: "plx.lan"
 * // }
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

/**
 * Converts a server ID into a human-readable display value.
 *
 * A null/falsy server ID represents the local filesystem and is returned
 * as "local". Remote server IDs are resolved through the supplied name map.
 * If no hostname is available, the original server ID is returned as a
 * fallback.
 *
 * @param {string|null|undefined} serverId
 *   Server ID to format. A missing ID represents local storage.
 *
 * @param {Object<string, string>} nameMap
 *   Map of server IDs to resolved hostnames.
 *
 * @returns {string}
 *   "local", the resolved hostname, or the original server ID.
 */
const formatServer = (serverId, nameMap) => {
  if (!serverId) return "local";
  return nameMap[serverId] ?? serverId;
};

/**
 * Retrieves all transfer jobs for the jobs list view.
 *
 * Jobs are loaded from persistent storage in newest-first order. The
 * persisted job state is then enriched with:
 *
 * - resolved source server hostnames
 * - resolved destination server hostname
 * - current live executor state, when available
 * - calculated job duration
 *
 * Live executor values take precedence over persisted values for fields
 * that may change while a transfer is running. This allows the jobs view
 * to display current progress without persisting every progress update.
 *
 * Source server information is collected from the job's transfer items,
 * since a single job may contain items originating from multiple servers.
 *
 * @returns {Promise<{
 *   jobs: Object[],
 *   nameMap: Object<string, string>
 * }>}
 *   Jobs enriched for presentation along with the server ID-to-hostname map
 *   used while formatting them.
 */
const listJobs = async () => {
  const jobs = await transferJobs.listNewest();

  const serverIds = new Set();

  // Collect destination servers directly from the jobs.
  for (const job of jobs) {
    if (job.destServerId) {
      serverIds.add(job.destServerId);
    }
  }

  const jobIds = jobs.map((job) => job._id.toString());

  // Source servers belong to individual transfer items, so retrieve the
  // distinct source server IDs associated with each job.
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

    // The executor contains more current information for actively running
    // jobs than the persistent job record.
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

      // Prefer live values while the job exists in the executor.
      completedFiles: liveJob?.completedFiles ?? job.completedFiles,
      failedFiles: liveJob?.failedFiles ?? job.failedFiles,
      currentFile: liveJob?.currentFile ?? job.currentFile,

      destServer: formatServer(job.destServerId, nameMap),
      sourceServers,
      durationMs,
    };
  });

  return {
    jobs: result,
    nameMap,
  };
};

/**
 * Retrieves one paginated chunk of transfer items for a job.
 *
 * Items are loaded from persistent storage according to the requested page,
 * page size, and optional status filter. Each item is then enriched with:
 *
 * - live transfer percentage, when available
 * - calculated duration
 * - calculated average transfer speed
 * - resolved source server hostname
 *
 * Live progress from the executor takes precedence over persisted progress.
 * Completed items without live executor state are reported as 100%.
 *
 * @param {string} jobId
 *   ID of the transfer job whose items should be retrieved.
 *
 * @param {Object} options
 *   Pagination and filtering options.
 *
 * @param {number} [options.page=1]
 *   One-based page number.
 *
 * @param {number} [options.limit=100]
 *   Maximum number of items to return.
 *
 * @param {string} [options.status]
 *   Optional transfer-item status filter.
 *
 * @returns {Promise<{
 *   items: Object[],
 *   page: number,
 *   limit: number,
 *   total: number,
 *   totalPages: number,
 *   hasNextPage: boolean,
 *   hasPrevPage: boolean
 * }>}
 *   Paginated and presentation-ready transfer items.
 */
const getJobItemsChunk = async (jobId, { page = 1, limit = 100, status }) => {
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

  return {
    items: formattedItems,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
};

/**
 * Retrieves the complete detail view for a single transfer job.
 *
 * The job and all of its transfer items are loaded concurrently. Server IDs
 * referenced by the job and its items are resolved into hostnames, and live
 * executor state is merged into the persisted item data where available.
 *
 * Transfer items are enriched with progress, duration, average speed, and
 * source-server display information.
 *
 * Items are sorted by operational importance in the following order:
 *
 *   FAILED
 *   IN_PROGRESS
 *   PENDING
 *   COMPLETED
 *   SKIPPED
 *
 * Unknown statuses are placed after all known statuses.
 *
 * @param {string} jobId
 *   ID of the transfer job to retrieve.
 *
 * @returns {Promise<{
 *   job: Object,
 *   items: Object[]
 * }|null>}
 *   The presentation-ready job and its items, or null if the job does not
 *   exist.
 */
const getJob = async (jobId) => {
  const [job, items] = await Promise.all([
    transferJobs.findById(jobId),
    transferItems.findByJobId(jobId),
  ]);

  if (!job) {
    return null;
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

  return {
    job: {
      ...job,
      durationMs,
      destServer: formatServer(job.destServerId, nameMap),
    },
    items: formattedItems,
  };
};

/**
 * Creates and enqueues a new transfer job containing only the failed items
 * from a previous job.
 *
 * The original job's destination server and destination path are reused.
 * Each failed item is copied into a new transfer-item record so that the
 * retry is represented as an independent job rather than mutating the
 * original job.
 *
 * Once the new job and its items have been persisted, the job is submitted
 * to the transfer executor.
 *
 * @param {string} jobId
 *   ID of the original transfer job.
 *
 * @returns {Promise<
 *   {status: "not_found"} |
 *   {status: "no_failed_items"} |
 *   {status: "created", jobId: string}
 * >}
 *   Operation result:
 *
 *   - `not_found` if the original job does not exist.
 *   - `no_failed_items` if there is nothing to retry.
 *   - `created` with the new job ID when the retry job was created.
 */
const retryJob = async (jobId) => {
  const [originalJob, failedItems] = await Promise.all([
    transferJobs.findById(jobId),
    transferItems.findFailedByJobId(jobId),
  ]);

  if (!originalJob) {
    return { status: "not_found" };
  }

  if (!failedItems.length) {
    return { status: "no_failed_items" };
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

  const newJobId = newJob._id.toString();

  executor.enqueue(newJobId);

  return {
    status: "created",
    jobId: newJobId,
  };
};

/**
 * Deletes a transfer job and all transfer items belonging to it.
 *
 * Active jobs cannot be deleted. Jobs in RUNNING or EXPANDING state are
 * rejected so their persistent records are not removed while the executor
 * may still be using them.
 *
 * The job and its associated items are deleted concurrently once deletion
 * has been determined to be safe.
 *
 * @param {string} jobId
 *   ID of the transfer job to delete.
 *
 * @returns {Promise<
 *   {status: "not_found"} |
 *   {status: "running"} |
 *   {status: "deleted"}
 * >}
 *   Operation result:
 *
 *   - `not_found` if the job does not exist.
 *   - `running` if the job is currently RUNNING or EXPANDING.
 *   - `deleted` after the job and its items have been removed.
 */
const deleteJob = async (jobId) => {
  const job = await transferJobs.findById(jobId);

  if (!job) {
    return { status: "not_found" };
  }

  if (job.status === JobStatus.RUNNING || job.status === JobStatus.EXPANDING) {
    return { status: "running" };
  }

  await Promise.all([
    transferJobs.deleteById(jobId),
    transferItems.deleteByJobId(jobId),
  ]);

  return { status: "deleted" };
};

/**
 * Deletes all transfer jobs that have reached COMPLETED status along with
 * all transfer items belonging to those jobs.
 *
 * Completed job IDs are retrieved first and then used for bulk deletion of
 * both job and item records. If no completed jobs exist, no delete queries
 * are issued.
 *
 * @returns {Promise<{deleted: number}>}
 *   Number of completed jobs selected for deletion.
 */
const clearCompletedJobs = async () => {
  const ids = await transferJobs.findCompletedIds();

  if (!ids.length) {
    return { deleted: 0 };
  }

  await Promise.all([
    transferJobs.deleteByIds(ids),
    transferItems.deleteByJobIds(ids),
  ]);

  return {
    deleted: ids.length,
  };
};

module.exports = {
  listJobs,
  getJobItemsChunk,
  getJob,
  retryJob,
  deleteJob,
  clearCompletedJobs,
};
