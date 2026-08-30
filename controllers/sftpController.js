const path = require("path");
const { servers, transferJobs, transferItems } = require("../db");
const Busboy = require("busboy");
const sftpService = require("../services/sftpService");
const serverService = require("../services/serverService");
//const { sftpCopyFilesBatch } = require("../services/sftpService");
//const { complete } = require("../services/progressService");
const executor = require("../services/transferExecutor");
const { ItemKind } = require("../controllers/jobs/jobConstants");
const uploadsDir = path.join(__dirname, "../uploads");
// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sends a JSON error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [status=500]
 */
const handleError = (res, message, status = 500) => {
  console.error(message);
  res.status(status).json({ error: message });
};

/**
 * Pipes a readable stream to an Express response, attaching error handling
 * and ensuring cleanup is called exactly once regardless of how the
 * response ends.
 * @param {import('stream').Readable} stream
 * @param {import('express').Response} res
 * @param {Function} cleanup
 */
const pipeStreamToResponse = (stream, res, cleanup) => {
  let cleanedUp = false;
  const safeCleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    await cleanup();
  };

  stream.on("error", async (err) => {
    console.error("Stream error:", err);
    await safeCleanup();
    if (!res.headersSent) {
      res.status(500).json({ error: "Stream error during download" });
    } else {
      res.destroy();
    }
  });

  res.on("finish", safeCleanup);
  res.on("close", safeCleanup);
  stream.pipe(res);
};

/**
 * Sets standard file download headers on the response.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {number} [size]
 */
const setDownloadHeaders = (res, filename, size) => {
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  if (size) res.setHeader("Content-Length", size);
};

// ─── File Listing ─────────────────────────────────────────────────────────────

/**
 * Lists files and folders at the given remote directory path.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_list_directory_get = async (req, res) => {
  const { serverId } = req.params;
  const currentDirectory = "/" + (req.params[0] || "/");
  try {
    const server = await servers.findById(serverId);
    if (!server) return handleError(res, "Server not found", 404);

    const { files, folders } = await sftpService.listDirectory(
      serverId,
      currentDirectory,
    );
    res.json({ files, folders, currentDirectory, serverId, host: server.host });
  } catch (err) {
    console.error("List directory error:", err);
    return handleError(res, "Error listing directory");
  }
};

// ─── File Operations ──────────────────────────────────────────────────────────

/**
 * Renames a file on the remote SFTP server.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_rename_file_post = async (req, res) => {
  const { currentPath, fileName, newFileName, serverId } = req.body;
  if (!currentPath || !fileName || !newFileName || !serverId) {
    return handleError(res, "Missing required fields", 400);
  }
  try {
    await sftpService.renameFile(serverId, currentPath, fileName, newFileName);
    res.status(200).json({ message: "File renamed" });
  } catch (err) {
    return handleError(res, `Error renaming file: ${err.message}`);
  }
};

/**
 * Deletes a file on the remote SFTP server.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_delete_file_post = async (req, res) => {
  const { serverId, currentDirectory, fileName } = req.body;
  if (!serverId || !currentDirectory || !fileName) {
    return handleError(res, "Missing required fields", 400);
  }
  try {
    await sftpService.deleteFile(
      serverId,
      path.posix.join(currentDirectory, fileName),
    );
    res.status(200).json({ message: "File deleted" });
  } catch (err) {
    console.error("Delete file error:", err);
    return handleError(res, "Error deleting file");
  }
};

/**
 * Deletes a folder on the remote SFTP server.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_delete_folder_post = async (req, res) => {
  const { serverId, currentDirectory, deleteDir } = req.body;
  if (!serverId || !currentDirectory || !deleteDir) {
    return handleError(res, "Missing required fields", 400);
  }
  try {
    await sftpService.deleteFolder(
      serverId,
      path.posix.join(currentDirectory, deleteDir),
    );
    res.status(200).json({ message: "Folder deleted" });
  } catch (err) {
    console.error("Delete folder error:", err);
    return handleError(res, "Error deleting folder");
  }
};

/**
 * Creates a folder at the given path on the remote SFTP server.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_create_folder_post = async (req, res) => {
  const { currentPath, folderName, serverId } = req.body;
  if (!currentPath || !folderName || !serverId) {
    return handleError(res, "Missing required fields", 400);
  }
  try {
    const result = await sftpService.createFolder(
      currentPath,
      folderName,
      serverId,
    );
    res.status(200).json({ message: "Folder created", path: result.path });
  } catch (err) {
    return handleError(res, `Error creating folder: ${err.message}`);
  }
};

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Streams a file from the remote SFTP server to the client.
 * Supports token-based auth via query param for direct browser downloads.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_download_get = async (req, res) => {
  const { serverId } = req.params;
  const relativePath = req.params[0] || "";
  const remotePath = relativePath ? `/${relativePath}` : "/";

  try {
    const { stream, filename, cleanup, size } = await sftpService.downloadFile(
      serverId,
      remotePath,
    );
    setDownloadHeaders(res, filename, size);
    pipeStreamToResponse(stream, res, cleanup);
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) handleError(res, "Error downloading file");
  }
};

/**
 * Streams a remote folder as a ZIP archive to the client.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_archive_folder_get = async (req, res) => {
  const { serverId } = req.params;
  const relativePath = req.params[0] || "";
  const remotePath = relativePath ? `/${relativePath}` : "/";
  try {
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");
    await sftpService.archiveFolder(serverId, remotePath, res);
  } catch (err) {
    console.error("Archive folder error:", err);
    if (!res.headersSent) handleError(res, "Failed to download folder");
  }
};

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Handles a multipart file upload to a remote SFTP server.
 * Expects `serverId` and `currentDirectory` as form fields.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_upload_post = async (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  let currentDirectory, serverId;

  busboy.on("field", (fieldname, value) => {
    if (fieldname === "currentDirectory") currentDirectory = value;
    if (fieldname === "serverId") serverId = value;
  });

  busboy.on("file", async (fieldname, file, info) => {
    if (!serverId || !currentDirectory) {
      file.resume();
      return res.status(400).send("Missing directory or server ID");
    }
    try {
      const remotePath = path.posix.join(currentDirectory, info.filename);
      const { close } = await sftpService.uploadFile(
        serverId,
        file,
        remotePath,
      );
      await close();
      res.status(200).send("File uploaded successfully");
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).send("Error uploading file");
    }
  });

  busboy.on("error", (err) => {
    console.error("Busboy error:", err);
    res.status(500).send("Error processing upload");
  });

  req.pipe(busboy);
};

// ─── Transfer ─────────────────────────────────────────────────────────────────

/**
 * Handles a batch file copy/paste operation across any combination of
 * local and remote SFTP sources and destinations.
 * Sends progress updates via SSE using the provided transferId.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_copy_files_post = async (req, res) => {
  const { files, newPath, newServerId } = req.body;

  if (!files?.length || !newPath) {
    return handleError(res, "Missing required fields", 400);
  }

  try {
    const job = await transferJobs.create({
      destServerId: newServerId ?? null,
      destPath: newPath,
    });

    await transferItems.createMany(
      files.map((f) => ({
        jobId: job._id,
        sourceServerId: f.serverId ?? null,
        filename: f.file,
        rootItem: f.file,
        sourcePath: f.serverId
          ? path.posix.join(f.path, f.file)
          : path.join(uploadsDir, f.path, f.file),
        destinationPath: path.posix.join(newPath, f.file),
        kind: f.isDirectory ? ItemKind.DIRECTORY : ItemKind.FILE,
        size: f.size ?? 0,
      })),
    );

    executor.enqueue(job._id.toString());

    res.status(201).json({
      jobId: job._id,
    });
  } catch (err) {
    console.error("Failed to create transfer job:", err);

    res.status(500).send("Failed to create transfer job");
  }
};

// ─── Share ────────────────────────────────────────────────────────────────────

/**
 * Creates a shareable link for a file on a remote SFTP server.
 * When the link is accessed, the backend streams the file from the
 * SFTP server directly to the requesting client.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_share_file_post = async (req, res) => {
  const { serverId, remotePath } = req.body;
  if (!serverId || !remotePath) {
    return handleError(res, "Missing required fields", 400);
  }
  try {
    const fileName = remotePath.split("/").pop();
    const { link } = await serverService.share_file(
      fileName,
      remotePath,
      serverId,
    );
    res.json({ link });
  } catch (err) {
    console.error("Share file error:", err);
    return handleError(res, "Error creating share link");
  }
};

// ─── Servers ──────────────────────────────────────────────────────────────────

/**
 * Returns all saved SFTP servers.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_get_servers_get = async (req, res) => {
  try {
    const server = await servers.listSummary();
    res.json({ servers: server });
  } catch (err) {
    console.error("Get servers error:", err);
    res.json({ status: "offline" });
  }
};

/**
 * Returns the current connection status of a saved SFTP server.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_server_status_get = async (req, res) => {
  const { serverId } = req.params;
  try {
    const status = await serverService.checkServerStatus(serverId);
    res.json({ status });
  } catch (err) {
    console.error("Server status error:", err);
    res.json({ status: "offline" });
  }
};

/**
 * Saves a new SFTP server configuration.
 * Supports password and key-based authentication.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_save_server_post = async (req, res) => {
  const {
    host,
    username,
    password,
    authType = "password",
    key,
    passphrase,
    keyMode,
  } = req.body;
  if (!host || !username || !authType) {
    return handleError(res, "Host, username, and authType are required", 400);
  }
  try {
    const server = await serverService.save_server({
      host,
      username,
      password,
      authType,
      key,
      passphrase,
      keyMode,
    });
     res.status(201).json({
      message: "Server saved",
      server,
    });
  } catch (err) {
    console.error("Save server error:", err);
    return handleError(res, "Cannot save server", 400);
  }
};

/**
 * Deletes a saved SFTP server configuration by ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sftp_delete_server_post = async (req, res) => {
  const { serverId } = req.body;
  if (!serverId) return handleError(res, "Missing serverId", 400);
  try {
    await servers.deleteById(serverId);
    res.status(200).json({ message: "Server deleted" });
  } catch (err) {
    console.error("Delete server error:", err);
    return handleError(res, "Error deleting server");
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sftp_list_directory_get,
  sftp_rename_file_post,
  sftp_delete_file_post,
  sftp_delete_folder_post,
  sftp_create_folder_post,
  sftp_download_get,
  sftp_archive_folder_get,
  sftp_upload_post,
  sftp_copy_files_post,
  sftp_share_file_post,
  sftp_get_servers_get,
  sftp_server_status_get,
  sftp_save_server_post,
  sftp_delete_server_post,
};
