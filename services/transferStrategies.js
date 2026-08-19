const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");

/**
 * Returns a data handler that tracks bytes flowing through a stream and
 * reports progress via onProgress at most once every 100ms.
 *
 * Throttling prevents flooding the event emitter on fast local transfers
 * where chunks arrive faster than the SSE client can consume events.
 *
 * Usage:
 *   const track = trackProgress(totalSize, onProgress);
 *   passthrough.on("data", track);
 *
 * @param {number} totalSize - Total expected bytes for this file
 * @param {(percent: number) => void} onProgress - Receives 0–100
 * @returns {(chunk: Buffer) => void} Stream data handler
 */
const trackProgress = (totalSize, onProgress) => {
  let transferred = 0;
  let lastUpdate = Date.now();
  return (chunk) => {
    transferred += chunk.length;
    const now = Date.now();
    if (now - lastUpdate > 100) {
      lastUpdate = now;
      onProgress(Math.min((transferred / totalSize) * 100, 100));
    }
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ensureLocalDir = (filePath) =>
  fs.promises.mkdir(path.dirname(filePath), { recursive: true });

const ensureRemoteDir = (sftp, filePath) =>
  sftp.mkdir(path.posix.dirname(filePath), true).catch(() => {});

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * local → local
 *
 * Copies a file within Node's local filesystem using a PassThrough stream
 * for byte-level progress tracking. Both source and destination are absolute
 * paths within the uploads directory on the Node server.
 *
 * Note: For truly large local files, fs.copyFile() using kernel-space sendfile
 * would be faster. The PassThrough approach is used here for progress visibility,
 * though large local copies are not a primary use case for this tool.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Absolute local source path
 * @param {string} item.destinationPath - Absolute local destination path
 * @param {object} _connections - Unused for local transfers
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const localToLocal = async (item, _connections, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath);

  const passthrough = new PassThrough();
  passthrough.on("data", trackProgress(stat.size, onProgress));

  await new Promise((resolve, reject) => {
    fs.createReadStream(item.sourcePath)
      .pipe(passthrough)
      .pipe(fs.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  return stat.size;
};

/**
 * local → sftp
 *
 * Reads a file from Node's local disk and streams it to a remote SFTP server.
 * A PassThrough sits between the read and write streams so bytes can be
 * counted as they flow without buffering the file in memory.
 * @param {object} item
 * @param {string} item.sourcePath - Absolute local source path
 * @param {string} item.destinationPath - Full remote destination path
 * @param {string} item.filename - Display name used for logging
 * @param {{ sftpDest: import('ssh2-sftp-client') }} connections
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const localToSftp = async (item, { sftpDest }, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);
  await ensureRemoteDir(sftpDest, item.destinationPath);

  const passthrough = new PassThrough();
  passthrough.on("data", trackProgress(stat.size, onProgress));

  await new Promise((resolve, reject) => {
    fs.createReadStream(item.sourcePath)
      .pipe(passthrough)
      .pipe(sftpDest.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("close", resolve)
      .on("error", reject);
  });

  return stat.size;
};

/**
 * sftp → local
 *
 * Streams a file from a remote SFTP server to Node's local disk.
 *
 * sftp.get() is intentionally NOT awaited. Awaiting it causes the entire file
 * to be buffered in memory before resolving — for large files this is a
 * serious memory problem. Without await, chunks flow immediately from the
 * server into the PassThrough as they arrive, keeping memory usage flat
 * regardless of file size. Errors from get() are forwarded by destroying
 * the PassThrough, which propagates to the write stream and rejects the promise.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote source path
 * @param {string} item.destinationPath - Absolute local destination path
 * @param {{ sftpSource: import('ssh2-sftp-client') }} connections
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const sftpToLocal = async (item, { sftpSource }, onProgress) => {
  const stat = await sftpSource.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath);

  const passthrough = new PassThrough();
  passthrough.on("data", trackProgress(stat.size, onProgress));

  sftpSource
    .get(item.sourcePath, passthrough)
    .catch((err) => passthrough.destroy(err));

  await new Promise((resolve, reject) => {
    passthrough
      .pipe(fs.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  return stat.size;
};

/**
 * sftp → sftp (cross server, streamed through Node)
 *
 * Streams a file from one SFTP server through Node to another.
 * This is the core broker pattern of this system — neither server needs
 * to know about or have network access to the other. Node is the pipe.
 *
 * get() and put() run concurrently via Promise.all because they must —
 * get() feeds data into the PassThrough that put() consumes. Running them
 * sequentially would deadlock: get() would wait for put() to drain a buffer
 * that put() never starts filling.
 *
 * If either side errors, the PassThrough is destroyed to unblock the other,
 * preventing the operation from hanging indefinitely.
 *
 * Both source and destination connections are opened by the caller
 * (openConnections in sftpService) and shared across all files in the
 * group — this avoids reconnecting per file for multi-file transfers
 * from the same source server.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote path on source server
 * @param {string} item.destinationPath - Full remote path on destination server
 * @param {string} item.filename - Display name used for logging
 * @param {{ sftpSource: import('ssh2-sftp-client'), sftpDest: import('ssh2-sftp-client') }} connections
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const sftpCrossServer = async (item, { sftpSource, sftpDest }, onProgress) => {
  const { size } = await sftpSource.stat(item.sourcePath);
  await ensureRemoteDir(sftpDest, item.destinationPath);
  const passthrough = new PassThrough();
  const track = trackProgress(size, onProgress);
  passthrough.on("data", track);

  try {
    await Promise.all([
      sftpSource.get(item.sourcePath, passthrough),
      sftpDest.put(passthrough, item.destinationPath),
    ]);
  } catch (err) {
    passthrough.destroy(err);
    throw err;
  }

  return size;
};

/**
 * sftp → sftp (same server, server-side copy)
 *
 * Executes a server-side copy via rcopy. No data flows through Node —
 * the copy happens entirely on the remote server using its own filesystem,
 * making this the fastest and most efficient strategy for same-server transfers.
 *
 * The tradeoff is that byte-level progress is not available — rcopy is a
 * single blocking operation that returns only on completion. onProgress is
 * called once at 100% when the operation completes.
 *
 * For large same-server transfers where progress visibility matters,
 * a future sftpSameServerRsync strategy could exec rsync over SSH,
 * keeping data on the box while providing real progress via stdout parsing.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote source path
 * @param {string} item.destinationPath - Full remote destination path
 * @param {number} item.size - Known from expansion phase
 * @param {{ sftpSource: import('ssh2-sftp-client') }} connections
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size (as known from expansion, not re-statted)
 */
const sftpSameServer = async (item, { sftpSource }, onProgress) => {
  await ensureRemoteDir(sftpSource, item.destinationPath);
  
  await sftpSource.rcopy(item.sourcePath, item.destinationPath);
  onProgress(100);
  return item.size;
};

// ─── Strategy Selection ───────────────────────────────────────────────────────

const STRATEGIES = {
  localToLocal,
  localToSftp,
  sftpToLocal,
  sftpSameServer,
  sftpCrossServer,
};

/**
 * Determines which transfer strategy applies for a given source and destination.
 *
 * Source is identified by a serverId string. The literal string "null" represents
 * the local filesystem on the Node server — this is how local sources are stored
 * in the database since null cannot be used as a Map key.
 *
 * Destination is identified by a serverId string or null for local.
 *
 * Selection logic (evaluated in order):
 *   1. Both local                    → localToLocal
 *   2. Local source, remote dest     → localToSftp
 *   3. Remote source, local dest     → sftpToLocal
 *   4. Same server on both sides     → sftpSameServer (server-side copy)
 *   5. Different remote servers      → sftpCrossServer (streamed through Node)
 *
 * @param {string} sourceServerId - Server ID or the string "null" for local
 * @param {string|null} destServerId - Server ID or null for local
 * @returns {{ key: string, label: string }} Strategy key and human readable label
 */
const selectStrategy = (sourceServerId, destServerId) => {
  const isLocalSource = sourceServerId === "null";
  const isLocalDest = !destServerId;
  const isSameServer =
    !isLocalSource && !isLocalDest && sourceServerId === destServerId;

  if (isLocalSource && isLocalDest)
    return { key: "localToLocal", label: "local → local" };
  if (isLocalSource) return { key: "localToSftp", label: "local → sftp" };
  if (isLocalDest) return { key: "sftpToLocal", label: "sftp → local" };
  if (isSameServer)
    return { key: "sftpSameServer", label: "sftp → sftp (same server)" };
  return {
    key: "sftpCrossServer",
    label: "sftp → sftp (cross server)",
  };
};

/**
 * Dispatches a single file transfer to the correct strategy.
 *
 * This is the sole public interface of this module. The caller provides
 * the item and open connections; the dispatcher selects and executes the
 * appropriate strategy transparently. The caller never needs to know or
 * care which strategy ran — the result and progress callback contract
 * are identical regardless of strategy.
 *
 * @param {object} item - In-memory transfer item from the executor
 * @param {string|null} item.sourceServerId - Server ID or null for local
 * @param {string}      item.sourcePath     - Full source path
 * @param {string}      item.destinationPath - Full destination path
 * @param {string}      item.filename       - Display name
 * @param {number}      item.size           - Known size (may be 0 if not yet statted)
 *
 * @param {object}      connections         - Open connections for this source group
 * @param {import('ssh2-sftp-client')|null} connections.sftpSource - null if local source
 * @param {import('ssh2-sftp-client')|null} connections.sftpDest   - null if local dest
 * @param {string|null} connections.destServerId                    - null if local dest
 *
 * @param {(percent: number) => void} onProgress - Called with 0–100 as bytes flow
 *
 * @returns {Promise<number>} Actual file size in bytes discovered during transfer.
 *                            Callers should update item.size with this value.
 *
 * @throws {Error} If no strategy exists for the source/dest combination (should never happen)
 */
const dispatch = async (item, connections, onProgress) => {
  const { key, label } = selectStrategy(
    item.sourceServerId ?? "null",
    connections.destServerId,
  );
  const strategy = STRATEGIES[key];
  if (!strategy) throw new Error(`No strategy found for: ${label}`);
  return strategy(item, connections, onProgress);
};

module.exports = { dispatch, selectStrategy, STRATEGIES };
