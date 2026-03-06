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
 * Streams a single file between two SFTP servers via a PassThrough pipe.
 * Data flows: source → PassThrough → dest
 * Node acts as the intermediary — no data is written to disk.
 *
 * Note: source.get() and dest.put() are not awaited independently because
 * they must run concurrently — get() feeds data into the PassThrough which
 * put() consumes. Awaiting them sequentially would deadlock.
 *
 * Pass transferId as null to suppress progress events (e.g. when a parent
 * folder transfer is tracking overall progress instead).
 *
 * @param {import('ssh2-sftp-client')} source
 * @param {import('ssh2-sftp-client')} dest
 * @param {string} sourcePath - Full remote path on source server
 * @param {string} destPath - Full remote path on destination server
 * @param {string} filename - Display name used in progress events
 * @param {string|null} transferId - SSE transfer ID, null to suppress
 */
async function streamFileSftpPair(
  source,
  dest,
  sourcePath,
  destPath,
  filename,
  transferId,
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
      if (transferId) {
        sendProgress(transferId, {
          file: filename,
          percent: percent.toFixed(2),
        });
      }
    }
  });

  // Run concurrently — get() feeds the PassThrough that put() consumes.
  // If either side errors, destroy the PassThrough to unblock the other.
  try {
    await Promise.all([
      source.get(sourcePath, passthrough),
      dest.put(passthrough, destPath),
    ]);
  } catch (err) {
    passthrough.destroy(err);
    throw err;
  }

  if (transferId) {
    sendProgress(transferId, { file: filename, done: true });
  }
}

// ─── Folder Transfer ──────────────────────────────────────────────────────────

/**
 * Recursively streams a folder from one SFTP server to another.
 * Progress is tracked at the folder level using a shared counter object
 * that persists across recursive calls — nested folders contribute to the
 * same overall percentage rather than each resetting to 0.
 *
 * Per-file progress events are suppressed (transferId passed as null to
 * streamFileSftpPair) since the folder counter handles overall progress.
 *
 * @param {import('ssh2-sftp-client')} source
 * @param {import('ssh2-sftp-client')} dest
 * @param {string} sourcePath - Full remote path on source server
 * @param {string} destPath - Full remote path on destination server
 * @param {string|null} transferId - SSE transfer ID for progress updates
 * @param {string} [folderName] - Display name, defaults to basename of sourcePath
 * @param {{ completed: number, total: number, name: string }|null} [counter] - Shared progress counter, built on first call
 */
async function streamFolderSftpToSftp(
  source,
  dest,
  sourcePath,
  destPath,
  transferId,
  folderName,
  counter = null,
) {
  const name = folderName || path.basename(sourcePath);

  // Build counter on first call only — recursive calls share the same object
  if (!counter && transferId) {
    const total = await countSftpFiles(source, sourcePath);
    counter = { completed: 0, total, name };
  }

  const files = await source.list(sourcePath);
  await dest.mkdir(destPath, false);

  for (const file of files) {
    const srcFile = path.posix.join(sourcePath, file.name);
    const dstFile = path.posix.join(destPath, file.name);

    if (file.type === "-") {
      // Suppress per-file events — folder counter handles progress
      await streamFileSftpPair(source, dest, srcFile, dstFile, file.name, null);

      if (counter && transferId) {
        counter.completed++;
        const percent = Math.min(
          (counter.completed / counter.total) * 100,
          100,
        );
        sendProgress(transferId, {
          file: counter.name,
          percent: percent.toFixed(2),
        });
      }
    } else if (file.type === "d") {
      // Pass same counter down so all levels share it
      await streamFolderSftpToSftp(
        source,
        dest,
        srcFile,
        dstFile,
        transferId,
        counter.name,
        counter,
      );
    }
  }
}

/**
 * Recursively copies a folder on the same SFTP server using server-side rcopy.
 * Since rcopy executes entirely on the remote server, no data flows through Node
 * and progress is tracked by file count rather than bytes transferred.
 * Uses a shared counter for accurate progress across nested subdirectories.
 *
 * @param {import('ssh2-sftp-client')} sftp
 * @param {string} sourcePath - Full remote source path
 * @param {string} destPath - Full remote destination path
 * @param {string|null} transferId - SSE transfer ID for progress updates
 * @param {{ completed: number, total: number, name: string }|null} [counter] - Shared progress counter, built on first call
 */
async function copySftpFolder(
  sftp,
  sourcePath,
  destPath,
  transferId,
  counter = null,
) {
  // Build counter on first call only — recursive calls share the same object
  if (!counter && transferId) {
    const total = await countSftpFiles(sftp, sourcePath);
    counter = { completed: 0, total, name: path.basename(sourcePath) };
  }

  const files = await sftp.list(sourcePath);
  await sftp.mkdir(destPath, false);

  for (const file of files) {
    const srcFile = path.posix.join(sourcePath, file.name);
    const dstFile = path.posix.join(destPath, file.name);

    if (file.type === "-") {
      await sftp.rcopy(srcFile, dstFile);

      if (counter && transferId) {
        counter.completed++;
        const percent = Math.min(
          (counter.completed / counter.total) * 100,
          100,
        );
        sendProgress(transferId, {
          file: counter.name,
          percent: percent.toFixed(2),
        });
      }
    } else if (file.type === "d") {
      // Pass same counter down so all levels share it
      await copySftpFolder(sftp, srcFile, dstFile, transferId, counter);
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  countSftpFiles,
  streamFileSftpPair,
  streamFolderSftpToSftp,
  copySftpFolder,
};
