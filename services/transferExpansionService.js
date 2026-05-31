const path = require("path");
const fs = require("fs");
const TransferItem = require("../models/TransferItem");
const TransferJob = require("../models/transferJobs");
const { ItemKind } = require("../controllers/jobs/jobConstants");
const { connectToSftp } = require("./sftpService");
const localFileService = require("./localFileService");

const uploadsDir = path.join(__dirname, "../uploads");

// ─── Remote Walking ───────────────────────────────────────────────────────────

/**
 * Recursively walks a remote SFTP directory and returns a flat list of files.
 * @param {import('ssh2-sftp-client')} sftp
 * @param {string} dirPath - Remote directory path
 * @param {string} destBasePath - Destination base path to compute dest per file
 * @returns {Promise<Array<{ filename, sourcePath, destinationPath, size }>>}
 */
const walkSftpDir = async (sftp, dirPath, destBasePath) => {
  const entries = await sftp.list(dirPath);
  const results = [];

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
};

// ─── Local Walking ────────────────────────────────────────────────────────────

/**
 * Recursively walks a local directory and returns a flat list of files.
 * @param {string} dirPath - Absolute local directory path
 * @param {string} destBasePath - Destination base path to compute dest per file
 * @returns {Array<{ filename, sourcePath, destinationPath, size }>}
 */
const walkLocalDir = (dirPath, destBasePath) => {
  const { files, folders } = localFileService.listLocalDir(dirPath);
  const results = [];

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
};

// ─── Expansion ────────────────────────────────────────────────────────────────

/**
 * Expands all directory items in a job into individual file items.
 * Directories are walked recursively, file rows inserted, directory rows deleted.
 * File items that are already files are left untouched.
 * Updates totalFiles and totalBytes on the job when done.
 *
 * @param {string|import('mongoose').Types.ObjectId} jobId
 */
const expandJobItems = async (jobId) => {
  const job = await TransferJob.findById(jobId);
  const items = await TransferItem.find({ jobId });

  // group directory items by sourceServerId so we open one connection per server
  const dirItems = items.filter((i) => i.kind === ItemKind.DIRECTORY);
  const fileItems = items.filter((i) => i.kind === ItemKind.FILE);

  // group dirs by sourceServerId
  const grouped = dirItems.reduce((acc, item) => {
    const key = item.sourceServerId ?? "null";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const newFileItems = [];

  for (const [sourceServerId, dirs] of Object.entries(grouped)) {
    const isLocal = sourceServerId === "null";
    const sftp = isLocal ? null : await connectToSftp(sourceServerId);

    try {
      for (const dir of dirs) {
        const walked = isLocal
          ? walkLocalDir(
            dir.sourcePath,
            dir.destinationPath,
          )
          : await walkSftpDir(sftp, dir.sourcePath, dir.destinationPath);

        for (const f of walked) {
          newFileItems.push({
            jobId,
            sourceServerId: isLocal ? null : sourceServerId,
            filename: f.filename,
            rootItem: dir.rootItem,
            sourcePath: f.sourcePath,
            destinationPath: f.destinationPath,
            size: f.size,
            kind: ItemKind.FILE,
          });
        }

        // remove the directory placeholder
        await TransferItem.deleteOne({ _id: dir._id });
      }
    } finally {
      await sftp?.end();
    }
  }

  if (newFileItems.length > 0) {
    await TransferItem.insertMany(newFileItems);
  }

  // recount everything — original file items + newly expanded
  const allFileItems = await TransferItem.find({ jobId, kind: ItemKind.FILE });
  const totalFiles = allFileItems.length;
  const totalBytes = allFileItems.reduce((sum, i) => sum + (i.size || 0), 0);

  await TransferJob.findByIdAndUpdate(jobId, { totalFiles, totalBytes });
};

module.exports = { expandJobItems };