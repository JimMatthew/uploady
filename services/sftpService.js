const SftpClient = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const archiver = require("archiver");
const serverService = require("./serverService");
const { sendProgress } = require("./progressService");
const localFileService = require("./localFileService");
const {
  countSftpFiles,
  copySftpFolder,
  streamFolderSftpToSftp,
  streamFileSftpPair,
} = require("./sftpTransferService");

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

const uploadLocalFileToSftp = async (localPath, destPath, sftpDest, filename, onProgress) => {
  const stat = await fs.promises.stat(localPath);
  const totalSize = stat.size;
  let transferred = 0;
  let lastUpdate = Date.now();

  const readStream = fs.createReadStream(localPath);
  const writeStream = sftpDest.createWriteStream(destPath);
  const passthrough = new PassThrough();

  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      onProgress?.(percent);
    }
  });

  await new Promise((resolve, reject) => {
    readStream
      .pipe(passthrough)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("close", resolve)
      .on("error", reject);
  });
};
/**
 * Recursively uploads a local folder to a remote SFTP path with progress tracking.
 * Uses a shared counter object so nested folders contribute to the same overall
 * percentage rather than each resetting to 0.
 * @param {string} localPath - Absolute local source path
 * @param {string} destPath - Full remote destination path
 * @param {import('ssh2-sftp-client')} sftpDest - Open SFTP connection to destination
 * @param {string|null} transferId - SSE transfer ID, null to suppress progress
 * @param {{ completed: number, total: number, name: string }|null} [counter] - Shared progress counter, built on first call
 */
const uploadLocalFolderToSftp = async (
  localPath,
  destPath,
  sftpDest,
  transferId,
  counter = null,
) => {
  const { files, folders } = localFileService.listLocalDir(localPath);

  // Build counter on first call only — recursive calls share the same object
  if (!counter && transferId) {
    const total = localFileService.countLocalFiles(localPath);
    counter = { completed: 0, total, name: path.basename(localPath) };
  }

  for (const file of files) {
    await uploadLocalFileToSftp(
      path.join(localPath, file.name),
      path.posix.join(destPath, file.name), // posix — remote path
      sftpDest,
      file.name,
      null
    );

    if (counter && transferId) {
      counter.completed++;
      const percent = Math.min((counter.completed / counter.total) * 100, 100);
      sendProgress(transferId, { file: counter.name, percent: percent.toFixed(2) });
    }
  }

  for (const folder of folders) {
    const newLocalPath = path.join(localPath, folder.name);
    const newDestPath = path.posix.join(destPath, folder.name); // posix — remote path
    try {
      await sftpDest.mkdir(newDestPath);
    } catch (err) {
      if (!err.message.includes("already exists")) throw err;
    }
    await uploadLocalFolderToSftp(newLocalPath, newDestPath, sftpDest, transferId, counter);
  }
};

// ─── SFTP → Local ─────────────────────────────────────────────────────────────

/**
 * Downloads a single remote file to local disk using an open SFTP connection.
 * Streams through a PassThrough for byte-level progress tracking.
 *
 * sftp.get() is NOT awaited — awaiting it buffers the entire file in memory
 * before resolving. Without await, chunks flow immediately into the PassThrough.
 *
 * @param {{ filename: string, currentPath: string, newPath: string, sftp: import('ssh2-sftp-client'), transferId: string|null }} params
 
const copyFileToLocal = async ({ filename, currentPath, newPath, sftp, transferId }) => {
  const remotePath = path.posix.join(currentPath, filename);
  const localDest = path.join(uploadsDir, newPath, filename);
  await fs.promises.mkdir(path.dirname(localDest), { recursive: true });

  const stat = await sftp.stat(remotePath);
  const totalSize = stat.size;
  let transferred = 0;
  let lastUpdate = Date.now();

  const passthrough = new PassThrough();
  const writeStream = fs.createWriteStream(localDest);

  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      if (transferId) {
        sendProgress(transferId, { file: filename, percent: percent.toFixed(2) });
      }
    }
  });

  // Not awaited — see JSDoc above
  sftp.get(remotePath, passthrough).catch((err) => passthrough.destroy(err));

  await new Promise((resolve, reject) => {
    passthrough.pipe(writeStream).on("finish", resolve).on("error", reject);
  });

  if (transferId) {
    sendProgress(transferId, { file: filename, done: true });
  }
};

*/
const copyFileToLocal = async ({ filename, currentPath, newPath, sftp, onProgress }) => {
  const remotePath = path.posix.join(currentPath, filename);
  const localDest = path.join(uploadsDir, newPath, filename);
  await fs.promises.mkdir(path.dirname(localDest), { recursive: true });

  const stat = await sftp.stat(remotePath);
  const totalSize = stat.size;
  let transferred = 0;
  let lastUpdate = Date.now();

  const passthrough = new PassThrough();
  const writeStream = fs.createWriteStream(localDest);

  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      onProgress?.(percent);
    }
  });

  sftp.get(remotePath, passthrough).catch((err) => passthrough.destroy(err));

  await new Promise((resolve, reject) => {
    passthrough.pipe(writeStream).on("finish", resolve).on("error", reject);
  });
};

/**
 * Recursively downloads a remote SFTP folder to local disk with progress tracking.
 * Uses a shared counter so nested folders contribute to the same overall percentage.
 * @param {{ folderName: string, currentPath: string, newPath: string, sftp: import('ssh2-sftp-client'), transferId: string|null, counter: {completed: number, total: number, name: string}|null }} params
 */
const copySftpFolderToLocal = async ({
  folderName,
  currentPath,
  newPath,
  sftp,
  transferId,
  counter = null,
}) => {
  const currentDirectory = path.posix.join(currentPath, folderName);
  const { files, folders } = await listDirWithSftp({ sftp, currentDirectory });
  const destPath = path.join(uploadsDir, newPath, folderName);

  await fs.promises.mkdir(destPath, { recursive: true });

  // Build counter on first call only — recursive calls share the same object
  if (!counter && transferId) {
    const total = await countSftpFiles(sftp, currentDirectory);
    counter = { completed: 0, total, name: folderName };
  }

  for (const file of files) {
    await copyFileToLocal({
      filename: file.name,
      currentPath: currentDirectory,
      newPath: path.join(newPath, folderName),
      sftp,
     onProgress: null,  // folder counter handles progress
    });

    if (counter && transferId) {
      counter.completed++;
      const percent = Math.min((counter.completed / counter.total) * 100, 100);
      sendProgress(transferId, { file: counter.name, percent: percent.toFixed(2) });
    }
  }

  for (const folder of folders) {
    await copySftpFolderToLocal({
      folderName: folder.name,
      currentPath: currentDirectory,
      newPath: path.join(newPath, folderName),
      sftp,
      transferId,
      counter, // pass same counter down so all levels share it
    });
  }
};

/**
 * Downloads a single remote file to local disk, opening and closing its own connection.
 * @param {string} filename
 * @param {string} currentPath - Remote directory path
 * @param {string} newPath - Local destination path relative to uploads
 * @param {string} serverId
 * @param {string|null} transferId
 */
const copySftpFileToLocal = async (filename, currentPath, newPath, serverId, transferId) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copyFileToLocal({ filename, currentPath, newPath, sftp, onProgress: null });
  } finally {
    await sftp.end();
  }
};

/**
 * Downloads a remote folder to local disk, opening and closing its own connection.
 * @param {string} serverId
 * @param {string} folderName
 * @param {string} currentPath - Remote parent directory path
 * @param {string} newPath - Local destination path relative to uploads
 * @param {string|null} transferId
 */
const copyFtpFolderToLocal = async (serverId, folderName, currentPath, newPath, transferId) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copySftpFolderToLocal({ folderName, currentPath, newPath, sftp, transferId });
  } finally {
    await sftp.end();
  }
};

// ─── Batch Copy ───────────────────────────────────────────────────────────────

/**
 * Copies a group of local files to a remote SFTP server.
 * @param {{ newServerId: string, fileGroup: Array, newPath: string, transferId: string|null }} params
 */
const copyLocalToSftp = async ({ newServerId, fileGroup, newPath, transferId }) => {
  const sftpDest = await connectToSftp(newServerId);
  try {
    for (const file of fileGroup) {
      const localPath = path.join(uploadsDir, file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);
      if (file.isDirectory) {
        await sftpDest.mkdir(destPath).catch(() => {});
        await uploadLocalFolderToSftp(localPath, destPath, sftpDest, transferId);
      } else {
        await uploadLocalFileToSftp(localPath, destPath, sftpDest, file.file, null);
      }
    }
  } finally {
    await sftpDest.end();
  }
};

/**
 * Copies files within the same SFTP server using server-side rcopy.
 * No data flows through Node so progress is indeterminate per-file.
 * Uses countSftpFiles for folder progress.
 * @param {{ serverId: string, fileGroup: Array, newPath: string, transferId: string|null }} params
 */
const copySameSftp = async ({ serverId, fileGroup, newPath, transferId }) => {
  const sftp = await connectToSftp(serverId);
  try {
    for (const file of fileGroup) {
      const sourcePath = path.posix.join(file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);

      if (transferId) {
        sendProgress(transferId, { file: file.file, indeterminate: true });
      }

      if (file.isDirectory) {
        await copySftpFolder(sftp, sourcePath, destPath, transferId);
      } else {
        await sftp.rcopy(sourcePath, destPath);
      }

      if (transferId) {
        sendProgress(transferId, { file: file.file, done: true });
      }
    }
  } finally {
    await sftp.end();
  }
};

/**
 * Streams files from one SFTP server to another through Node.
 * No direct server-to-server connection is required — Node acts as the pipe.
 * Both connections are opened before the transfer begins. If the second
 * connect fails the first is closed in the catch before rethrowing.
 * @param {{ serverId: string, newServerId: string, fileGroup: Array, newPath: string, transferId: string|null }} params
 */
const copyCrossServer = async ({ serverId, newServerId, fileGroup, newPath, transferId }) => {
  const sftpSource = await connectToSftp(serverId);
  let sftpDest;
  try {
    sftpDest = await connectToSftp(newServerId);
  } catch (err) {
    await sftpSource.end();
    throw err;
  }

  try {
    for (const file of fileGroup) {
      const sourcePath = path.posix.join(file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);
      if (file.isDirectory) {
        await streamFolderSftpToSftp(sftpSource, sftpDest, sourcePath, destPath, transferId);
      } else {
        await streamFileSftpPair(sftpSource, sftpDest, sourcePath, destPath, file.file, transferId);
      }
    }
  } finally {
    await sftpSource.end();
    await sftpDest.end();
  }
};

/**
 * Routes a batch of files to the correct copy strategy based on source/destination:
 *   - serverId null   → Local → SFTP (copyLocalToSftp)
 *   - same serverId   → SFTP server-side copy via rcopy (copySameSftp)
 *   - different IDs   → SFTP → SFTP streamed through Node (copyCrossServer)
 *
 * Files are grouped by serverId first so each server only needs one connection
 * regardless of how many files are being transferred from it.
 *
 * @param {Array<{ file: string, path: string, serverId: string|null, isDirectory: boolean }>} files
 * @param {string} newPath - Destination path
 * @param {string|null} newServerId - Destination server, null means local
 * @param {string|null} transferId - SSE transfer ID for progress updates
 
const sftpCopyFilesBatch= async (files, newPath, newServerId, transferId) => {
  const grouped = files.reduce((acc, item) => {
    const key = item.serverId ?? "null";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  for (const [serverId, fileGroup] of Object.entries(grouped)) {
    if (serverId === "null") {
      await copyLocalToSftp({ newServerId, fileGroup, newPath, transferId });
    } else if (!newServerId || newServerId === serverId) {
      await copySameSftp({ serverId, fileGroup, newPath, transferId });
    } else {
      await copyCrossServer({ serverId, newServerId, fileGroup, newPath, transferId });
    }
  }
};
*/

/**
 * Executes a transfer job by iterating flat file items grouped by source server.
 * Directories have already been expanded by the expansion phase — every item
 * here is a concrete file. Groups by sourceServerId for connection reuse.
 *
 * @param {object} job - In-memory job object from the executor
 * @param {object} callbacks
 * @param {() => boolean} callbacks.shouldStop
 * @param {(item: object) => Promise<void>} callbacks.onFileStart
 * @param {(item: object, percent: number) => void} callbacks.onFileProgress
 * @param {(item: object) => Promise<void>} callbacks.onFileDone
 * @param {(item: object, err: Error) => Promise<void>} callbacks.onFileFail
 */
const sftpCopyFilesBatch = async (job, callbacks = {}) => {
  const {
    shouldStop = () => false,
    onFileStart = async () => {},
    onFileProgress = () => {},
    onFileDone = async () => {},
    onFileFail = async () => {},
  } = callbacks;

  const { destServerId, destPath } = job;

  // group items by sourceServerId for connection reuse
  const grouped = new Map();
  for (const item of job.items.values()) {
    const key = item.sourceServerId ?? "null";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  for (const [sourceServerId, items] of grouped) {
    if (shouldStop()) break;

    const isLocal = sourceServerId === "null";
    const isSameServer = !isLocal && sourceServerId === destServerId;

    // open connections needed for this group
    const sftpSource = !isLocal ? await connectToSftp(sourceServerId) : null;
    let sftpDest = null;

    if (!isSameServer && destServerId) {
      try {
        sftpDest = await connectToSftp(destServerId);
      } catch (err) {
        await sftpSource?.end();
        throw err;
      }
    }

    try {
      for (const item of items) {
        if (shouldStop()) break;

        await onFileStart(item);

        try {
          await transferSingleFile({
            item,
            sourceServerId,
            destServerId,
            sftpSource,
            sftpDest: isSameServer ? sftpSource : sftpDest,
            onProgress: (percent) => onFileProgress(item, percent),
          });
          await onFileDone(item);
        } catch (err) {
          await onFileFail(item, err);
        }
      }
    } finally {
      await sftpSource?.end();
      // only end sftpDest if it's a separate connection
      if (sftpDest && sftpDest !== sftpSource) {
        await sftpDest.end();
      }
    }
  }
};

/**
 * Routes a single file item to the correct transfer function.
 * @param {{ item, sourceServerId, destServerId, sftpSource, sftpDest, onProgress }} params
 */
const transferSingleFile = async ({
  item,
  sourceServerId,
  destServerId,
  sftpSource,
  sftpDest,
  onProgress,
}) => {
  const isLocalSource = sourceServerId === "null";
  const isLocalDest = !destServerId;
  const isSameServer = !isLocalSource && sourceServerId === destServerId;

  // ensure destination directory exists before writing
  const destDir = path.posix.dirname(item.destinationPath);
  if (!isLocalDest) {
    await sftpDest.mkdir(destDir, true).catch(() => {});  // true = recursive, ignore if exists
  } else {
    await fs.promises.mkdir(
      path.dirname(item.destinationPath),
      { recursive: true }
    );
  }
  
  if (isLocalSource && !isLocalDest) {
    // local → sftp
    await uploadLocalFileToSftp(
      item.sourcePath,
      item.destinationPath,
      sftpDest,
      item.filename,
      onProgress,
    );
  } else if (!isLocalSource && isLocalDest) {
    // sftp → local
    await copyFileToLocal({
      filename: item.filename,
      currentPath: path.posix.dirname(item.sourcePath),
      newPath: path.dirname(item.destinationPath),
      sftp: sftpSource,
      onProgress,
    });
  } else if (isSameServer) {
    // same server — rcopy, no byte level progress available
    await sftpSource.rcopy(item.sourcePath, item.destinationPath);
    onProgress(100);
  } else {
    // cross server — stream through node
    await streamFileSftpPair(
      sftpSource,
      sftpDest,
      item.sourcePath,
      item.destinationPath,
      item.filename,
      onProgress,
    );
  }
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
  sftpCopyFilesBatch,
  copySftpFileToLocal,
  copyFtpFolderToLocal,
  zipClipboardFiles
};