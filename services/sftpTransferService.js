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

// ─── File Transfer ────────────────────────────────────────────────────────────

/**
 * @param {import('ssh2-sftp-client')} source
 * @param {import('ssh2-sftp-client')} dest
 * @param {string} sourcePath
 * @param {string} destPath
 * @param {string} filename
 * @param {(percent: number) => void} onProgress
 */
async function streamFileSftpPair(
  source,
  dest,
  sourcePath,
  destPath,
  filename,
  onProgress,
) {
  const passthrough = new PassThrough();
  const { size: totalSize } = await source.stat(sourcePath);
  let transferred = 0;
  let lastUpdate = Date.now();

  passthrough.on("data", (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      const percent = Math.min((transferred / totalSize) * 100, 100);
      onProgress?.(percent);
    }
  });

  try {
    await Promise.all([
      source.get(sourcePath, passthrough),
      dest.put(passthrough, destPath),
    ]);
  } catch (err) {
    passthrough.destroy(err);
    throw err;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  countSftpFiles,
  streamFileSftpPair,
};
