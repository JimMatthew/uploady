import type SftpClient from "ssh2-sftp-client";

import { connectToSftp } from "./sftpConnection";
import { dispatch } from "./transferStrategies";

import type {
  InMemoryTransferItem,
  InMemoryTransferJob,
  TransferConnections,
  TransferContext,
  TransferExecutionCallbacks,
} from "../types/transferTypes";


interface OpenConnectionsResult {
  sftpSource: SftpClient | null;
  sftpDest: SftpClient | null;
}


const DEFAULT_TRANSFER_CALLBACKS: TransferExecutionCallbacks = {
  shouldStop: () => false,

  onFileStart: async () => {},

  onFileProgress: () => {},

  onFileDone: async () => {},

  onFileFail: async () => {},
};

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}
/**
 * Executes all concrete file items belonging to a transfer job.
 *
 * Items are grouped by source so each source server requires only one
 * connection at a time.
 */
export async function executeTransferJob(
  job: InMemoryTransferJob,
  callbacks: Partial<TransferExecutionCallbacks> = {},
): Promise<void> {
  const resolvedCallbacks: TransferExecutionCallbacks = {
    ...DEFAULT_TRANSFER_CALLBACKS,
    ...callbacks,
  };

  /**
   * Ephemeral state shared by every file in this job.
   *
   * Connections are opened and closed per source group, but this cache lives
   * for the entire job so a destination directory is ensured at most once.
   */
  const context: TransferContext = {
    destDirs: new Set<string>(),
  };

  const itemsBySource = groupItemsBySource(job.items);

  for (const [sourceServerId, items] of itemsBySource) {
    if (resolvedCallbacks.shouldStop()) {
      break;
    }

    await executeSourceGroup(
      sourceServerId,
      items,
      job.destServerId,
      resolvedCallbacks,
      context,
    );
  }
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Groups transfer items by source endpoint.
 *
 * Remote sources are keyed by server ID. null represents the local filesystem.
 */
function groupItemsBySource(
  itemsMap: Map<string, InMemoryTransferItem>,
): Map<string | null, InMemoryTransferItem[]> {
  const groups = new Map<string | null, InMemoryTransferItem[]>();

  for (const item of itemsMap.values()) {
    const key = item.sourceServerId;

    const existing = groups.get(key);

    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Source Group Execution
// ---------------------------------------------------------------------------

/**
 * Executes all files originating from one source endpoint.
 *
 * SFTP connections are scoped to this source group and reused for every item.
 */
async function executeSourceGroup(
  sourceServerId: string | null,
  items: InMemoryTransferItem[],
  destServerId: string | null,
  callbacks: TransferExecutionCallbacks,
  context: TransferContext,
): Promise<void> {
  const { shouldStop } = callbacks;

  const { sftpSource, sftpDest } = await openConnections(
    sourceServerId,
    destServerId,
  );

  try {
    for (const item of items) {
      if (shouldStop()) {
        break;
      }

      await executeItem(
        item,
        {
          sourceServerId,
          destServerId,
          sftpSource,
          sftpDest,
          context,
        },
        callbacks,
      );
    }
  } finally {
    await closeConnections(sftpSource, sftpDest);
  }
}

// ---------------------------------------------------------------------------
// Connection Management
// ---------------------------------------------------------------------------

/**
 * Opens the SFTP connections required for one source/destination pair.
 *
 * Local endpoints require no connection. When source and destination are the
 * same remote server, the source connection is reused for both sides.
 */
async function openConnections(
  sourceServerId: string | null,
  destServerId: string | null,
): Promise<OpenConnectionsResult> {
  const isLocalSource = sourceServerId === null;

  const isLocalDest = destServerId === null;

  const isSameServer =
    !isLocalSource && !isLocalDest && sourceServerId === destServerId;

  const sftpSource = isLocalSource ? null : await connectToSftp(sourceServerId);

  let sftpDest: SftpClient | null = null;

  if (isSameServer) {
    // Same-server copies use one connection for server-side rcopy.
    sftpDest = sftpSource;
  } else if (!isLocalDest) {
    try {
      sftpDest = await connectToSftp(destServerId);
    } catch (error) {
      // Do not leak the source connection if destination setup fails.
      try {
        await sftpSource?.end();
      } catch {
        // Preserve the destination connection error.
      }

      throw error;
    }
  }

  return {
    sftpSource,
    sftpDest,
  };
}

/**
 * Closes connections opened for a source group.
 *
 * Same-server transfers share one client between source and destination, so
 * the identity check prevents closing that connection twice.
 */
async function closeConnections(
  sftpSource: SftpClient | null,
  sftpDest: SftpClient | null,
): Promise<void> {
  await sftpSource?.end();

  if (sftpDest && sftpDest !== sftpSource) {
    await sftpDest.end();
  }
}

// ---------------------------------------------------------------------------
// Item Execution
// ---------------------------------------------------------------------------

/**
 * Executes one file and reports its lifecycle through the supplied callbacks.
 *
 * File-level transfer failures are reported through onFileFail rather than
 * propagated, allowing the remaining files in the job to continue.
 */
async function executeItem(
  item: InMemoryTransferItem,
  connections: TransferConnections,
  callbacks: TransferExecutionCallbacks,
): Promise<void> {
  const { onFileStart, onFileProgress, onFileDone, onFileFail } = callbacks;

  await onFileStart(item);

  try {
    const discoveredSize = await dispatch({
      item,
      connections,
      onProgress: (percent: number) => onFileProgress(item, percent),
    });

    item.size = discoveredSize;

    await onFileDone(item);
  } catch (error) {
    await onFileFail(item, toError(error));
  }
}