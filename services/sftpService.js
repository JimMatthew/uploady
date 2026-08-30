const SftpClient = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const archiver = require("archiver");
const serverService = require("./serverService");
const { sendProgress } = require("./progressService");
const localFileService = require("./localFileService");

const uploadsDir = path.join(__dirname, "../uploads");

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Structured error for SFTP failures.
 * Preserves the original ssh2 error code and message for debugging.
 */
class SftpError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {string} [details]
   */
  constructor(message, code, details) {
    super(message);
    this.name = "SftpError";
    this.code = code || "SFTP_ERROR";
    this.details = details;
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Connects to an SFTP server and returns the client instance.
 * Caller is responsible for calling sftp.end() when done.
 * For short-lived operations prefer withSftp() instead.
 * @param {string} serverId
 * @returns {Promise<import('ssh2-sftp-client')>}
 */
const connectToSftp = async (serverId) => {
  const sftp = new SftpClient();
  const options = await serverService.getServerOptions(serverId);
  await sftp.connect(options);
  return sftp;
};

/**
 * Connects to an SFTP server, runs fn with the client, then closes the
 * connection in a finally block. Use for all operations that don't need
 * to keep the connection open beyond the operation itself.
 * @template T
 * @param {string} serverId
 * @param {(sftp: import('ssh2-sftp-client')) => Promise<T>} fn
 * @returns {Promise<T>}
 * @throws {SftpError}
 */
const withSftp = async (serverId, fn) => {
  let sftp;
  try {
    sftp = await connectToSftp(serverId);
    return await fn(sftp);
  } catch (err) {
    throw new SftpError("SFTP operation failed", err.code, err.message);
  } finally {
    if (sftp) {
      try {
        await sftp.end();
      } catch (_) {}
    }
  }
};

// ─── Directory ────────────────────────────────────────────────────────────────

/**
 * Lists files and folders at the given remote directory path.
 * @param {string} serverId
 * @param {string} currentDirectory
 * @returns {Promise<{ files: Array<{name: string, size: string, date: string}>, folders: Array<{name: string}> }>}
 */
const listDirectory = async (serverId, currentDirectory) =>
  withSftp(serverId, (sftp) => listDirWithSftp({ sftp, currentDirectory }));

/**
 * Lists directory contents using an already-open SFTP connection.
 * Splits results into files and folders. Use when a connection is
 * already open to avoid the overhead of opening a new one.
 * @param {{ sftp: import('ssh2-sftp-client'), currentDirectory: string }} params
 * @returns {Promise<{ files: Array<{name: string, size: string, date: string}>, folders: Array<{name: string}> }>}
 */
const listDirWithSftp = async ({ sftp, currentDirectory }) => {
  const contents = await sftp.list(currentDirectory);
  return contents.reduce(
    (acc, item) => {
      if (item.type === "d") {
        acc.folders.push({ name: item.name });
      } else {
        acc.files.push({
          name: item.name,
          size: (item.size / 1024).toFixed(2),
          date: new Date(item.modifyTime).toLocaleString(),
        });
      }
      return acc;
    },
    { files: [], folders: [] },
  );
};

// ─── File Operations ──────────────────────────────────────────────────────────

/**
 * Creates a folder at the given path on the remote server.
 * @param {string} currentPath
 * @param {string} folderName
 * @param {string} serverId
 * @returns {Promise<{ path: string }>}
 * @throws {Error} If the folder already exists
 */
const createFolder = async (currentPath, folderName, serverId) =>
  withSftp(serverId, async (sftp) => {
    const folderPath = path.posix.join(currentPath, folderName);
    if (await sftp.exists(folderPath)) throw new Error("Folder already exists");
    await sftp.mkdir(folderPath);
    return { path: folderPath };
  });

/**
 * Renames a file on the remote SFTP server.
 * @param {string} serverId
 * @param {string} currentPath
 * @param {string} fileName
 * @param {string} newFileName
 */
const renameFile = async (serverId, currentPath, fileName, newFileName) =>
  withSftp(serverId, (sftp) =>
    sftp.rename(
      path.posix.join(currentPath, fileName),
      path.posix.join(currentPath, newFileName),
    ),
  );

/**
 * Deletes a file on the remote SFTP server.
 * @param {string} serverId
 * @param {string} filePath - Full remote path
 */
const deleteFile = async (serverId, filePath) =>
  withSftp(serverId, (sftp) => sftp.delete(filePath));

/**
 * Deletes a folder on the remote SFTP server.
 * @param {string} serverId
 * @param {string} folderPath - Full remote path
 */
const deleteFolder = async (serverId, folderPath) =>
  withSftp(serverId, (sftp) => sftp.rmdir(folderPath));

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Opens a connection, stats the remote file, then begins streaming it via
 * a PassThrough. Returns the stream immediately — does NOT use withSftp
 * because the connection must stay open while the HTTP response is consumed.
 *
 * sftp.get() is NOT awaited so data flows immediately rather than buffering
 * the entire file before resolving. Caller must invoke cleanup() once the
 * stream is fully consumed (on response finish or close).
 *
 * @param {string} serverId
 * @param {string} remotePath
 * @returns {Promise<{ stream: import('stream').PassThrough, filename: string, size: number, cleanup: () => Promise<void> }>}
 * @throws {SftpError}
 */
const downloadFile = async (serverId, remotePath) => {
  const sftp = await connectToSftp(serverId);
  const stream = new PassThrough();
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      await sftp.end();
    } catch (err) {
      console.error("Error closing SFTP connection:", err);
    }
  };

  try {
    const stat = await sftp.stat(remotePath);

    // Not awaited — see JSDoc above
    sftp.get(remotePath, stream).catch(async (err) => {
      stream.destroy(err);
      await cleanup();
    });

    return {
      stream,
      filename: path.posix.basename(remotePath),
      cleanup,
      size: stat.size,
    };
  } catch (err) {
    await cleanup();
    throw new SftpError("Error downloading file", err.code, err.message);
  }
};

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Uploads a readable stream to the remote SFTP server.
 * Connection is managed manually since it must stay open during the upload.
 * Returns close() which must be called after the upload is confirmed complete.
 * @param {string} serverId
 * @param {import('stream').Readable} stream
 * @param {string} remotePath
 * @returns {Promise<{ close: () => Promise<void> }>}
 * @throws {SftpError}
 */
const uploadFile = async (serverId, stream, remotePath) => {
  const sftp = await connectToSftp(serverId);
  try {
    await sftp.put(stream, remotePath);
    return {
      close: async () => {
        try {
          await sftp.end();
        } catch (err) {
          console.error("Error closing SFTP connection:", err);
        }
      },
    };
  } catch (err) {
    await sftp.end();
    throw new SftpError("Error uploading file", err.code, err.message);
  }
};

/**
 * Executes all file items belonging to a transfer job.
 *
 * Items have already been expanded into concrete files before reaching this
 * stage. They are grouped by source so each source server requires only one
 * connection at a time.
 *
 * A small execution context is shared for the lifetime of the job. Directory
 * caches prevent repeated mkdir calls while still creating directories lazily
 * as files are actually transferred.
 *
 * @param {object} job - In-memory job maintained by the transfer executor
 * @param {Map<string, object>} job.items - Transfer items keyed by item ID
 * @param {string|null} job.destServerId - Destination server, or null for local
 *
 * @param {object} callbacks
 * @param {() => boolean} callbacks.shouldStop
 * @param {(item: object) => Promise<void>} callbacks.onFileStart
 * @param {(item: object, percent: number) => void} callbacks.onFileProgress
 * @param {(item: object) => Promise<void>} callbacks.onFileDone
 * @param {(item: object, err: Error) => Promise<void>} callbacks.onFileFail
 *
 * @returns {Promise<void>}
 */
const executeTransferJob = async (job, callbacks = {}) => {
  const {
    shouldStop = () => false,
    onFileStart = async () => {},
    onFileProgress = () => {},
    onFileDone = async () => {},
    onFileFail = async () => {},
  } = callbacks;

  /**
   * Ephemeral state shared by every file in this job.
   *
   * Connections are opened and closed per source group, but these caches live
   * for the entire job so a destination directory is ensured at most once.
   */
  const context = {
    destDirs: new Set(),
  };
  const itemsBySource = groupItemsBySource(job.items);

  for (const [sourceServerId, items] of itemsBySource) {
    if (shouldStop()) break;

    await executeSourceGroup(
      sourceServerId,
      items,
      job.destServerId,
      callbacks,
      context,
    );
  }
};

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups transfer items by source endpoint.
 *
 * Remote sources are keyed by server ID. The string "null" represents the
 * local filesystem so local items can participate in the same Map structure.
 *
 * @param {Map<string, object>} itemsMap
 * @returns {Map<string, object[]>}
 */
const groupItemsBySource = (itemsMap) => {
  const groups = new Map();

  for (const item of itemsMap.values()) {
    const key = item.sourceServerId ?? null;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
};

// ─── Source Group Execution ───────────────────────────────────────────────────

/**
 * Executes all files originating from one source endpoint.
 *
 * SFTP connections are scoped to this source group and reused for every item
 * in it. The job-scoped execution context is passed through unchanged.
 *
 * @param {string} sourceServerId - Server ID, or "null" for local
 * @param {object[]} items - Files originating from this source
 * @param {string|null} destServerId - Destination server, or null for local
 * @param {object} callbacks - Transfer lifecycle callbacks
 * @param {{
 *   localDirs: Set<string>,
 *   remoteDirs: Set<string>
 * }} context - Job-scoped execution state
 *
 * @returns {Promise<void>}
 */
const executeSourceGroup = async (
  sourceServerId,
  items,
  destServerId,
  callbacks,
  context,
) => {
  const { shouldStop, onFileStart, onFileProgress, onFileDone, onFileFail } =
    callbacks;

  const { sftpSource, sftpDest } = await openConnections(
    sourceServerId,
    destServerId,
  );

  try {
    for (const item of items) {
      if (shouldStop()) break;

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
};

// ─── Connection Management ────────────────────────────────────────────────────

/**
 * Opens the SFTP connections required for one source/destination pair.
 *
 * Local endpoints require no connection. When source and destination are the
 * same remote server, the source connection is reused for both sides.
 *
 * @param {string} sourceServerId - Server ID, or "null" for local
 * @param {string|null} destServerId - Server ID, or null for local
 *
 * @returns {Promise<{
 *   sftpSource: import("ssh2-sftp-client")|null,
 *   sftpDest: import("ssh2-sftp-client")|null
 * }>}
 */
const openConnections = async (sourceServerId, destServerId) => {
  const isLocalSource = sourceServerId === null;
  const isLocalDest = !destServerId;

  const isSameServer =
    !isLocalSource && !isLocalDest && sourceServerId === destServerId;

  const sftpSource = isLocalSource ? null : await connectToSftp(sourceServerId);

  let sftpDest = null;

  if (isSameServer) {
    // Same-server copies use one connection for server-side rcopy.
    sftpDest = sftpSource;
  } else if (!isLocalDest) {
    try {
      sftpDest = await connectToSftp(destServerId);
    } catch (err) {
      // Do not leak the source connection if destination setup fails.
      await sftpSource?.end();
      throw err;
    }
  }

  return {
    sftpSource,
    sftpDest,
  };
};

/**
 * Closes connections opened for a source group.
 *
 * Same-server transfers share one client between source and destination, so
 * the identity check prevents closing that connection twice.
 *
 * @param {import("ssh2-sftp-client")|null} sftpSource
 * @param {import("ssh2-sftp-client")|null} sftpDest
 * @returns {Promise<void>}
 */
const closeConnections = async (sftpSource, sftpDest) => {
  await sftpSource?.end();
  if (sftpDest && sftpDest !== sftpSource) {
    await sftpDest.end();
  }
};

// ─── Item Execution ───────────────────────────────────────────────────────────

/**
 * Executes one file and reports its lifecycle through the supplied callbacks.
 *
 * File-level transfer failures are reported through onFileFail rather than
 * propagated, allowing the remaining files in the job to continue.
 *
 * @param {object} item - In-memory transfer item
 * @param {{
 *   sourceServerId: string,
 *   destServerId: string|null,
 *   sftpSource: import("ssh2-sftp-client")|null,
 *   sftpDest: import("ssh2-sftp-client")|null,
 *   context: {
 *     localDirs: Set<string>,
 *     remoteDirs: Set<string>
 *   }
 * }} connections
 * @param {object} callbacks - Transfer lifecycle callbacks
 *
 * @returns {Promise<void>}
 */
const executeItem = async (item, connections, callbacks) => {
  const { onFileStart, onFileProgress, onFileDone, onFileFail } = callbacks;

  await onFileStart(item);

  try {
    const discoveredSize = await transferSingleFile({
      item,
      ...connections,
      onProgress: (percent) => onFileProgress(item, percent),
    });

    item.size = discoveredSize;

    await onFileDone(item);
  } catch (err) {
    await onFileFail(item, err);
  }
};

/**
 * Routes a single file item to the correct transfer function.
 * @param {{ item, sourceServerId, destServerId, sftpSource, sftpDest, onProgress }} params
 */
const { dispatch } = require("./transferStrategies");

/**
 * Dispatches one file to the transfer strategy appropriate for its source and
 * destination endpoints.
 *
 * @param {object} params
 * @param {object} params.item
 * @param {string} params.sourceServerId
 * @param {string|null} params.destServerId
 * @param {import("ssh2-sftp-client")|null} params.sftpSource
 * @param {import("ssh2-sftp-client")|null} params.sftpDest
 * @param {{
 *   localDirs: Set<string>,
 *   remoteDirs: Set<string>
 * }} params.context
 * @param {(percent: number) => void} params.onProgress
 *
 * @returns {Promise<number>} Actual transferred file size in bytes
 */
const transferSingleFile = async ({
  item,
  sourceServerId,
  destServerId,
  sftpSource,
  sftpDest,
  context,
  onProgress,
}) => {
  return dispatch(
    item,
    {
      sftpSource,
      sftpDest,
      destServerId,
      context,
    },
    onProgress,
  );
};

/**
 * Streams a ZIP of mixed local/remote clipboard files directly to the response.
 * Groups SFTP files by serverId to reuse connections across files from the same server.
 * @param {Array<{ file: string, path: string, source: string, serverId: string|null, isDirectory: boolean }>} files
 * @param {import('express').Response} res
 */
const zipClipboardFiles = async (files, res) => {
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  // Group SFTP files by serverId to avoid opening a new connection per file
  const sftpGroups = {};
  const localFiles = [];

  for (const item of files) {
    if (item.source === "local") {
      localFiles.push(item);
    } else {
      const key = item.serverId;
      if (!sftpGroups[key]) sftpGroups[key] = [];
      sftpGroups[key].push(item);
    }
  }

  // Local files
  for (const item of localFiles) {
    const fullPath = path.join(uploadsDir, item.path, item.file);
    if (item.isDirectory) {
      archive.directory(fullPath, item.file);
    } else {
      archive.file(fullPath, { name: item.file });
    }
  }

  // SFTP files — one connection per server
  for (const [serverId, group] of Object.entries(sftpGroups)) {
    const sftp = await connectToSftp(serverId);
    try {
      for (const item of group) {
        const remotePath = path.posix.join(item.path, item.file);
        if (item.isDirectory) {
          archive.append(null, { name: `${item.file}/` });
          await addFolderToArchive(sftp, archive, remotePath, item.file);
        } else {
          const stat = await sftp.stat(remotePath);
          if (stat.size === 0) continue;
          const fileStream = await sftp.get(remotePath);
          archive.append(fileStream, { name: item.file });
        }
      }
    } finally {
      await sftp.end();
    }
  }

  await new Promise((resolve, reject) => {
    archive.on("finish", resolve);
    archive.on("error", reject);
    archive.finalize();
  });
};

// ─── Archive ──────────────────────────────────────────────────────────────────

/**
 * Recursively appends a remote folder's contents to an archiver instance.
 * Skips empty files (size === 0) since archiver chokes on zero-byte streams.
 * @param {import('ssh2-sftp-client')} sftp
 * @param {import('archiver').Archiver} archive
 * @param {string} folderPath - Remote folder path
 * @param {string} zipFolderPath - Corresponding path inside the ZIP
 */
const addFolderToArchive = async (sftp, archive, folderPath, zipFolderPath) => {
  const contents = await sftp.list(folderPath);
  for (const item of contents) {
    const itemPath = path.posix.join(folderPath, item.name);
    const zipPath = path.posix.join(zipFolderPath, item.name);
    if (item.type === "-") {
      if (item.size === 0) continue;
      const fileStream = await sftp.get(itemPath);
      archive.append(fileStream, { name: zipPath });
    } else if (item.type === "d") {
      archive.append(null, { name: `${zipPath}/` });
      await addFolderToArchive(sftp, archive, itemPath, zipPath);
    }
  }
};

/**
 * Streams a remote folder as a ZIP archive directly to the Express response.
 * @param {string} serverId
 * @param {string} remotePath
 * @param {import('express').Response} res
 */
const archiveFolder = async (serverId, remotePath, res) =>
  withSftp(serverId, async (sftp) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    await addFolderToArchive(sftp, archive, remotePath, "/");
    await new Promise((resolve, reject) => {
      archive.on("finish", resolve);
      archive.on("error", reject);
      archive.finalize();
    });
  });

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  connectToSftp,
  listDirectory,
  listDirWithSftp,
  createFolder,
  renameFile,
  deleteFile,
  deleteFolder,
  downloadFile,
  uploadFile,
  archiveFolder,
  executeTransferJob,
  zipClipboardFiles,
};
