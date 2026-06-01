const { PassThrough } = require("stream");
const path = require("path");
const { sendProgress } = require("./progressService");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively counts all files in a remote SFTP directory.
 * Used to calculate accurate progress percentages for folder transfers
 * where nested subdirectories would otherwise cause progress to reset.
 * @param {import('ssh2-sftp-client')} sftp
 * @param {string} dirPath - Remote directory path
 * @returns {Promise<number>}
 */
async function countSftpFiles(sftp, dirPath) {
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
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  countSftpFiles,
};
