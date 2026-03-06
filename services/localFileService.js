const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const { sendProgress } = require("./progressService");

const uploadsDir = path.join(__dirname, "../uploads");

// ─── Directory Listing ────────────────────────────────────────────────────────

/**
 * Lists files and folders at the given absolute directory path.
 * Returns files with size (KB) and last modified date.
 * @param {string} dirPath - Absolute path to the directory
 * @returns {{ files: Array<{name: string, size: string, date: string}>, folders: Array<{name: string}> }}
 */
const listLocalDir = (dirPath) => {
  const contents = fs.readdirSync(dirPath);
  const files = [];
  const folders = [];

  for (const item of contents) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.lstatSync(itemPath);

    if (stats.isDirectory()) {
      folders.push({ name: item });
    } else if (stats.isFile()) {
      files.push({
        name: item,
        size: (stats.size / 1024).toFixed(2),
        date: stats.mtime.toLocaleDateString(),
      });
    }
  }

  return { files, folders };
};

/**
 * Recursively counts all files in a local directory.
 * Used to calculate accurate progress percentages for folder copies.
 * @param {string} dirPath - Absolute path to the directory
 * @returns {number}
 */
const countLocalFiles = (dirPath) => {
  const { files, folders } = listLocalDir(dirPath);
  let count = files.length;
  for (const folder of folders) {
    count += countLocalFiles(path.join(dirPath, folder.name));
  }
  return count;
};

// ─── File Copy ────────────────────────────────────────────────────────────────

/**
 * Copies a single file within the uploads directory with progress tracking.
 * Streams through a PassThrough so bytes are counted as they flow —
 * does not buffer the file in memory.
 * @param {string} filename
 * @param {string} currentPath - Relative source path within uploads
 * @param {string} newPath - Relative destination path within uploads
 * @param {string|null} transferId - SSE transfer ID for progress updates, null to suppress
 */
const copy_local_file = async (filename, currentPath, newPath, transferId) => {
  const srcPath = path.join(uploadsDir, currentPath, filename);
  const destPath = path.join(uploadsDir, newPath, filename);

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

  const stat = await fs.promises.stat(srcPath);
  const totalSize = stat.size;
  let transferred = 0;
  let lastUpdate = Date.now();

  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);
  const passthrough = new PassThrough();

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

  await new Promise((resolve, reject) => {
    readStream
      .pipe(passthrough)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("error", reject);
  });

  if (transferId) {
    sendProgress(transferId, { file: filename, done: true });
  }
};

// ─── Folder Copy ──────────────────────────────────────────────────────────────

/**
 * Recursively copies a folder within the uploads directory with progress tracking.
 * Progress is reported at the folder level using a shared counter object
 * that persists across recursive calls so nested folders contribute to the
 * same overall percentage rather than each resetting to 0.
 *
 * Pass transferId as null to suppress all progress events (e.g. when the
 * caller is tracking progress at a higher level).
 *
 * @param {string} folderName
 * @param {string} currentPath - Relative source path within uploads
 * @param {string} newPath - Relative destination path within uploads
 * @param {string|null} transferId - SSE transfer ID for progress updates
 * @param {{ completed: number, total: number, name: string }|null} [counter] - Shared progress counter, built on first call
 */
const copy_local_folder = async (
  folderName,
  currentPath,
  newPath,
  transferId,
  counter = null,
) => {
  const localPath = path.join(currentPath, folderName);
  const absLocalPath = path.join(uploadsDir, localPath);
  const { files, folders } = listLocalDir(absLocalPath);
  const destPath = path.join(uploadsDir, newPath, folderName);

  await fs.promises.mkdir(destPath, { recursive: true });

  // Build counter on first call only — recursive calls share the same object
  if (!counter && transferId) {
    const total = countLocalFiles(absLocalPath);
    counter = { completed: 0, total, name: folderName };
  }

  for (const file of files) {
    // Pass null transferId — folder counter handles progress, not individual files
    await copy_local_file(
      file.name,
      localPath,
      path.join(newPath, folderName),
      null,
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
    await copy_local_folder(
      folder.name,
      localPath,
      path.join(newPath, folderName),
      transferId,
      counter, // pass same counter down so all levels share it
    );
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listLocalDir,
  countLocalFiles,
  copy_local_file,
  copy_local_folder,
};
