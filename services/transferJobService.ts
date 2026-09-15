import { transferJobs, transferItems, servers } from "../db";
import executor = require("./transferExecutor");
import { JobStatus, ItemStatus } from "../controllers/jobs/jobConstants";
import type { ItemStatus as ItemStatusType } from "../controllers/jobs/jobConstants";

import type {
  TransferItemPageOptions,
  TransferSourceType,
} from "../db/stores/transferItemStore";

type ServerNameMap = Record<string, string>;

export interface JobItemsChunkOptions {
  page?: number;
  limit?: number;
  status?: TransferItemPageOptions["status"];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RetryJobResult =
  | {
      status: "not_found";
    }
  | {
      status: "no_failed_items";
    }
  | {
      status: "created";
      jobId: string;
    };

export type DeleteJobResult =
  | {
      status: "not_found";
    }
  | {
      status: "running";
    }
  | {
      status: "deleted";
    };

export interface ClearCompletedJobsResult {
  deleted: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a collection of server IDs into display-friendly hostnames.
 *
 * Invalid/falsy IDs are ignored. If no valid server IDs are supplied,
 * an empty object is returned without querying the server store.
 *
 * Server IDs that cannot be resolved are not included in the returned map.
 * Callers may fall back to displaying the original server ID.
 */
async function resolveServerNames(
  serverIds: Set<string> | string[],
): Promise<ServerNameMap> {
  const ids = [...serverIds].filter(Boolean);

  if (ids.length === 0) {
    return {};
  }

  const serverList = await servers.findSummariesByIds(ids);

  return Object.fromEntries(
    serverList.map((server) => [server._id, server.host]),
  );
}

/**
 * Converts a server ID into a human-readable display value.
 *
 * A null/falsy server ID represents the local filesystem and is returned
 * as "local". Remote server IDs are resolved through the supplied name map.
 * If no hostname is available, the original server ID is returned as a
 * fallback.
 */
function formatServer(
  serverId: string | null | undefined,
  nameMap: ServerNameMap,
): string {
  if (!serverId) {
    return "local";
  }

  return nameMap[serverId] ?? serverId;
}

/**
 * Converts a transfer source into a human-readable display value.
 */
function formatSource(
  sourceType: TransferSourceType,
  serverId: string | null | undefined,
  nameMap: ServerNameMap,
): string {
  if (sourceType === "archive") {
    return "archive";
  }

  if (sourceType === "sftp" && serverId) {
    return nameMap[serverId] ?? serverId;
  }

  return "local";
}

// ---------------------------------------------------------------------------
// Job List
// ---------------------------------------------------------------------------

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
 * that may change while a transfer is running.
 */
export async function listJobs() {
  const jobs = await transferJobs.listNewest();

  const serverIds = new Set<string>();

  // Collect destination servers directly from the jobs.
  for (const job of jobs) {
    if (job.destServerId) {
      serverIds.add(job.destServerId);
    }
  }

  const jobIds = jobs.map((job) => job._id);

  // Source servers belong to individual transfer items, so retrieve the
  // distinct source server IDs associated with each job.
  const sourceMap = await transferItems.getSourcesByJobIds(jobIds);

  for (const sources of Object.values(sourceMap)) {
    for (const source of sources) {
      if (source?.sourceServerId) {
        serverIds.add(source.sourceServerId);
      }
    }
  }

  const nameMap = await resolveServerNames(serverIds);

  const result = jobs.map((job) => {
    const jobId = job._id;

    // The executor contains more current information for actively running
    // jobs than the persistent job record.
    const liveJob = executor.getJob(jobId);

    const sources = sourceMap[jobId] ?? [];

    const sourceServers = [
      ...new Set(
        sources.map((source) => {
          if (!source) {
            return "local";
          }

          return formatSource(
            source.sourceType,
            source.sourceServerId,
            nameMap,
          );
        }),
      ),
    ];

    const durationMs =
      job.startedAt && job.finishedAt
        ? job.finishedAt.getTime() - job.startedAt.getTime()
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
}

// ---------------------------------------------------------------------------
// Paginated Job Items
// ---------------------------------------------------------------------------

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
 */
export async function getJobItemsChunk(
  jobId: string,
  { page = 1, limit = 100, status }: JobItemsChunkOptions = {},
) {
  const { items, total } = await transferItems.findPageByJobId(jobId, {
    status,
    page,
    limit,
  });

  const serverIds = new Set<string>();

  for (const item of items) {
    if (item.sourceServerId) {
      serverIds.add(item.sourceServerId);
    }
  }

  const nameMap = await resolveServerNames(serverIds);

  const liveJob = executor.getJob(jobId);

  const liveItems = liveJob?.items;

  const formattedItems = items.map((item) => {
    const live = liveItems?.get(item._id);

    const durationMs =
      item.startedAt && item.completedAt
        ? item.completedAt.getTime() - item.startedAt.getTime()
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

      sourceServer: formatSource(item.sourceType, item.sourceServerId, nameMap),
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
}

// ---------------------------------------------------------------------------
// Job Detail
// ---------------------------------------------------------------------------

/**
 * Retrieves the complete detail view for a single transfer job.
 *
 * The job and all of its transfer items are loaded concurrently. Server IDs
 * referenced by the job and its items are resolved into hostnames, and live
 * executor state is merged into the persisted item data where available.
 *
 * Items are sorted by operational importance:
 *
 * FAILED
 * IN_PROGRESS
 * PENDING
 * COMPLETED
 * SKIPPED
 */
export async function getJob(jobId: string) {
  const [job, items] = await Promise.all([
    transferJobs.findById(jobId),
    transferItems.findByJobId(jobId),
  ]);

  if (!job) {
    return null;
  }

  const serverIds = new Set<string>();

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
    const live = liveItems?.get(item._id);

    const durationMs =
      item.startedAt && item.completedAt
        ? item.completedAt.getTime() - item.startedAt.getTime()
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
      sourceServer: formatSource(item.sourceType, item.sourceServerId, nameMap),
    };
  });

  const order: Partial<Record<ItemStatusType, number>> = {
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
      ? job.finishedAt.getTime() - job.startedAt.getTime()
      : null;

  return {
    job: {
      ...job,
      durationMs,
      destServer: formatServer(job.destServerId, nameMap),
    },

    items: formattedItems,
  };
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

/**
 * Creates and enqueues a new transfer job containing only the failed items
 * from a previous job.
 */
export async function retryJob(jobId: string): Promise<RetryJobResult> {
  const [originalJob, failedItems] = await Promise.all([
    transferJobs.findById(jobId),

    transferItems.findFailedByJobId(jobId),
  ]);

  if (!originalJob) {
    return {
      status: "not_found",
    };
  }

  if (failedItems.length === 0) {
    return {
      status: "no_failed_items",
    };
  }

  const newJob = await transferJobs.create({
    destServerId: originalJob.destServerId,

    destPath: originalJob.destPath,
  });

  await transferItems.createMany(
    failedItems.map((item) => ({
      jobId: newJob._id,
      sourceType: item.sourceType,
      sourceServerId: item.sourceServerId,
      archivePath: item.archivePath,
      filename: item.filename,
      rootItem: item.rootItem,
      sourcePath: item.sourcePath,
      destinationPath: item.destinationPath,
      kind: item.kind,
      size: item.size,
    })),
  );

  const newJobId = newJob._id;

  executor.enqueue(newJobId);

  return {
    status: "created",
    jobId: newJobId,
  };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Deletes a transfer job and all transfer items belonging to it.
 *
 * Active jobs cannot be deleted.
 */
export async function deleteJob(jobId: string): Promise<DeleteJobResult> {
  const job = await transferJobs.findById(jobId);

  if (!job) {
    return {
      status: "not_found",
    };
  }

  if (job.status === JobStatus.RUNNING || job.status === JobStatus.PLANNING) {
    return {
      status: "running",
    };
  }

  await Promise.all([
    transferJobs.deleteById(jobId),
    transferItems.deleteByJobId(jobId),
  ]);

  return {
    status: "deleted",
  };
}

// ---------------------------------------------------------------------------
// Clear Completed
// ---------------------------------------------------------------------------

/**
 * Deletes all transfer jobs that have reached COMPLETED status along with
 * all transfer items belonging to those jobs.
 */
export async function clearCompletedJobs(): Promise<ClearCompletedJobsResult> {
  const ids = await transferJobs.findCompletedIds();

  if (ids.length === 0) {
    return {
      deleted: 0,
    };
  }

  await Promise.all([
    transferJobs.deleteByIds(ids),
    transferItems.deleteByJobIds(ids),
  ]);

  return {
    deleted: ids.length,
  };
}
