const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");
const sftpController = require("../controllers/sftpController");
const sftpService = require("../services/sftpService");
const localFileService = require("../services/localFileService");
const { execSync, spawn } = require("child_process");
const archiver = require("archiver");
const mime = require("mime-types");
const uploadsDir = path.join(__dirname, "../uploads");
const tempdir = path.join(__dirname, "../temp");
const domain = process.env.HOSTNAME;

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

/*
    upload files to directory
    We upload to temp folder and rename to desired directory
  */
const upload_files_post = (req, res, next) => {
  const folderPath = req.body.folderPath || ""; // Default to root if no folder is provided
  const targetFolder = path.join(uploadsDir, folderPath);
  const files = req.files;

  if (!fs.existsSync(targetFolder)) {
    return next({ message: "Folder does not exist", status: 404 });
  }

  if (!files) {
    return next({ message: "No files uploaded", status: 400 });
  }

  files.forEach((file) => {
    const targetPath = path.join(targetFolder, file.originalname);
    const currPath = path.join(tempdir, file.originalname);

    fs.rename(currPath, targetPath, (err) => {
      if (err) {
        next({ message: "File upload failed", status: 500 });
      }
    });
  });
  res.redirect(`/files/${folderPath}`);
};

/*
    Generate a public link for a file that can be access publicly
    the url will be /share/xxxxx/file.foo where xxxxx is a random
  */
const generateShareLinkJsonPost = async (req, res, next) => {
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
 * GET /share/:token/:filename
 * Serves a shared file — either from local disk or proxied from a remote
 * SFTP server depending on how the share was created.
 */
const serveSharedFile = async (req, res) => {
  const { token, filename } = req.params;

  const sharedFile = await SharedFile.findOne({ token });
  if (!sharedFile) {
    return res.status(404).send("File not found");
  }

  if (sharedFile.isRemote) {
    const { remotePath, serverId } = sharedFile;
    if (!serverId || !remotePath) {
      return res.status(404).send("File not found");
    }
    // Delegate to sftp download — streams file directly to client
    return sftpController.sftp_download_file(serverId, remotePath, res);
  }

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

const delete_folder_json_post = async (req, res, next) => {
  const { folderPath: fpath, folderName: fname } = req.body;

  if (!fpath || !fname) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    const folderPath = path.join(uploadsDir, fpath, fname);
    await fs.promises.rmdir(folderPath);
    res.status(200).json({ message: "Folder deleted" });
  } catch (err) {
    console.error("Delete folder error:", err);
    next({ message: "Error deleting folder", status: 400 });
  }
};

const getDirectoryData = (relativePath) => {
  const currentPath = relativePath ? `/files/${relativePath}` : "/files";
  const { files, folders } = localFileService.listLocalDir(
    path.join(uploadsDir, relativePath),
  );
  return { files, folders, currentPath, relativePath };
};

const list_directory_json_get = (req, res, next) => {
  try {
    const data = getDirectoryData(req.params[0] || "");
    res.json({ ...data, user: req.user.username });
  } catch (error) {
    next({ message: "Failed to list directory", status: 500 });
  }
};

/*
  Returns a list of all shared links
*/
const file_links_json_get = async (req, res) => {
  try {
    const links = await SharedFile.find();
    res.json({ links });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

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
 * Removes a share link by token.
 */
const stop_sharing_json_post = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }
  try {
    await SharedFile.deleteOne({ token });
    res.status(200).json({ message: "Link deleted" });
  } catch (err) {
    console.error("Stop sharing error:", err);
    res.status(500).json({ error: "Error deleting link" });
  }
};

const delete_file_json_post = async (req, res, next) => {
  try {
    const relativeFilePath = req.params[0];

    if (!relativeFilePath) {
      return next({ message: "Missing file path", status: 400 });
    }

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
 * GET /files/download/*
 * Triggers a file download using Express's res.download helper.
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

const download_file_stream = async (req, res) => {
  const rfilePath = req.params[0];

  const filePath = path.join(uploadsDir, rfilePath);
  const contentType = mime.lookup(filePath) || "application/octet-stream";
  const stat = await fs.promises.stat(filePath);
  const fileSize = stat.size;

  const range = req.headers.range;

  if (range) {
    // Parse range: "bytes=start-end"
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    file.pipe(res);
  } else {
    // No range header -> send full file
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    });
    fs.createReadStream(filePath).pipe(res);
  }
};

const create_folder_json_post = async (req, res, next) => {
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
 * Copies a file — either from a remote SFTP server to local, or within local storage.
 */
const copy_file_json_post = async (req, res, next) => {
  const { filename, currentPath, newPath, serverId } = req.body;

  if (!filename || !currentPath || !newPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    if (serverId) {
      await sftpService.copySftpFileToLocal(
        filename,
        currentPath,
        newPath,
        serverId,
      );
    } else {
      await localFileService.copy_local_file(filename, currentPath, newPath);
    }
    res.status(200).json({ message: "File copied" });
  } catch (err) {
    console.error("Copy file error:", err);
    next({ message: "Error copying file", status: 500 });
  }
};

/**
 * Copies a folder — either from a remote SFTP server to local, or within local storage.
 */
const copy_folder_json_post = async (req, res, next) => {
  const { folderName, currentPath, newPath, serverId } = req.body;

  if (!folderName || !currentPath || !newPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    if (serverId) {
      await sftpService.copyftpFolderToLocal(
        serverId,
        folderName,
        currentPath,
        newPath,
      );
    } else {
      await localFileService.copy_local_folder(
        folderName,
        currentPath,
        newPath,
      );
    }
    res.status(200).json({ message: "Folder copied" });
  } catch (err) {
    console.error("Copy folder error:", err);
    next({ message: "Error copying folder", status: 500 });
  }
};

/**
 * Moves a local file by copying it to the new path then deleting the original.
 */
const cut_file_json_post = async (req, res, next) => {
  const { filename, currentPath, newPath } = req.body;

  if (!filename || !currentPath || !newPath) {
    return next({ message: "Missing required fields", status: 400 });
  }

  try {
    const srcPath = path.join(uploadsDir, currentPath, filename);
    const destPath = path.join(uploadsDir, newPath, filename);

    await fs.promises.copyFile(srcPath, destPath);
    await fs.promises.rm(srcPath);

    res.status(200).json({ message: "File moved" });
  } catch (err) {
    console.error("Move file error:", err);
    next({ message: "Error moving file", status: 500 });
  }
};

const rename_file_json_post = async (req, res, next) => {
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
 * Recursively appends a local folder's contents to an archiver instance.
 * @param {archiver.Archiver} archive
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

const get_archive_folder = async (req, res) => {
  const relativePath = req.params[0] || "";
  const folderPath = path.join(uploadsDir, relativePath || "/");

  try {
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error creating archive" });
      }
    });

    archive.pipe(res);

    await addFolderToArchive(archive, folderPath, "/");

    // Await finalization so we know the archive is complete before returning
    await new Promise((resolve, reject) => {
      archive.on("finish", resolve);
      archive.on("error", reject);
      archive.finalize();
    });
  } catch (err) {
    console.error("Archive folder error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error downloading folder" });
    }
  }
};

module.exports = {
  download_file_get,
  upload_files_post,
  serveSharedFile,
  list_directory_json_get,
  file_links_json_get,
  generateShareLinkJsonPost,
  stop_sharing_json_post,
  create_folder_json_post,
  delete_folder_json_post,
  delete_file_json_post,
  get_performance_stats,
  copy_file_json_post,
  cut_file_json_post,
  rename_file_json_post,
  copy_folder_json_post,
  download_file_stream,
  get_archive_folder,
};
