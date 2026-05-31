const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const archiver = require("archiver");
const mime = require("mime-types");
const SharedFile = require("../models/SharedFile");
const sftpService = require("../services/sftpService");
const executor = require("../services/transferExecutor");
const TransferJob = require("../models/transferJobs");
const TransferItem = require("../models/TransferItem");
const { ItemKind } = require("../controllers/jobs/jobConstants");
const localFileService = require("../services/localFileService");

const uploadsDir = path.join(__dirname, "../uploads");
const tempDir = path.join(__dirname, "../temp");
const domain = process.env.HOSTNAME;

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Returns Node.js process stats, memory usage, and current git commit.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const get_performance_stats = (req, res) => {
  try {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const report = process.report.getReport();

    res.json({
      memory: mem,
      cpu: cpu,
      uptime: process.uptime(),
      nodeVersion: process.version,
      v8Version: report.header.componentVersions.v8,
      osName: report.header.osName,
      osRelease: report.header.osRelease,
      osVersion: report.header.osVersion,
      version: execSync("git rev-parse --short HEAD").toString().trim(),
    });
  } catch (err) {
    console.error("Performance stats error:", err);
    res.status(500).json({ error: "Failed to retrieve performance stats" });
  }
};

// ─── Directory ────────────────────────────────────────────────────────────────

/**
 * Returns files, folders and path metadata for the given relative directory.
 * @param {string} relativePath
 */
const getDirectoryData = (relativePath) => {
  const currentPath = relativePath ? `/files/${relativePath}` : "/files";
  const { files, folders } = localFileService.listLocalDir(
    path.join(uploadsDir, relativePath),
  );
  return { files, folders, currentPath, relativePath };
};

/**
 * Lists files and folders at the given local directory path.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const list_directory_get = (req, res, next) => {
  try {
    const data = getDirectoryData(req.params[0] || "");
    res.json({ ...data, user: req.user.username });
  } catch (err) {
    next({ message: "Failed to list directory", status: 500 });
  }
};

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const upload_files_post = (req, res, next) => {
  if (!req.files?.length) {
    return next({ message: "No files uploaded", status: 400 });
  }
  res.status(200).json({ message: "Files uploaded successfully" });
};

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Triggers a file download using Express's res.download helper.
 * Sets Content-Length so the browser can show download progress.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const download_file_get = async (req, res, next) => {
  const filePath = path.join(uploadsDir, req.params[0]);
  try {
    const stat = await fs.promises.stat(filePath);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-store");
    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Streams a local file with range request support for video/audio playback.
 * Returns 206 Partial Content when a Range header is present, 200 otherwise.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const download_file_stream = async (req, res) => {
  const filePath = path.join(uploadsDir, req.params[0]);
  const contentType = mime.lookup(filePath) || "application/octet-stream";
  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
};

// ─── Archive ──────────────────────────────────────────────────────────────────

/**
 * Recursively appends a local folder's contents to an archiver instance.
 * @param {import('archiver').Archiver} archive
 * @param {string} folderPath - Absolute local path
 * @param {string} zipFolderPath - Path inside the ZIP
 */
const addFolderToArchive = async (archive, folderPath, zipFolderPath) => {
  const { folders, files } = localFileService.listLocalDir(folderPath);

  for (const file of files) {
    const itemPath = path.join(folderPath, file.name);
    const zipPath = path.posix.join(zipFolderPath, file.name);
    archive.append(fs.createReadStream(itemPath), { name: zipPath });
  }

  for (const folder of folders) {
    const itemPath = path.join(folderPath, folder.name);
    const zipPath = path.posix.join(zipFolderPath, folder.name);
    archive.append(null, { name: `${zipPath}/` });
    await addFolderToArchive(archive, itemPath, zipPath);
  }
};

/**
 * Streams a local folder as a ZIP archive to the client.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const get_archive_folder = async (req, res) => {
  const relativePath = req.params[0] || "";
  const folderPath = path.join(uploadsDir, relativePath || "/");

  try {
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent)
        res.status(500).json({ error: "Error creating archive" });
    });

    archive.pipe(res);
    await addFolderToArchive(archive, folderPath, "/");

    await new Promise((resolve, reject) => {
      archive.on("finish", resolve);
      archive.on("error", reject);
      archive.finalize();
    });
  } catch (err) {
    console.error("Archive folder error:", err);
    if (!res.headersSent)
      res.status(500).json({ error: "Error downloading folder" });
  }
};

// ─── Folder Operations ────────────────────────────────────────────────────────

/**
 * Creates a new folder at the given path within the uploads directory.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const create_folder_post = async (req, res, next) => {
  const { folderName, currentPath = "" } = req.body;

  if (!folderName) {
    return next({ message: "Missing folder name", status: 400 });
  }

  try {
    const fullPath = path.join(uploadsDir, currentPath, folderName);
    if (fs.existsSync(fullPath)) {
      return next({ message: "Folder already exists", status: 409 });
    }
    await fs.promises.mkdir(fullPath);
    res.status(200).json({ message: "Folder created" });
  } catch (err) {
    console.error("Create folder error:", err);
    next({ message: "Error creating folder", status: 500 });
  }
};

/**
 * Deletes a folder from the uploads directory.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const delete_folder_post = async (req, res, next) => {
  const { folderPath: fpath, folderName: fname } = req.body;

  if (!fpath || !fname) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    await fs.promises.rmdir(path.join(uploadsDir, fpath, fname));
    res.status(200).json({ message: "Folder deleted" });
  } catch (err) {
    console.error("Delete folder error:", err);
    next({ message: "Error deleting folder", status: 400 });
  }
};

// ─── File Operations ──────────────────────────────────────────────────────────

/**
 * Deletes a local file and removes any associated share links.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const delete_file_post = async (req, res, next) => {
  const relativeFilePath = req.params[0];

  if (!relativeFilePath) {
    return next({ message: "Missing file path", status: 400 });
  }

  try {
    const filePath = path.join(uploadsDir, relativeFilePath);
    await fs.promises.unlink(filePath);

    // Clean up any share links pointing to this file
    await SharedFile.findOneAndDelete({
      filePath,
      fileName: path.basename(filePath),
    });

    res.status(200).json({ message: "File deleted" });
  } catch (err) {
    console.error("Delete file error:", err);
    next({ message: "Error deleting file", status: 400 });
  }
};

/**
 * Renames a local file within the same directory.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const rename_file_post = async (req, res, next) => {
  const { filename, newFilename, currentPath } = req.body;

  if (!filename || !newFilename || !currentPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    const srcPath = path.join(uploadsDir, currentPath, filename);
    const destPath = path.join(uploadsDir, currentPath, newFilename);
    await fs.promises.rename(srcPath, destPath);
    res.status(200).json({ message: "File renamed" });
  } catch (err) {
    console.error("Rename file error:", err);
    next({ message: "Error renaming file", status: 500 });
  }
};

/**
 * Moves a local file by copying it to the new path then deleting the original.
 * Verifies the destination file size matches before deleting the source.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const cut_file_post = async (req, res, next) => {
  const { filename, currentPath, newPath } = req.body;

  if (!filename || !currentPath || !newPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    const srcPath = path.join(uploadsDir, currentPath, filename);
    const destPath = path.join(uploadsDir, newPath, filename);

    await fs.promises.copyFile(srcPath, destPath);

    // Verify size matches before deleting source
    const [srcStat, destStat] = await Promise.all([
      fs.promises.stat(srcPath),
      fs.promises.stat(destPath),
    ]);

    if (srcStat.size !== destStat.size) {
      await fs.promises.unlink(destPath);
      return next({ message: "File move failed — size mismatch", status: 500 });
    }

    await fs.promises.unlink(srcPath);
    res.status(200).json({ message: "File moved" });
  } catch (err) {
    console.error("Move file error:", err);
    next({ message: "Error moving file", status: 500 });
  }
};

// ─── Transfer ─────────────────────────────────────────────────────────────────

/**
 * Handles a batch paste operation for local file management.
 * Supports local → local and SFTP → local copies.
 * Sends progress updates via SSE using the provided transferId.
 * Cut is treated as copy until cut is fully implemented.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const paste_files_post = async (req, res, next) => {
  const { files, newPath } = req.body;

  if (!files?.length || !newPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    const job = await TransferJob.create({
      destServerId: null,  // local destination
      destPath: newPath,
    });

    await TransferItem.insertMany(
      files.map((f) => ({
        jobId: job._id,
        sourceServerId: f.serverId ?? null,
        filename: f.file,
        rootItem: f.file,
        sourcePath: f.serverId
          ? path.posix.join(f.path, f.file)
          : path.join(uploadsDir, f.path, f.file),
        destinationPath: path.join(newPath, f.file),
        kind: f.isDirectory ? ItemKind.DIRECTORY : ItemKind.FILE,
        size: f.size ?? 0,
      }))
    );

    executor.enqueue(job._id);

    res.status(201).json({ jobId: job._id });
  } catch (err) {
    console.error("Failed to create paste job:", err);
    next({ message: "Error pasting files", status: 500 });
  }
};
// ─── Share Links ──────────────────────────────────────────────────────────────

/**
 * Stores share link metadata in the database.
 * Returns false if the file is already shared, true on success.
 * @param {string} fileName
 * @param {string} filePath
 * @param {string} link
 * @param {string} token
 * @returns {Promise<boolean>}
 */
const storeLinkInfo = async (fileName, filePath, link, token) => {
  const existing = await SharedFile.findOne({ fileName, filePath });
  if (existing) return false;
  await new SharedFile({ fileName, filePath, link, token }).save();
  return true;
};

/**
 * Generates a public share link for a local file.
 * The link is stored in the database with a random token and can be
 * accessed without authentication via GET /share/:token/:filename.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const generate_share_link_post = async (req, res, next) => {
  const { filePath: relativeFilePath = "", fileName } = req.body;

  if (!fileName) {
    return next({ message: "Missing required fields", status: 400 });
  }

  const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName);
  if (!fs.existsSync(absoluteFilePath)) {
    return next({ message: "File not found", status: 404 });
  }

  const relPathName = path.join(relativeFilePath, fileName);
  const token = crypto.randomBytes(5).toString("hex");
  const shareLink = `${req.protocol}://${domain}/share/${token}/${fileName}`;

  const stored = await storeLinkInfo(fileName, relPathName, shareLink, token);
  if (!stored) {
    return next({ message: "File is already shared", status: 400 });
  }

  res.json({ link: shareLink, fileName });
};

/**
 * Serves a shared file — either from local disk or proxied from a remote
 * SFTP server depending on how the share was created.
 * No authentication required — access is controlled by the token.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const serve_shared_file_get = async (req, res) => {
  const { token, filename } = req.params;

  const sharedFile = await SharedFile.findOne({ token });
  if (!sharedFile) return res.status(404).send("File not found");

  if (sharedFile.isRemote) {
    const { remotePath, serverId } = sharedFile;
    if (!serverId || !remotePath) return res.status(404).send("File not found");

    // Stream directly from SFTP server to client — file never touches local disk
    try {
      const {
        stream,
        filename: fname,
        cleanup,
        size,
      } = await sftpService.downloadFile(serverId, remotePath);
      res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      if (size) res.setHeader("Content-Length", size);

      let cleanedUp = false;
      const safeCleanup = async () => {
        if (cleanedUp) return;
        cleanedUp = true;
        await cleanup();
      };
      stream.on("error", async () => {
        await safeCleanup();
        res.destroy();
      });
      res.on("finish", safeCleanup);
      res.on("close", safeCleanup);
      stream.pipe(res);
    } catch (err) {
      console.error("Remote share download error:", err);
      if (!res.headersSent) res.status(500).send("Error downloading file");
    }
    return;
  }

  // Local file
  const filePath = path.join(uploadsDir, sharedFile.filePath);
  const absoluteFilePath = path.join(path.dirname(filePath), filename);

  if (!fs.existsSync(absoluteFilePath)) {
    return res.status(404).send("File not found");
  }

  res.download(absoluteFilePath, filename, (err) => {
    if (err && !res.headersSent) {
      console.error("Share download error:", err);
      res.status(500).send("Error downloading file");
    }
  });
};

/**
 * Returns all active share links.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const get_share_links_get = async (req, res) => {
  try {
    const links = await SharedFile.find();
    res.json({ links });
  } catch (err) {
    console.error("Get share links error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Removes a share link by token, revoking public access to the file.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const stop_sharing_post = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Missing token" });

  try {
    await SharedFile.deleteOne({ token });
    res.status(200).json({ message: "Link deleted" });
  } catch (err) {
    console.error("Stop sharing error:", err);
    res.status(500).json({ error: "Error deleting link" });
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  get_performance_stats,
  list_directory_get,
  upload_files_post,
  download_file_get,
  download_file_stream,
  get_archive_folder,
  create_folder_post,
  delete_folder_post,
  delete_file_post,
  rename_file_post,
  cut_file_post,
  paste_files_post,
  generate_share_link_post,
  serve_shared_file_get,
  get_share_links_get,
  stop_sharing_post,
};
