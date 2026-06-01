const fs = require("fs");
const path = require("path");
const { PassThrough } = require("stream");
const { streamFileSftpPair } = require("./sftpTransferService");


// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const ensureLocalDir = (filePath) =>
  fs.promises.mkdir(path.dirname(filePath), { recursive: true });

const ensureRemoteDir = (sftp, filePath) =>
  sftp.mkdir(path.posix.dirname(filePath), true).catch(() => {});

// ─── Strategies ───────────────────────────────────────────────────────────────

/**
 * local → local
 */
const localToLocal = async (item, _connections, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath);

  const passthrough = new PassThrough();
  const track = trackProgress(stat.size, onProgress);
  passthrough.on("data", track);

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
 */
const localToSftp = async (item, { sftpDest }, onProgress) => {
  const stat = await fs.promises.stat(item.sourcePath);
  await ensureRemoteDir(sftpDest, item.destinationPath);

  const readStream = fs.createReadStream(item.sourcePath);
  const writeStream = sftpDest.createWriteStream(item.destinationPath);
  const passthrough = new PassThrough();
  const track = trackProgress(stat.size, onProgress);
  passthrough.on("data", track);

  await new Promise((resolve, reject) => {
    readStream
      .pipe(passthrough)
      .pipe(writeStream)
      .on("finish", resolve)
      .on("close", resolve)
      .on("error", reject);
  });

  return stat.size;
};

/**
 * sftp → local
 */
const sftpToLocal = async (item, { sftpSource }, onProgress) => {
  const stat = await sftpSource.stat(item.sourcePath);
  await ensureLocalDir(item.destinationPath);

  const passthrough = new PassThrough();
  const track = trackProgress(stat.size, onProgress);
  passthrough.on("data", track);

  sftpSource.get(item.sourcePath, passthrough).catch((err) => passthrough.destroy(err));

  await new Promise((resolve, reject) => {
    passthrough
      .pipe(fs.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  return stat.size;
};

/**
 * sftp → sftp (same server, server-side rcopy)
 */
const sftpSameServer = async (item, { sftpSource }, onProgress) => {
  await sftpSource.rcopy(item.sourcePath, item.destinationPath);
  onProgress(100);
  return item.size;
};

/**
 * sftp → sftp (cross server, streamed through node)
 */
const sftpCrossServer = async (item, { sftpSource, sftpDest }, onProgress) => {
  const { size } = await sftpSource.stat(item.sourcePath);
  await ensureRemoteDir(sftpDest, item.destinationPath);
  await streamFileSftpPair(
    sftpSource,
    sftpDest,
    item.sourcePath,
    item.destinationPath,
    item.filename,
    onProgress,
  );
  return size;
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
 * Selects the correct transfer strategy for an item.
 * Returns the strategy key and a human readable label.
 * @param {string} sourceServerId - "null" string means local
 * @param {string|null} destServerId - null means local
 * @returns {{ key: string, label: string }}
 */
const selectStrategy = (sourceServerId, destServerId) => {
  const isLocalSource = sourceServerId === "null";
  const isLocalDest = !destServerId;
  const isSameServer = !isLocalSource && !isLocalDest && sourceServerId === destServerId;

  if (isLocalSource && isLocalDest)  return { key: "localToLocal",    label: "local → local" };
  if (isLocalSource && !isLocalDest) return { key: "localToSftp",     label: "local → sftp" };
  if (!isLocalSource && isLocalDest) return { key: "sftpToLocal",     label: "sftp → local" };
  if (isSameServer)                  return { key: "sftpSameServer",  label: "sftp → sftp (same)" };
  return                                    { key: "sftpCrossServer", label: "sftp → sftp (cross)" };
};

/**
 * Dispatches a single file transfer to the correct strategy.
 * Returns the discovered file size.
 * @param {object} item - In-memory transfer item
 * @param {{ sftpSource, sftpDest }} connections - Open SFTP connections (null if local)
 * @param {(percent: number) => void} onProgress
 * @returns {Promise<number>} discovered size in bytes
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