import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import type SftpClient from "ssh2-sftp-client";
import * as archiveService from "./archiveService";
import type { InMemoryTransferItem } from "../types/transferTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProgressCallback = (percent: number) => void;

interface TransferContext {
  destDirs: Set<string>;
}

export interface TransferConnections {
  sftpSource: SftpClient | null;
  sftpDest: SftpClient | null;
  destServerId: string | null;
  context: TransferContext;
}

export interface DispatchOptions {
  item: InMemoryTransferItem;
  connections: TransferConnections;
  onProgress: ProgressCallback;
}

interface LocalSourceConnections {
  context: TransferContext;
}

interface LocalToSftpConnections {
  sftpDest: SftpClient;
  context: TransferContext;
}

interface SftpToLocalConnections {
  sftpSource: SftpClient;
  context: TransferContext;
}

interface SftpSameServerConnections {
  sftpSource: SftpClient;
  context: TransferContext;
}

interface SftpCrossServerConnections {
  sftpSource: SftpClient;
  sftpDest: SftpClient;
  context: TransferContext;
}

interface ArchiveToSftpConnections {
  sftpDest: SftpClient;
  context: TransferContext;
}

interface ByteRange {
  start: number;
  end: number;
}

interface CopyRangeOptions {
  sftpSource: SftpClient;
  sftpDest: SftpClient;
  sourcePath: string;
  destinationPath: string;
  start: number;
  end: number;
  onBytes: (bytes: number) => void;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * Returns a data handler that tracks bytes flowing through a stream and
 * reports progress via onProgress at most once every 100ms.
 *
 * Throttling prevents flooding the event emitter on fast local transfers
 * where chunks arrive faster than the SSE client can consume events.
 */
function trackProgress(
  totalSize: number,
  onProgress: ProgressCallback,
): (chunk: Buffer) => void {
  let transferred = 0;
  let lastUpdate = Date.now();

  return (chunk: Buffer): void => {
    transferred += chunk.length;

    const now = Date.now();

    if (now - lastUpdate > 100) {
      lastUpdate = now;

      onProgress(Math.min((transferred / totalSize) * 100, 100));
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensures the parent directory for a local destination exists.
 *
 * Successfully ensured directories are cached for the current job. A path is
 * added only after mkdir succeeds, so failed attempts may be retried.
 */
async function ensureLocalDir(
  filePath: string,
  cache: Set<string>,
): Promise<void> {
  const dir = path.dirname(filePath);

  if (cache.has(dir)) {
    return;
  }

  await fs.promises.mkdir(dir, {
    recursive: true,
  });

  cache.add(dir);
}

/**
 * Ensures the parent directory for a remote destination exists.
 *
 * The cache is job-scoped, and each job has only one destination endpoint,
 * so the remote directory path itself is sufficient as the cache key.
 */
async function ensureRemoteDir(
  sftp: SftpClient,
  filePath: string,
  cache: Set<string>,
): Promise<void> {
  const dir = path.posix.dirname(filePath);

  if (cache.has(dir)) {
    return;
  }

  await sftp.mkdir(dir, true);

  cache.add(dir);
}

// ---------------------------------------------------------------------------
// Local -> Local
// ---------------------------------------------------------------------------

/**
 * Copies a file within the local filesystem using a PassThrough stream
 * for byte-level progress tracking.
 */
async function localToLocal(
  item: InMemoryTransferItem,
  { context }: LocalSourceConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  const stat = await fs.promises.stat(item.sourcePath);

  await ensureLocalDir(item.destinationPath, context.destDirs);

  const passthrough = new PassThrough();

  passthrough.on("data", trackProgress(stat.size, onProgress));

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(item.sourcePath)
      .pipe(passthrough)
      .pipe(fs.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  return stat.size;
}

// ---------------------------------------------------------------------------
// Local -> SFTP
// ---------------------------------------------------------------------------

/**
 * Streams a local file to a remote SFTP destination.
 */
async function localToSftp(
  item: InMemoryTransferItem,
  { sftpDest, context }: LocalToSftpConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  const stat = await fs.promises.stat(item.sourcePath);

  await ensureRemoteDir(sftpDest, item.destinationPath, context.destDirs);

  const passthrough = new PassThrough();

  passthrough.on("data", trackProgress(stat.size, onProgress));

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(item.sourcePath)
      .pipe(passthrough)
      .pipe(sftpDest.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("close", resolve)
      .on("error", reject);
  });

  return stat.size;
}

// ---------------------------------------------------------------------------
// SFTP -> Local
// ---------------------------------------------------------------------------

/**
 * Transfers a remote file to the local filesystem using fastGet.
 */
async function sftpToLocal(
  item: InMemoryTransferItem,
  { sftpSource, context }: SftpToLocalConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  await ensureLocalDir(item.destinationPath, context.destDirs);

  await sftpSource.fastGet(item.sourcePath, item.destinationPath, {
    step: (transferred: number, _chunk: number, total: number) => {
      if (total > 0) {
        onProgress((transferred / total) * 100);
      }
    },
  });

  const stat = await fs.promises.stat(item.destinationPath);

  return stat.size;
}

// ---------------------------------------------------------------------------
// SFTP Range Copy
// ---------------------------------------------------------------------------

/**
 * Copies a byte range from a source file to a destination file using SFTP.
 */
async function copyRange({
  sftpSource,
  sftpDest,
  sourcePath,
  destinationPath,
  start,
  end,
  onBytes,
}: CopyRangeOptions): Promise<void> {
  const readStream = sftpSource.createReadStream(sourcePath, {
    start,
    end,
  });

  const writeStream = sftpDest.createWriteStream(destinationPath, {
    flags: "r+",
    start,
  });

  readStream.on("data", (chunk: Buffer) => {
    onBytes(chunk.length);
  });

  await pipeline(readStream, writeStream);
}

/**
 * Creates or truncates an empty destination file over SFTP.
 */
async function createDestinationFile(
  sftpDest: SftpClient,
  destinationPath: string,
): Promise<void> {
  const stream = sftpDest.createWriteStream(destinationPath, {
    flags: "w",
  });

  await new Promise<void>((resolve, reject) => {
    stream.on("close", resolve);
    stream.on("error", reject);
    stream.end();
  });
}

/**
 * Splits a file into byte ranges for parallel transfer.
 */
function createRanges(size: number, concurrency: number): ByteRange[] {
  const chunkSize = Math.ceil(size / concurrency);
  const ranges: ByteRange[] = [];

  for (let start = 0; start < size; start += chunkSize) {
    ranges.push({
      start,

      end: Math.min(start + chunkSize - 1, size - 1),
    });
  }

  return ranges;
}

/**
 * Determines the number of parallel byte ranges used for a cross-server
 * SFTP transfer.
 */
function getTransferConcurrency(size: number): number {
  const PARALLEL_THRESHOLD = 1024 * 1024;

  return size >= PARALLEL_THRESHOLD ? 2 : 1;
}

// ---------------------------------------------------------------------------
// SFTP -> SFTP (Cross Server)
// ---------------------------------------------------------------------------

// TODO: Investigate request-level SFTP pipelining for cross-server transfers.
// The current two-stream implementation performs significantly better than a
// single stream. Further improvement may be possible by using the underlying
// ssh2 SFTP read/write API to keep multiple positional requests in flight.

/**
 * Copies a file between two remote servers through Uploady.
 *
 * The source and destination servers do not require direct connectivity.
 */
async function sftpCrossServer(
  item: InMemoryTransferItem,
  { sftpSource, sftpDest, context }: SftpCrossServerConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  const { size } = await sftpSource.stat(item.sourcePath);

  await ensureRemoteDir(sftpDest, item.destinationPath, context.destDirs);
  await createDestinationFile(sftpDest, item.destinationPath);

  if (size === 0) {
    onProgress(100);
    return 0;
  }

  const concurrency = getTransferConcurrency(size);
  const ranges = createRanges(size, concurrency);

  let transferred = 0;

  const onBytes = (bytes: number): void => {
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
}

// ---------------------------------------------------------------------------
// SFTP -> SFTP (Same Server)
// ---------------------------------------------------------------------------

/**
 * Performs a server-side copy using rcopy.
 *
 * File data never passes through Uploady.
 */
async function sftpSameServer(
  item: InMemoryTransferItem,
  { sftpSource, context }: SftpSameServerConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  await ensureRemoteDir(sftpSource, item.destinationPath, context.destDirs);

  await sftpSource.rcopy(item.sourcePath, item.destinationPath);

  onProgress(100);

  return item.size;
}

// ---------------------------------------------------------------------------
// Archive -> Local
// ---------------------------------------------------------------------------

/**
 * Streams a ZIP archive entry directly to the local filesystem.
 */
async function archiveToLocal(
  item: InMemoryTransferItem,
  { context }: LocalSourceConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  if (!item.archivePath) {
    throw new Error(`Missing archivePath for transfer item ${item.itemId}`);
  }

  await ensureLocalDir(item.destinationPath, context.destDirs);

  const { stream, size } = await archiveService.streamZipEntry(
    item.archivePath,
    item.sourcePath,
  );

  const passthrough = new PassThrough();

  passthrough.on("data", trackProgress(size, onProgress));

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(passthrough)
      .pipe(fs.createWriteStream(item.destinationPath))
      .on("finish", resolve)
      .on("error", reject);
  });

  return size;
}

// ---------------------------------------------------------------------------
// Archive -> SFTP
// ---------------------------------------------------------------------------

/**
 * Streams a ZIP archive entry directly to an SFTP destination.
 */
async function archiveToSftp(
  item: InMemoryTransferItem,
  { sftpDest, context }: ArchiveToSftpConnections,
  onProgress: ProgressCallback,
): Promise<number> {
  if (!item.archivePath) {
    throw new Error(`Missing archivePath for transfer item ${item.itemId}`);
  }

  const { stream, size } = await archiveService.streamZipEntry(
    item.archivePath,
    item.sourcePath,
  );

  await ensureRemoteDir(sftpDest, item.destinationPath, context.destDirs);

  const passthrough = new PassThrough();

  passthrough.on("data", trackProgress(size, onProgress));

  const source = stream.pipe(passthrough);

  await sftpDest.put(source, item.destinationPath);

  return size;
}

// ---------------------------------------------------------------------------
// Strategy Selection
// ---------------------------------------------------------------------------

/**
 * Determines which transfer strategy applies for a given source and
 * destination.
 */
export function selectStrategy(
  sourceType: InMemoryTransferItem["sourceType"],
  sourceServerId: string | null,
  destServerId: string | null,
): TransferStrategyName {
  const isLocalDest = destServerId === null;

  if (sourceType === "archive") {
    return isLocalDest ? "archiveToLocal" : "archiveToSftp";
  }

  const isLocalSource = sourceServerId === null;

  if (isLocalSource) {
    return isLocalDest ? "localToLocal" : "localToSftp";
  }

  if (isLocalDest) {
    return "sftpToLocal";
  }

  return sourceServerId === destServerId ? "sftpSameServer" : "sftpCrossServer";
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function requiredConnection<T>(value: T | null, name: string): T {
  if (value === null) {
    throw new Error(`Missing ${name} SFTP connection`);
  }

  return value;
}

export type TransferStrategyName =
  | "localToLocal"
  | "localToSftp"
  | "sftpToLocal"
  | "sftpSameServer"
  | "sftpCrossServer"
  | "archiveToLocal"
  | "archiveToSftp";
/**
 * Dispatches a file to the transfer strategy matching its source and
 * destination endpoints.
 */
export async function dispatch({
  item,
  connections,
  onProgress,
}: DispatchOptions): Promise<number> {
  const run = <TConnections extends object>(
    strategy: (
      item: InMemoryTransferItem,
      connections: TConnections & {
        context: TransferContext;
      },
      onProgress: ProgressCallback,
    ) => Promise<number>,
    strategyConnections: TConnections,
  ): Promise<number> => {
    return strategy(
      item,
      {
        ...strategyConnections,
        context: connections.context,
      },
      onProgress,
    );
  };

  const strategies = {
    localToLocal: () => run(localToLocal, {}),

    localToSftp: () =>
      run(localToSftp, {
        sftpDest: requiredConnection(connections.sftpDest, "destination"),
      }),

    sftpToLocal: () =>
      run(sftpToLocal, {
        sftpSource: requiredConnection(connections.sftpSource, "source"),
      }),

    sftpSameServer: () =>
      run(sftpSameServer, {
        sftpSource: requiredConnection(connections.sftpSource, "source"),
      }),

    sftpCrossServer: () =>
      run(sftpCrossServer, {
        sftpSource: requiredConnection(connections.sftpSource, "source"),
        sftpDest: requiredConnection(connections.sftpDest, "destination"),
      }),

    archiveToLocal: () => run(archiveToLocal, {}),

    archiveToSftp: () =>
      run(archiveToSftp, {
        sftpDest: requiredConnection(connections.sftpDest, "destination"),
      }),
  } satisfies Record<TransferStrategyName, () => Promise<number>>;

  const key = selectStrategy(
    item.sourceType,
    item.sourceServerId,
    connections.destServerId,
  );

  return strategies[key]();
}
