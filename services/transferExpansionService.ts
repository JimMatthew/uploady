import fs from "node:fs";
import path from "node:path";
import type SftpClient from "ssh2-sftp-client";
import { transferJobs, transferItems } from "../db";
import { ItemKind } from "../controllers/jobs/jobConstants";

import type {
  CreateTransferItemData,
  TransferItem,
  TransferItemExpansionBatch,
} from "../db/stores/transferItemStore";

import { connectToSftp } from "./sftpConnection";
import { listLocalDir } from "./localFileService";
import { listZip } from "./archiveService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WalkedFile {
  filename: string;
  sourcePath: string;
  destinationPath: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Remote Walking
// ---------------------------------------------------------------------------

/**
 * Recursively walks a remote SFTP directory and returns a flat list of files.
 */
async function walkSftpDir(
  sftp: SftpClient,
  dirPath: string,
  destBasePath: string,
): Promise<WalkedFile[]> {
  const entries = await sftp.list(dirPath);

  const results: WalkedFile[] = [];

  for (const entry of entries) {
    const srcPath = path.posix.join(dirPath, entry.name);
    const dstPath = path.posix.join(destBasePath, entry.name);

    if (entry.type === "-") {
      results.push({
        filename: entry.name,
        sourcePath: srcPath,
        destinationPath: dstPath,
        size: entry.size,
      });
    } else if (entry.type === "d") {
      const children = await walkSftpDir(sftp, srcPath, dstPath);

      results.push(...children);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Local Walking
// ---------------------------------------------------------------------------

/**
 * Recursively walks a local directory and returns a flat list of files.
 */
function walkLocalDir(dirPath: string, destBasePath: string): WalkedFile[] {
  const { files, folders } = listLocalDir(dirPath);

  const results: WalkedFile[] = [];

  for (const file of files) {
    const srcPath = path.join(dirPath, file.name);
    const stat = fs.statSync(srcPath);

    results.push({
      filename: file.name,
      sourcePath: srcPath,
      destinationPath: path.posix.join(destBasePath, file.name),
      size: stat.size,
    });
  }

  for (const folder of folders) {
    const children = walkLocalDir(
      path.join(dirPath, folder.name),
      path.posix.join(destBasePath, folder.name),
    );

    results.push(...children);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Archive Walking
// ---------------------------------------------------------------------------

async function walkArchiveDir(
  archivePath: string,
  dirPath: string,
  destBasePath: string,
): Promise<WalkedFile[]> {
  const entries = await listZip(archivePath);

  const prefix = dirPath.endsWith("/") ? dirPath : `${dirPath}/`;

  const results: WalkedFile[] = [];

  for (const entry of entries) {
    if (entry.directory) {
      continue;
    }

    if (!entry.name.startsWith(prefix)) {
      continue;
    }

    const relativePath = entry.name.slice(prefix.length);

    if (!relativePath) {
      continue;
    }

    results.push({
      filename: path.posix.basename(entry.name),
      sourcePath: entry.name,
      destinationPath: path.join(destBasePath, ...relativePath.split("/")),
      size: entry.size,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

/**
 * Expands all directory items in a transfer job into individual file items.
 *
 * Expansion is performed in two phases:
 *
 * 1. Discover the complete expansion result in memory.
 * 2. Persist all size updates, new file items, and removed directory
 *    placeholders as a single store-level expansion batch.
 *
 * Execution must not begin until this function completes. Unlike transfer
 * execution persistence, expansion is not eventually consistent: the complete
 * canonical execution plan is persisted before returning.
 *
 * When expansion is complete, totalFiles and totalBytes are recalculated from
 * the resulting file items stored in the database.
 */
export async function expandJobItems(jobId: string): Promise<void> {
  const startedAt = performance.now();
  const items = await transferItems.findByJobId(jobId);
  const loadDoneAt = performance.now();
  /*
   * null represents a local/archive source with no
   * remote source server.
   */
  const grouped = new Map<string | null, TransferItem[]>();

  for (const item of items) {
    const sourceServerId = item.sourceServerId ?? null;

    const group = grouped.get(sourceServerId);

    if (group) {
      group.push(item);
    } else {
      grouped.set(sourceServerId, [item]);
    }
  }

  const expansionBatch: TransferItemExpansionBatch = {
    sizeUpdates: [],
    newItems: [],
    deleteIds: [],
  };

  for (const [sourceServerId, sourceItems] of grouped) {
    const isLocal = sourceServerId === null;

    const sftp = isLocal ? null : await connectToSftp(sourceServerId);

    try {
      for (const item of sourceItems) {
        // ---------------------------------------------------------------
        // Direct File
        // ---------------------------------------------------------------

        if (item.kind === ItemKind.FILE) {
          let size: number;

          if (item.sourceType === "archive") {
            if (!item.archivePath || !item.sourcePath) {
              throw new Error(`Invalid archive transfer item: ${item._id}`);
            }

            const entries = await listZip(item.archivePath);

            const archiveEntry = entries.find(
              (entry) => entry.name === item.sourcePath,
            );

            if (!archiveEntry) {
              throw new Error(`Archive entry not found: ${item.sourcePath}`);
            }

            size = archiveEntry.size;
          } else if (isLocal) {
            if (!item.sourcePath) {
              throw new Error(
                `Missing source path for transfer item: ${item._id}`,
              );
            }

            size = fs.statSync(item.sourcePath).size;
          } else {
            if (!sftp || !item.sourcePath) {
              throw new Error(`Invalid remote transfer item: ${item._id}`);
            }

            size = (await sftp.stat(item.sourcePath)).size;
          }

          expansionBatch.sizeUpdates.push({
            id: item._id,
            size,
          });

          continue;
        }

        // ---------------------------------------------------------------
        // Directory
        // ---------------------------------------------------------------

        if (item.kind === ItemKind.DIRECTORY) {
          if (!item.sourcePath || !item.destinationPath) {
            throw new Error(`Invalid directory transfer item: ${item._id}`);
          }

          let walked: WalkedFile[];

          if (item.sourceType === "archive") {
            if (!item.archivePath) {
              throw new Error(
                `Missing archive path for transfer item: ${item._id}`,
              );
            }

            walked = await walkArchiveDir(
              item.archivePath,
              item.sourcePath,
              item.destinationPath,
            );
          } else if (isLocal) {
            walked = walkLocalDir(item.sourcePath, item.destinationPath);
          } else {
            if (!sftp) {
              throw new Error(
                `Missing SFTP connection for transfer item: ${item._id}`,
              );
            }

            walked = await walkSftpDir(
              sftp,
              item.sourcePath,
              item.destinationPath,
            );
          }

          for (const file of walked) {
            expansionBatch.newItems.push({
              jobId,
              sourceType: item.sourceType,
              sourceServerId,
              archivePath: item.archivePath,
              filename: file.filename,
              rootItem: item.rootItem,
              sourcePath: file.sourcePath,
              destinationPath: file.destinationPath,
              size: file.size,
              kind: ItemKind.FILE,
            });
          }

          expansionBatch.deleteIds.push(item._id);
        }
      }
    } finally {
      await sftp?.end();
    }
  }
  const discoveryDoneAt = performance.now();
  await transferItems.persistExpansion(expansionBatch);

  const allFileItems = await transferItems.findFilesByJobId(jobId);
  const persistDoneAt = performance.now();
  const totalFiles = allFileItems.length;
  const reloadDoneAt = performance.now();
  const totalBytes = allFileItems.reduce((sum, item) => sum + item.size, 0);

  await transferJobs.updateTotals(jobId, totalFiles, totalBytes);
  const finishedAt = performance.now();
  console.log(
    `[TransferExpansion] complete` +
      ` total=${(finishedAt - startedAt).toFixed(2)}ms` +
      ` load=${(loadDoneAt - startedAt).toFixed(2)}ms` +
      ` discovery=${(discoveryDoneAt - loadDoneAt).toFixed(2)}ms` +
      ` persist=${(persistDoneAt - discoveryDoneAt).toFixed(2)}ms` +
      ` reload=${(reloadDoneAt - persistDoneAt).toFixed(2)}ms` +
      ` totals=${(finishedAt - reloadDoneAt).toFixed(2)}ms` +
      ` sizeUpdates=${expansionBatch.sizeUpdates.length}` +
      ` newItems=${expansionBatch.newItems.length}` +
      ` deletedPlaceholders=${expansionBatch.deleteIds.length}`,
  );
}
