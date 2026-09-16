import fs from "node:fs";
import path from "node:path";
import type SftpClient from "ssh2-sftp-client";
import { transferJobs, transferItems } from "../db";
import { ItemKind } from "../controllers/jobs/jobConstants";

import type {
  CreateTransferItemData,
  TransferItem,
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
 * Directory placeholders are recursively walked, expanded file items are
 * created, and the original placeholder items are removed.
 *
 * When expansion is complete, the job's totalFiles and totalBytes values
 * are recalculated from all file items belonging to the job.
 */
export async function expandJobItems(jobId: string): Promise<void> {
  const items = await transferItems.findByJobId(jobId);

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

  const newFileItems: CreateTransferItemData[] = [];

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

          await transferItems.updateSize(item._id, size);

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
            newFileItems.push({
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

          await transferItems.deleteById(item._id);
        }
      }
    } finally {
      await sftp?.end();
    }
  }

  if (newFileItems.length > 0) {
    await transferItems.createMany(newFileItems);
  }

  const allFileItems = await transferItems.findFilesByJobId(jobId);

  const totalFiles = allFileItems.length;

  const totalBytes = allFileItems.reduce((sum, item) => sum + item.size, 0);

  await transferJobs.updateTotals(jobId, totalFiles, totalBytes);
}
