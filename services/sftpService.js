const SftpClient = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const archiver = require("archiver");
const serverService = require("./serverService");
const { sendProgress } = require("./progressService");
const localFileService = require("./localFileService");
const {
  copySftpFolder,
  streamFolderSftpToSftp,
  streamFileSftpPair,
} = require("./sftpTransferService");

const uploadsDir = path.join(__dirname, "../uploads");

// ─── Error ────────────────────────────────────────────────────────────────────

class SftpError extends Error {
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
 */
const connectToSftp = async (serverId) => {
  const sftp = new SftpClient();
  const options = await serverService.getServerOptions(serverId);
  await sftp.connect(options);
  return sftp;
};

/**
 * Connects to an SFTP server, runs fn, then closes the connection.
 * Use for all operations that don't need to keep the connection open.
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
 */
const listDirectory = async (serverId, currentDirectory) =>
  withSftp(serverId, (sftp) => listDirWithSftp({ sftp, currentDirectory }));

/**
 * Lists directory contents using an already-open SFTP connection.
 * Splits results into files and folders.
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
          date: formatDate(item.modifyTime),
        });
      }
      return acc;
    },
    { files: [], folders: [] },
  );
};

const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

// ─── File Operations ──────────────────────────────────────────────────────────

/**
 * Creates a folder at the given path on the remote server.
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
 */
const deleteFile = async (serverId, filePath) =>
  withSftp(serverId, (sftp) => sftp.delete(filePath));

/**
 * Deletes a folder on the remote SFTP server.
 */
const deleteFolder = async (serverId, folderPath) =>
  withSftp(serverId, (sftp) => sftp.rmdir(folderPath));

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Downloads a file from the SFTP server and returns a readable stream.
 * Unlike other operations this does NOT use withSftp because the connection
 * must stay open while the stream is consumed by the HTTP response.
 * Caller must invoke cleanup() once the stream is fully consumed.
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
    sftp.get(remotePath, stream).catch(async (err) => {
      stream.destroy(err);
      await cleanup();
    });
    return {
      stream,
      filename: remotePath.split("/").pop(),
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
 * Connection is managed manually — must stay open during upload.
 * Returns close() to release the connection when done.
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
 * Uploads a single local file to a remote SFTP path with progress tracking.
 */
const uploadLocalFileToSftp = async (
  localPath,
  destPath,
  sftpDest,
  transferId,
  fileName,
) => {
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
      if (transferId) {
        sendProgress(transferId, {
          file: fileName,
          percent: percent.toFixed(2),
        });
      }
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

  if (transferId) {
    sendProgress(transferId, { file: fileName, done: true });
  }
};

/**
 * Recursively counts all files in a remote directory.
 */
const countSftpFiles = async (sftp, dirPath) => {
  const files = await sftp.list(dirPath);
  let count = 0;
  for (const file of files) {
    if (file.type === "-") {
      count++;
    } else if (file.type === "d") {
      count += await countSftpFiles(sftp, path.posix.join(dirPath, file.name));
    }
  }
  return count;
};

/**
 * Recursively uploads a local folder to a remote SFTP path.
 * Uses a shared counter object for accurate progress across nested folders.
 */
const uploadLocalFolderToSftp = async (
  localPath,
  destPath,
  sftpDest,
  transferId,
  counter,
) => {
  const { files, folders } = localFileService.listLocalDir(localPath);

  // Build counter on first call only
  if (!counter && transferId) {
    const total = localFileService.countLocalFiles(localPath);
    counter = { completed: 0, total, name: path.basename(localPath) };
  }

  for (const file of files) {
    await uploadLocalFileToSftp(
      path.join(localPath, file.name),
      path.join(destPath, file.name),
      sftpDest,
      null, // suppress per-file events, folder counter handles progress
      file.name,
    );

    if (counter && transferId) {
      counter.completed++;
      const percent = Math.min((counter.completed / counter.total) * 100, 100);
      sendProgress(transferId, {
        file: counter.name,
        percent: percent.toFixed(2),
      });
    }
  }

  for (const folder of folders) {
    const newLocalPath = path.join(localPath, folder.name);
    const newDestPath = path.join(destPath, folder.name);
    try {
      await sftpDest.mkdir(newDestPath);
    } catch (err) {
      if (!err.message.includes("already exists")) throw err;
    }
    await uploadLocalFolderToSftp(
      newLocalPath,
      newDestPath,
      sftpDest,
      transferId,
      counter,
    );
  }
};

// ─── SFTP → Local ─────────────────────────────────────────────────────────────

/**
 * Downloads a single remote file to local disk using an open SFTP connection.
 * Streams through a PassThrough for progress tracking — does NOT buffer.
 */
const copyFileToLocal = async ({
  filename,
  currentPath,
  newPath,
  sftp,
  transferId,
}) => {
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
        sendProgress(transferId, {
          file: filename,
          percent: percent.toFixed(2),
        });
      }
    }
  });

  // Do NOT await — awaiting sftp.get() buffers the entire file before resolving
  sftp.get(remotePath, passthrough).catch((err) => passthrough.destroy(err));

  await new Promise((resolve, reject) => {
    passthrough.pipe(writeStream).on("finish", resolve).on("error", reject);
  });

  if (transferId) {
    sendProgress(transferId, { file: filename, done: true });
  }
};

/**
 * Recursively downloads a remote SFTP folder to local disk.
 * Uses a shared counter for accurate progress across nested folders.
 */
const copySftpFolderToLocal = async ({
  folderName,
  currentPath,
  newPath,
  sftp,
  transferId,
  counter,
}) => {
  const currentDirectory = path.posix.join(currentPath, folderName);
  const { files, folders } = await listDirWithSftp({ sftp, currentDirectory });
  const destPath = path.join(uploadsDir, newPath, folderName);

  await fs.promises.mkdir(destPath, { recursive: true });

  // Build counter on first call only
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
      transferId: null, // suppress per-file events
    });

    if (counter && transferId) {
      counter.completed++;
      const percent = Math.min((counter.completed / counter.total) * 100, 100);
      sendProgress(transferId, {
        file: counter.name,
        percent: percent.toFixed(2),
      });
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
 * Downloads a single remote file to local disk, managing the SFTP connection.
 */
const copySftpFileToLocal = async (
  filename,
  currentPath,
  newPath,
  serverId,
  transferId,
) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copyFileToLocal({ filename, currentPath, newPath, sftp, transferId });
  } finally {
    await sftp.end();
  }
};

/**
 * Downloads a remote folder to local disk, managing the SFTP connection.
 */
const copyftpFolderToLocal = async (
  serverId,
  folderName,
  currentPath,
  newPath,
  transferId,
) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copySftpFolderToLocal({
      folderName,
      currentPath,
      newPath,
      sftp,
      transferId,
    });
  } finally {
    await sftp.end();
  }
};

// ─── Batch Copy ───────────────────────────────────────────────────────────────

/**
 * Copies local files to a remote SFTP server.
 */
const copyLocalToSftp = async ({
  newServerId,
  fileGroup,
  newPath,
  transferId,
}) => {
  const sftpDest = await connectToSftp(newServerId);
  try {
    for (const file of fileGroup) {
      const localPath = path.join(uploadsDir, file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);
      if (file.isDirectory) {
        await sftpDest.mkdir(destPath).catch(() => {});
        await uploadLocalFolderToSftp(
          localPath,
          destPath,
          sftpDest,
          transferId,
        );
      } else {
        await uploadLocalFileToSftp(
          localPath,
          destPath,
          sftpDest,
          transferId,
          file.file,
        );
      }
    }
  } finally {
    await sftpDest.end();
  }
};

/**
 * Copies files within the same SFTP server using server-side rcopy.
 * Progress is indeterminate since no data flows through Node.
 */
const copySameSftp = async ({ serverId, fileGroup, newPath, transferId }) => {
  const sftpSource = await connectToSftp(serverId);
  try {
    for (const file of fileGroup) {
      const sourcePath = path.posix.join(file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);

      if (transferId) {
        sendProgress(transferId, { file: file.file, indeterminate: true });
      }

      if (file.isDirectory) {
        await copySftpFolder(sftpSource, sourcePath, destPath, transferId);
      } else {
        await sftpSource.rcopy(sourcePath, destPath);
      }

      if (transferId) {
        sendProgress(transferId, { file: file.file, done: true });
      }
    }
  } finally {
    await sftpSource.end();
  }
};

/**
 * Streams files from one SFTP server to another.
 * Data flows through Node — no direct server-to-server connection required.
 */
const copyCrossServer = async ({
  serverId,
  newServerId,
  fileGroup,
  newPath,
  transferId,
}) => {
  const sftpSource = await connectToSftp(serverId);
  const sftpDest = await connectToSftp(newServerId);
  try {
    for (const file of fileGroup) {
      const sourcePath = path.posix.join(file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);
      if (file.isDirectory) {
        await streamFolderSftpToSftp(
          sftpSource,
          sftpDest,
          sourcePath,
          destPath,
          transferId,
        );
      } else {
        await streamFileSftpPair(
          sftpSource,
          sftpDest,
          sourcePath,
          destPath,
          file.file,
          transferId,
        );
      }
    }
  } finally {
    await sftpSource.end();
    await sftpDest.end();
  }
};

/**
 * Routes a batch of files to the appropriate copy strategy based on source/destination:
 *   - null serverId   → Local → SFTP
 *   - same serverId   → SFTP server-side copy (rcopy)
 *   - different IDs   → SFTP → SFTP stream through Node
 */
const sftpCopyFilesBatch = async (files, newPath, newServerId, transferId) => {
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
      await copyCrossServer({
        serverId,
        newServerId,
        fileGroup,
        newPath,
        transferId,
      });
    }
  }
};

// ─── Archive ──────────────────────────────────────────────────────────────────

/**
 * Recursively adds a remote folder's contents to a ZIP archive.
 * Skips empty files (size === 0).
 */
const addFolderToArchive = async (sftp, archive, folderPath, zipFolderPath) => {
  const folderContents = await sftp.list(folderPath);
  for (const item of folderContents) {
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
 * Streams a remote folder as a ZIP archive to the provided Express response.
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
  copyftpFolderToLocal,
};
