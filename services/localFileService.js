const fs = require("fs");
const path = require("path");

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

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listLocalDir,
  countLocalFiles,
};
