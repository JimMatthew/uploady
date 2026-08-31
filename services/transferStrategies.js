const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const { pipeline } = require("stream/promises");
const { connectToSftp } = require("./sftpConnection");

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

/**
 * Ensures the parent directory for a local destination exists.
 *
 * Successfully ensured directories are cached for the current job. A path is
 * added only after mkdir succeeds, so failed attempts may be retried.
 *
 * @param {string} filePath
 * @param {Set<string>} cache
 * @returns {Promise<void>}
 */
const ensureLocalDir = async (filePath, cache) => {
  const dir = path.dirname(filePath);

  if (cache.has(dir)) {
    return;
  }

  await fs.promises.mkdir(dir, {
    recursive: true,
  });

  cache.add(dir);
};

/**
 * Ensures the parent directory for a remote destination exists.
 *
 * The cache is job-scoped, and each job has only one destination endpoint,
 * so the remote directory path itself is sufficient as the cache key.
 *
 * @param {import("ssh2-sftp-client")} sftp
 * @param {string} filePath
 * @param {Set<string>} cache
 * @returns {Promise<void>}
 */
const ensureRemoteDir = async (sftp, filePath, cache) => {
  const dir = path.posix.dirname(filePath);

  if (cache.has(dir)) {
    return;
  }

  await sftp.mkdir(dir, true);

  cache.add(dir);
};

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * local → local
 *
 * Copies a file within Node's local filesystem using a PassThrough stream
 * for byte-level progress tracking.
 *
 * The destination directory is created lazily and cached for the lifetime
 * of the job so subsequent files targeting the same directory avoid
 * redundant mkdir calls.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Absolute local source path
 * @param {string} item.destinationPath - Absolute local destination path
 * @param {object} execution
 * @param {{ destDirs: Set<string> }} execution.context
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const localToLocal = async (item, { context }, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath, context.destDirs);

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
 * Streams a local file to a remote SFTP destination. A PassThrough stream
 * tracks byte-level progress without buffering the entire file in memory.
 *
 * Remote destination directories are created lazily and cached for the
 * lifetime of the job.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Absolute local source path
 * @param {string} item.destinationPath - Full remote destination path
 * @param {object} execution
 * @param {import("ssh2-sftp-client")} execution.sftpDest
 * @param {{ destDirs: Set<string> }} execution.context
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const localToSftp = async (item, { sftpDest, context }, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);

  await ensureRemoteDir(sftpDest, item.destinationPath, context.destDirs);

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
 * Streams a remote file to the local filesystem.
 *
 * sftp.get() is intentionally not awaited. Awaiting it would allow the
 * client to buffer the file before resolving; instead, data is written into
 * the PassThrough as it arrives so memory usage remains bounded. Errors from
 * get() are forwarded by destroying the stream.
 *
 * Local destination directories are created lazily and cached for the
 * lifetime of the job.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote source path
 * @param {string} item.destinationPath - Absolute local destination path
 * @param {object} execution
 * @param {import("ssh2-sftp-client")} execution.sftpSource
 * @param {{ destDirs: Set<string> }} execution.context
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const sftpToLocal2 = async (item, { sftpSource, context }, onProgress) => {
  const stat = await sftpSource.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath, context.destDirs);

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

const sftpToLocal = async (
  item,
  { sftpSource, context },
  onProgress,
) => {
  await ensureLocalDir(item.destinationPath, context.destDirs);

  await sftpSource.fastGet(
    item.sourcePath,
    item.destinationPath,
    {
      step: (transferred, chunk, total) => {
        onProgress((transferred / total) * 100);
      },
    },
  );

  const stat = await fs.promises.stat(item.destinationPath);

  return stat.size;
};

const copyRange = async ({
  sftpSource,
  sftpDest,
  sourcePath,
  destinationPath,
  start,
  end,
  onBytes,
}) => {
  const readStream = sftpSource.createReadStream(sourcePath, {
    start,
    end,
  });

  const writeStream = sftpDest.createWriteStream(destinationPath, {
    flags: "r+",
    start,
  });

  readStream.on("data", (chunk) => {
    onBytes(chunk.length);
  });

  await pipeline(readStream, writeStream);
};
/**
 * sftp → sftp (cross server)
 *
 * Streams a file from one remote server through Node to another. The source
 * and destination servers do not require direct connectivity to each other.
 *
 * get() and put() run concurrently because they operate on opposite ends of
 * the same PassThrough stream. If either side fails, the stream is destroyed
 * so the other operation is not left waiting indefinitely.
 *
 * Remote destination directories are created lazily and cached for the
 * lifetime of the job.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote source path
 * @param {string} item.destinationPath - Full remote destination path
 * @param {object} execution
 * @param {import("ssh2-sftp-client")} execution.sftpSource
 * @param {import("ssh2-sftp-client")} execution.sftpDest
 * @param {{ destDirs: Set<string> }} execution.context
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} File size in bytes
 */
const sftpCrossServer3 = async (
  item,
  { sftpSource, sftpDest, context },
  onProgress,
) => {
  const { size } = await sftpSource.stat(item.sourcePath);

  await ensureRemoteDir(
    sftpDest,
    item.destinationPath,
    context.destDirs,
  );

  const passthrough = new PassThrough();
  passthrough.on("data", trackProgress(size, onProgress));

  await pipeline(
    sftpSource.createReadStream(item.sourcePath),
    passthrough,
    sftpDest.createWriteStream(item.destinationPath),
  );

  return size;
};

const sftpCrossServer2 = async (
  item,
  {
    sftpSource,
    sftpDest,
    context,
  },
  onProgress,
) => {
  const CHUNK_SIZE = 16 * 1024 * 1024;
  const WORKERS = 2;

  const { size } = await sftpSource.stat(item.sourcePath);

  await ensureRemoteDir(
    sftpDest,
    item.destinationPath,
    context.destDirs,
  );

  await createDestinationFile(
    sftpDest,
    item.destinationPath,
  );

  const chunks = createChunks(size, CHUNK_SIZE);

  let transferred = 0;

  const onBytes = (bytes) => {
    transferred += bytes;
    onProgress((transferred / size) * 100);
  };

  const runWorker = async () => {
    while (chunks.length > 0) {
      const range = chunks.shift();

      if (!range) {
        return;
      }

      await copyRange({
        sftpSource,
        sftpDest,
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
        start: range.start,
        end: range.end,
        onBytes,
      });
    }
  };

  await Promise.all(
    Array.from(
      { length: WORKERS },
      () => runWorker(),
    ),
  );

  return size;
};

const createChunks = (size, chunkSize) => {
  const chunks = [];

  for (let start = 0; start < size; start += chunkSize) {
    chunks.push({
      start,
      end: Math.min(start + chunkSize - 1, size - 1),
    });
  }

  return chunks;
};

const runWorker = async ({
  chunks,
  sftpSource,
  sftpDest,
  item,
  onBytes,
}) => {
  while (chunks.length) {
    const range = chunks.shift();

    if (!range) return;

    await copyRange({
      sftpSource,
      sftpDest,
      sourcePath: item.sourcePath,
      destinationPath: item.destinationPath,
      ...range,
      onBytes,
    });
  }
};

const createDestinationFile = async (
  sftpDest,
  destinationPath,
) => {
  const stream = sftpDest.createWriteStream(destinationPath, {
    flags: "w",
  });

  await new Promise((resolve, reject) => {
    stream.on("close", resolve);
    stream.on("error", reject);
    stream.end();
  });
};

const sftpCrossServer = async (
  item,
  { sftpSource, sftpDest, context },
  onProgress,
) => {
  const { size } = await sftpSource.stat(item.sourcePath);

  await ensureRemoteDir(
    sftpDest,
    item.destinationPath,
    context.destDirs,
  );

  await createDestinationFile(
    sftpDest,
    item.destinationPath,
  );

  const ranges = createRanges(size, 2);

  let transferred = 0;

  const onBytes = (bytes) => {
    transferred += bytes;
    onProgress((transferred / size) * 100);
  };

  await Promise.all(
    ranges.map(({ start, end }) =>
      copyRange({
        sftpSource,
        sftpDest,
        sourcePath: item.sourcePath,
        destinationPath: item.destinationPath,
        start,
        end,
        onBytes,
      }),
    ),
  );

  return size;
};

const createRanges = (size, concurrency) => {
  const chunkSize = Math.ceil(size / concurrency);
  const ranges = [];

  for (let start = 0; start < size; start += chunkSize) {
    ranges.push({
      start,
      end: Math.min(start + chunkSize - 1, size - 1),
    });
  }

  return ranges;
};
/**
 * sftp → sftp (same server)
 *
 * Performs a server-side copy using rcopy, so file data never passes through
 * Node. Because rcopy does not expose byte-level progress, progress is
 * reported only after the copy completes.
 *
 * Remote destination directories are created lazily and cached for the
 * lifetime of the job.
 *
 * @param {object} item
 * @param {string} item.sourcePath - Full remote source path
 * @param {string} item.destinationPath - Full remote destination path
 * @param {number} item.size - Size discovered during expansion
 * @param {object} execution
 * @param {import("ssh2-sftp-client")} execution.sftpSource
 * @param {{ destDirs: Set<string> }} execution.context
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} Known file size in bytes
 */
const sftpSameServer = async (item, { sftpSource, context }, onProgress) => {
  await ensureRemoteDir(sftpSource, item.destinationPath, context.destDirs);

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
 * @returns {keyof typeof STRATEGIES}
 */
const selectStrategy = (sourceServerId, destServerId) => {
  const isLocalSource = sourceServerId === null;
  const isLocalDest = destServerId === null;

  if (isLocalSource) {
    return isLocalDest ? "localToLocal" : "localToSftp";
  }

  if (isLocalDest) {
    return "sftpToLocal";
  }

  return sourceServerId === destServerId ? "sftpSameServer" : "sftpCrossServer";
};

/**
 * Dispatches a file to the transfer strategy matching its source and
 * destination endpoints.
 *
 * The execution object contains the open SFTP connections for the current
 * source group plus job-scoped state such as destination-directory caches.
 *
 * @param {object} item - In-memory transfer item
 * @param {string|null} item.sourceServerId - Source server, or null for local
 * @param {string} item.sourcePath
 * @param {string} item.destinationPath
 * @param {string} item.filename
 * @param {number} item.size
 *
 * @param {object} execution
 * @param {import("ssh2-sftp-client")|null} execution.sftpSource
 * @param {import("ssh2-sftp-client")|null} execution.sftpDest
 * @param {string|null} execution.destServerId
 * @param {{
 *   destDirs: Set<string>
 * }} execution.context
 *
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} Actual transferred file size in bytes
 *
 * @throws {Error} If no strategy exists for the source/destination pair
 */
const dispatch = async ({ item, connections, onProgress }) => {
  const key = selectStrategy(
    item.sourceServerId,
    connections.destServerId,
  );

  const strategy = STRATEGIES[key];

  if (!strategy) throw new Error(`No strategy found for: ${key}`);

  return strategy(item, connections, onProgress);
};

module.exports = { dispatch, selectStrategy, STRATEGIES };
