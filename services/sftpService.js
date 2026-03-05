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

class SftpError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = "SftpError";
    this.code = code || "SFTP_ERROR";
    this.details = details;
  }
}

/**
 * Connects to an SFTP server and returns the client instance.
 * Caller is responsible for calling sftp.end() when done.
 * @param {string} serverId
 * @returns {Promise<SftpClient>}
 */
const connectToSftp = async (serverId) => {
  const sftp = new SftpClient();
  const options = await serverService.getServerOptions(serverId);
  await sftp.connect(options);
  return sftp;
};

/**
 * Connects to an SFTP server, runs the provided function, then closes
 * the connection — even if the function throws. Use this for all
 * operations that don't need to keep the connection open after returning.
 * @template T
 * @param {string} serverId
 * @param {(sftp: SftpClient) => Promise<T>} fn
 * @returns {Promise<T>}
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
      } catch (_) {
        // Ignore close errors — connection may already be gone
      }
    }
  }
};

/**
 * Lists files and folders at the given remote directory path.
 * @param {string} serverId
 * @param {string} currentDirectory
 */
const listDirectory = async (serverId, currentDirectory) => {
  return withSftp(serverId, (sftp) =>
    listDirWithSftp({ sftp, currentDirectory }),
  );
};

/**
 * Lists directory contents using an already-open SFTP connection.
 * Splits results into files and folders.
 * @param {{ sftp: SftpClient, currentDirectory: string }}
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

/**
 * Creates a folder at the given path on the remote server.
 * Throws if the folder already exists.
 * @param {string} currentPath
 * @param {string} folderName
 * @param {string} serverId
 */
async function createFolder(currentPath, folderName, serverId) {
  return withSftp(serverId, async (sftp) => {
    const folderPath = path.posix.join(currentPath, folderName);
    if (await sftp.exists(folderPath)) {
      throw new Error("Folder Already exists");
    }
    await sftp.mkdir(folderPath);
    return { path: folderPath };
  });
}

/**
 * Renames a file on the remote SFTP server.
 * @param {string} serverId
 * @param {string} currentPath
 * @param {string} fileName
 * @param {string} newFileName
 */
const renameFile = async (serverId, currentPath, fileName, newFileName) => {
  return withSftp(serverId, (sftp) =>
    sftp.rename(
      path.posix.join(currentPath, fileName),
      path.posix.join(currentPath, newFileName),
    ),
  );
};

/**
 * Deletes a file on the remote SFTP server.
 * @param {string} serverId
 * @param {string} filePath - Full remote path to the file
 */
const deleteFile = async (serverId, filePath) => {
  return withSftp(serverId, (sftp) => sftp.delete(filePath));
};

/**
 * Deletes a folder on the remote SFTP server.
 * @param {string} serverId
 * @param {string} folderPath - Full remote path to the folder
 */
const deleteFolder = async (serverId, folderPath) => {
  return withSftp(serverId, (sftp) => sftp.rmdir(folderPath));
};

/**
 * Recursively adds a remote folder's contents to a ZIP archive.
 * Skips empty files (size === 0).
 * @param {SftpClient} sftp
 * @param {archiver.Archiver} archive
 * @param {string} folderPath - Remote source path
 * @param {string} zipFolderPath - Path inside the ZIP
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
 * Waits for the archive to fully finalize before releasing the SFTP connection.
 * @param {string} serverId
 * @param {string} remotePath
 * @param {import('express').Response} res
 */
const archiveFolder = async (serverId, remotePath, res) => {
  return withSftp(serverId, async (sftp) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    await addFolderToArchive(sftp, archive, remotePath, "/");

    // Wait for the archive stream to fully flush before withSftp closes the
    // SFTP connection — otherwise files may be cut off mid-transfer
    await new Promise((resolve, reject) => {
      archive.on("finish", resolve);
      archive.on("error", reject);
      archive.finalize();
    });
  });
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Downloads a file from the SFTP server and returns a readable stream.
 *
 * Unlike other operations, this does NOT use withSftp because the connection
 * must remain open while the stream is being consumed by the HTTP response.
 * The caller must invoke cleanup() once the stream has been fully consumed.
 *
 * @param {string} serverId
 * @param {string} remotePath
 * @returns {Promise<{ stream: PassThrough, filename: string, cleanup: Function }>}
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

/**
 * Uploads a readable stream to the remote SFTP server.
 *
 * Like downloadFile, the connection is managed manually here because it must
 * remain open while the upload stream is being consumed. Call close() when done.
 *
 * @param {string} serverId
 * @param {import('stream').Readable} stream
 * @param {string} remotePath
 * @returns {Promise<{ close: Function }>}
 */
const uploadFile = async (serverId, stream, remotePath) => {
  const sftp = await connectToSftp(serverId);

  try {
    await sftp.put(stream, remotePath);

    const close = async () => {
      try {
        await sftp.end();
      } catch (err) {
        console.error("Error closing SFTP connection:", err);
      }
    };

    return { close };
  } catch (err) {
    await sftp.end();
    throw new SftpError("Error uploading file", err.code, err.message);
  }
};

/**
 * Recursively uploads a local folder to a remote SFTP path.
 * @param {string} localPath
 * @param {string} destPath
 * @param {SftpClient} sftpDest
 */
async function uploadLocalFolderToSftp(
  localPath,
  destPath,
  sftpDest,
  transferId,
) {
  const { files, folders } = localFileService.listLocalDir(localPath);
  for (const file of files) {
    await uploadLocalFileToSftp(
      path.join(localPath, file.name),
      path.join(destPath, file.name),
      sftpDest,
      transferId,
      file.name, // pass filename for progress label
    );
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
    );
  }
}

/**
 * Uploads a single local file to a remote SFTP path.
 * @param {string} localPath
 * @param {string} destPath
 * @param {SftpClient} sftpDest
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
      .on("end", resolve)
      .on("error", reject);
  });

  if (transferId) {
    sendProgress(transferId, { file: fileName, done: true });
  }
};

/* 
  Copy items in filegroup to sftp server when filegroup contains
  files local to application
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
      const destPath = path.join(newPath, file.file);
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

/*
  Copy items in filegroup from one location to another on sftp server
*/
const copySameSftp = async ({ serverId, fileGroup, newPath }) => {
  const sftpSource = await connectToSftp(serverId);
  try {
    for (const file of fileGroup) {
      const sourcePath = path.posix.join(file.path, file.file);
      const destPath = path.posix.join(newPath, file.file);
      if (file.isDirectory) {
        await copySftpFolder(sftpSource, sourcePath, destPath);
      } else {
        await sftpSource.rcopy(sourcePath, destPath);
      }
    }
  } finally {
    await sftpSource.end();
  }
};

/**
 * Streams files from one SFTP server to another.
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
 * Copies a batch of files to a new destination.
 * Files are grouped by source server and routed to the appropriate copy strategy:
 *   - Local → SFTP
 *   - SFTP → same SFTP server (server-side copy)
 *   - SFTP → different SFTP server (stream transfer)
 *
 * @param {Array<{ serverId: string, path: string, file: string, isDirectory: boolean }>} files
 * @param {string} newPath - Destination directory
 * @param {string} [newServerId] - Destination server (omit for same-server copy)
 * @param {string} [transferId] - Progress tracking ID
 */
const sftpCopyFilesBatch = async (files, newPath, newServerId, transferId) => {
  // Group files by source server so we open each connection only once
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
      await copySameSftp({ serverId, fileGroup, newPath });
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

/**
 * Recursively downloads a remote SFTP folder to local disk.
 * @param {{ folderName: string, currentPath: string, newPath: string, sftp: SftpClient }}
 */
const copy_sftp_folder = async ({ folderName, currentPath, newPath, sftp }) => {
  const currentDirectory = path.posix.join(currentPath, folderName);
  const { files, folders } = await listDirWithSftp({ sftp, currentDirectory });
  const destPath = path.join(uploadsDir, newPath, folderName);

  await fs.promises.mkdir(destPath, { recursive: true });

  for (const file of files) {
    await copy_file_to_local({
      filename: file.name,
      currentPath: currentDirectory,
      newPath: path.join(newPath, folderName),
      sftp,
    });
  }

  for (const folder of folders) {
    await copy_sftp_folder({
      folderName: folder.name,
      currentPath: currentDirectory,
      newPath: path.join(newPath, folderName),
      sftp,
    });
  }
};

/**
 * Downloads a remote folder to local disk, managing the SFTP connection.
 * @param {string} serverId
 * @param {string} folderName
 * @param {string} currentPath
 * @param {string} newPath
 */
const copyftpFolderToLocal = async (
  serverId,
  folderName,
  currentPath,
  newPath,
) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copy_sftp_folder({ folderName, currentPath, newPath, sftp });
  } finally {
    await sftp.end();
  }
};

/**
 * Downloads a single remote file to local disk using an open SFTP connection.
 * @param {{ filename: string, currentPath: string, newPath: string, sftp: SftpClient }}
 */
const copy_file_to_local = async ({ filename, currentPath, newPath, sftp }) => {
  const remotePath = path.posix.join(currentPath, filename);
  const localDest = path.join(uploadsDir, newPath, filename);
  await fs.promises.mkdir(path.dirname(localDest), { recursive: true });
  await sftp.get(remotePath, localDest);
};

/**
 * Downloads a single remote file to local disk, managing the SFTP connection.
 * @param {string} filename
 * @param {string} currentPath
 * @param {string} newPath
 * @param {string} serverId
 */
const copySftpFileToLocal = async (
  filename,
  currentPath,
  newPath,
  serverId,
) => {
  const sftp = await connectToSftp(serverId);
  try {
    await copy_file_to_local({ filename, currentPath, newPath, sftp });
  } finally {
    await sftp.end();
  }
};

module.exports = {
  createFolder,
  renameFile,
  archiveFolder,
  listDirectory,
  deleteFile,
  deleteFolder,
  downloadFile,
  uploadFile,
  connectToSftp,
  sftpCopyFilesBatch,
  connectToSftp,
  listDirWithSftp,
  copySftpFileToLocal,
  copyftpFolderToLocal,
};
