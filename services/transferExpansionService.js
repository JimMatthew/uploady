const path = require("path");
const fs = require("fs");
const { transferJobs, transferItems } = require("../db");
const { ItemKind } = require("../controllers/jobs/jobConstants");
const { connectToSftp } = require("./sftpService");
const localFileService = require("./localFileService");
const uploadsDir = path.join(__dirname, "../uploads");

// ─── Remote Walking ───────────────────────────────────────────────────────────

/**
 * Recursively walks a remote SFTP directory and returns a flat list of files.
 *
 * @param {import('ssh2-sftp-client')} sftp
 * @param {string} dirPath - Remote directory path
 * @param {string} destBasePath - Destination base path to compute dest per file
 * @returns {Promise<Array<{
 *   filename: string,
 *   sourcePath: string,
 *   destinationPath: string,
 *   size: number
 * }>>}
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
 *
 * @param {string} dirPath - Absolute local directory path
 * @param {string} destBasePath - Destination base path to compute dest per file
 * @returns {Array<{
 *   filename: string,
 *   sourcePath: string,
 *   destinationPath: string,
 *   size: number
 * }>}
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
 * Expands all directory items in a transfer job into individual file items.
 *
 * Directory placeholders are recursively walked, expanded file items are
 * created, and the original directory placeholder items are removed.
 *
 * When expansion is complete, the job's totalFiles and totalBytes values
 * are recalculated from all file items belonging to the job.
 *
 * @param {string} jobId
 */
const expandJobItems = async (jobId) => {
  const items = await transferItems.findByJobId(jobId);

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
          ? walkLocalDir(dir.sourcePath, dir.destinationPath)
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

        // The directory has now been flattened into file items,
        // so its placeholder is no longer needed.
        await transferItems.deleteById(dir._id.toString());
      }
    } finally {
      await sftp?.end();
    }
  }

  if (newFileItems.length > 0) {
    await transferItems.createMany(newFileItems);
  }

  // recount everything — original file items + newly expanded
  const allFileItems = await transferItems.findFilesByJobId(jobId);
  const totalFiles = allFileItems.length;
  const totalBytes = allFileItems.reduce((sum, i) => sum + (i.size || 0), 0);

  await transferJobs.updateTotals(jobId, totalFiles, totalBytes);
};

module.exports = { expandJobItems };
