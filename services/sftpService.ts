import fs from "node:fs";
import path from "node:path";
import { PassThrough, type Readable } from "node:stream";
import archiver, { type Archiver } from "archiver";
import type { Response } from "express";
import type SftpClient from "ssh2-sftp-client";
import { connectToSftp } from "./sftpConnection";
import { dispatch } from "./transferStrategies";

import type {
  InMemoryTransferItem,
  InMemoryTransferJob,
  TransferExecutionCallbacks,
} from "../types/transferTypes";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const uploadsDirectory = process.env.UPLOADS_DIRECTORY ?? "./uploads";

const uploadsDir = path.resolve(uploadsDirectory);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SftpFile {
  name: string;
  size: string;
  date: string;
}

export interface SftpFolder {
  name: string;
}

export interface SftpDirectoryListing {
  files: SftpFile[];
  folders: SftpFolder[];
}

export interface ListDirWithSftpOptions {
  sftp: SftpClient;
  currentDirectory: string;
}

export interface DownloadFileResult {
  stream: PassThrough;
  filename: string;
  size: number;
  cleanup: () => Promise<void>;
}

export interface UploadFileResult {
  close: () => Promise<void>;
}

interface TransferContext {
  destDirs: Set<string>;
}

interface OpenConnectionsResult {
  sftpSource: SftpClient | null;
  sftpDest: SftpClient | null;
}

interface TransferConnections extends OpenConnectionsResult {
  sourceServerId: string | null;
  destServerId: string | null;
  context: TransferContext;
}

export interface ClipboardFile {
  file: string;
  path: string;
  source: string;
  serverId: string | null;
  isDirectory: boolean;
}

interface ErrorLike {
  code?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/**
 * Structured error for SFTP failures.
 *
 * Preserves the original ssh2 error code and message for debugging.
 */
export class SftpError extends Error {
  code: string;
  details?: string;

  constructor(message: string, code?: string, details?: string) {
    super(message);
    this.name = "SftpError";
    this.code = code ?? "SFTP_ERROR";
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Error Helpers
// ---------------------------------------------------------------------------

function getErrorInfo(error: unknown): ErrorLike {
  if (error instanceof Error) {
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;

    return {
      code,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

// ---------------------------------------------------------------------------
// Connection Wrapper
// ---------------------------------------------------------------------------

/**
 * Connects to an SFTP server, runs fn with the client, then closes the
 * connection in a finally block.
 *
 * Use for operations that don't need to keep the connection open beyond
 * the operation itself.
 */
async function withSftp<T>(
  serverId: string,
  fn: (sftp: SftpClient) => Promise<T>,
): Promise<T> {
  let sftp: SftpClient | undefined;

  try {
    sftp = await connectToSftp(serverId);

    return await fn(sftp);
  } catch (error) {
    const { code, message } = getErrorInfo(error);

    throw new SftpError("SFTP operation failed", code, message);
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

/**
 * Lists files and folders at the given remote directory path.
 */
export async function listDirectory(
  serverId: string,
  currentDirectory: string,
): Promise<SftpDirectoryListing> {
  return withSftp(serverId, (sftp) =>
    listDirWithSftp({
      sftp,
      currentDirectory,
    }),
  );
}

/**
 * Lists directory contents using an already-open SFTP connection.
 *
 * Splits results into files and folders.
 */
export async function listDirWithSftp({
  sftp,
  currentDirectory,
}: ListDirWithSftpOptions): Promise<SftpDirectoryListing> {
  const contents = await sftp.list(currentDirectory);

  const result: SftpDirectoryListing = {
    files: [],
    folders: [],
  };

  for (const item of contents) {
    if (item.type === "d") {
      result.folders.push({
        name: item.name,
      });
    } else {
      result.files.push({
        name: item.name,
        size: (item.size / 1024).toFixed(2),
        date: new Date(item.modifyTime).toLocaleString(),
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

/**
 * Creates a folder at the given path on the remote server.
 */
export async function createFolder(
  currentPath: string,
  folderName: string,
  serverId: string,
): Promise<{
  path: string;
}> {
  return withSftp(serverId, async (sftp) => {
    const folderPath = path.posix.join(currentPath, folderName);

    if (await sftp.exists(folderPath)) {
      throw new Error("Folder already exists");
    }

    await sftp.mkdir(folderPath);

    return {
      path: folderPath,
    };
  });
}

/**
 * Renames a file on the remote SFTP server.
 */
export async function renameFile(
  serverId: string,
  currentPath: string,
  fileName: string,
  newFileName: string,
): Promise<void> {
  await withSftp(serverId, async (sftp) => {
    await sftp.rename(
      path.posix.join(currentPath, fileName),
      path.posix.join(currentPath, newFileName),
    );
  });
}

/**
 * Deletes a file on the remote SFTP server.
 */
export async function deleteFile(
  serverId: string,
  filePath: string,
): Promise<void> {
  await withSftp(serverId, async (sftp) => {
    await sftp.delete(filePath);
  });
}

/**
 * Deletes a folder on the remote SFTP server.
 */
export async function deleteFolder(
  serverId: string,
  folderPath: string,
): Promise<void> {
  await withSftp(serverId, async (sftp) => {
    await sftp.rmdir(folderPath);
  });
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Opens a connection, stats the remote file, then begins streaming it through
 * a PassThrough.
 *
 * The connection remains open until cleanup() is called.
 */
export async function downloadFile(
  serverId: string,
  remotePath: string,
): Promise<DownloadFileResult> {
  const sftp = await connectToSftp(serverId);

  const stream = new PassThrough();

  let cleanedUp = false;

  const cleanup = async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;

    try {
      await sftp.end();
    } catch (error) {
      console.error("Error closing SFTP connection:", error);
    }
  };

  try {
    const stat = await sftp.stat(remotePath);

    // Intentionally not awaited. Data should begin flowing through the
    // PassThrough immediately rather than being buffered before returning.
    void sftp.get(remotePath, stream).catch(async (error: unknown) => {
      stream.destroy(toError(error));

      await cleanup();
    });

    return {
      stream,
      filename: path.posix.basename(remotePath),
      cleanup,
      size: stat.size,
    };
  } catch (error) {
    await cleanup();
    const { code, message } = getErrorInfo(error);
    throw new SftpError("Error downloading file", code, message);
  }
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Uploads a readable stream to the remote SFTP server.
 *
 * The returned close() function must be called after the upload is confirmed
 * complete.
 */
export async function uploadFile(
  serverId: string,
  stream: Readable,
  remotePath: string,
): Promise<UploadFileResult> {
  const sftp = await connectToSftp(serverId);

  try {
    await sftp.put(stream, remotePath);

    return {
      close: async (): Promise<void> => {
        try {
          await sftp.end();
        } catch (error) {
          console.error("Error closing SFTP connection:", error);
        }
      },
    };
  } catch (error) {
    try {
      await sftp.end();
    } catch {
      // Preserve the upload error.
    }

    const { code, message } = getErrorInfo(error);

    throw new SftpError("Error uploading file", code, message);
  }
}

// ---------------------------------------------------------------------------
// Transfer Job Execution
// ---------------------------------------------------------------------------

const DEFAULT_TRANSFER_CALLBACKS: TransferExecutionCallbacks = {
  shouldStop: () => false,

  onFileStart: async () => {},

  onFileProgress: () => {},

  onFileDone: async () => {},

  onFileFail: async () => {},
};

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

// ---------------------------------------------------------------------------
// Clipboard ZIP
// ---------------------------------------------------------------------------

/**
 * Streams a ZIP of mixed local/remote clipboard files directly to the
 * response.
 *
 * SFTP files are grouped by server ID so each server uses one connection.
 */
export async function zipClipboardFiles(
  files: ClipboardFile[],
  res: Response,
): Promise<void> {
  const archive = archiver("zip", {
    zlib: {
      level: 6,
    },
  });

  archive.pipe(res);

  const sftpGroups = new Map<string, ClipboardFile[]>();

  const localFiles: ClipboardFile[] = [];

  for (const item of files) {
    if (item.source === "local") {
      localFiles.push(item);

      continue;
    }

    if (!item.serverId) {
      throw new Error(
        `Missing serverId for remote clipboard item: ${item.file}`,
      );
    }

    const existing = sftpGroups.get(item.serverId);

    if (existing) {
      existing.push(item);
    } else {
      sftpGroups.set(item.serverId, [item]);
    }
  }

  // Local files
  for (const item of localFiles) {
    const fullPath = path.join(uploadsDir, item.path, item.file);

    if (item.isDirectory) {
      archive.directory(fullPath, item.file);
    } else {
      archive.file(fullPath, {
        name: item.file,
      });
    }
  }

  // SFTP files — one connection per server.
  for (const [serverId, group] of sftpGroups) {
    const sftp = await connectToSftp(serverId);

    try {
      for (const item of group) {
        const remotePath = path.posix.join(item.path, item.file);

        if (item.isDirectory) {
          archive.append(Buffer.alloc(0), {
            name: `${item.file}/`,
          });

          await addFolderToArchive(sftp, archive, remotePath, item.file);
        } else {
          const stat = await sftp.stat(remotePath);

          if (stat.size === 0) {
            continue;
          }

          const fileStream = sftp.createReadStream(remotePath);

          archive.append(fileStream, {
            name: item.file,
          });
        }
      }
    } finally {
      await sftp.end();
    }
  }

  await finalizeArchive(archive);
}

// ---------------------------------------------------------------------------
// Archive Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively appends a remote folder's contents to an archiver instance.
 *
 * Empty files are skipped to preserve the existing behavior.
 */
async function addFolderToArchive(
  sftp: SftpClient,
  archive: Archiver,
  folderPath: string,
  zipFolderPath: string,
): Promise<void> {
  const contents = await sftp.list(folderPath);

  for (const item of contents) {
    const itemPath = path.posix.join(folderPath, item.name);

    const zipPath = path.posix.join(zipFolderPath, item.name);

    if (item.type === "-") {
      if (item.size === 0) {
        continue;
      }

      const fileStream = sftp.createReadStream(itemPath);

      archive.append(fileStream, {
        name: zipPath,
      });
    } else if (item.type === "d") {
      archive.append(Buffer.alloc(0), {
        name: `${zipPath}/`,
      });

      await addFolderToArchive(sftp, archive, itemPath, zipPath);
    }
  }
}

/**
 * Finalizes an archiver stream and resolves when the archive finishes.
 */
async function finalizeArchive(archive: Archiver): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    archive.once("finish", resolve);

    archive.once("error", reject);

    void archive.finalize();
  });
}

/**
 * Streams a remote folder as a ZIP archive directly to the Express response.
 */
export async function archiveFolder(
  serverId: string,
  remotePath: string,
  res: Response,
): Promise<void> {
  await withSftp(serverId, async (sftp) => {
    const archive = archiver("zip", {
      zlib: {
        level: 9,
      },
    });

    archive.pipe(res);

    await addFolderToArchive(sftp, archive, remotePath, "/");

    await finalizeArchive(archive);
  });
}

// Re-exported for existing consumers that obtain connectToSftp through
// sftpService rather than importing sftpConnection directly.
export { connectToSftp };
