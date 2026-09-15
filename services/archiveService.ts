import type { Readable } from "node:stream";
import yauzl from "yauzl";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZipEntryInfo {
  name: string;
  directory: boolean;
  compressedSize: number;
  size: number;
}

export interface ZipEntryStream {
  stream: Readable;
  size: number;
}

// ─── Archive Opening ──────────────────────────────────────────────────────────

/**
 * Opens a ZIP archive for lazy entry traversal.
 *
 * Entries are read explicitly with zipfile.readEntry(), and automatic
 * closing is disabled so callers can control the archive lifetime.
 */
function openZip(path: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      path,
      {
        lazyEntries: true,
        autoClose: false,
      },
      (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error("Failed to open ZIP archive"));
          return;
        }

        resolve(zipfile);
      },
    );
  });
}

// ─── Directory Listing ────────────────────────────────────────────────────────

/**
 * Lists all entries contained in a ZIP archive.
 *
 * Returns metadata for both files and directories. Entry contents are
 * not read or decompressed.
 */
export async function listZip(path: string): Promise<ZipEntryInfo[]> {
  const zipfile = await openZip(path);

  return new Promise<ZipEntryInfo[]>((resolve, reject) => {
    const entries: ZipEntryInfo[] = [];

    zipfile.on("entry", (entry: yauzl.Entry) => {
      entries.push({
        name: entry.fileName,
        directory: entry.fileName.endsWith("/"),
        compressedSize: entry.compressedSize,
        size: entry.uncompressedSize,
      });

      zipfile.readEntry();
    });

    zipfile.on("end", () => {
      zipfile.close();
      resolve(entries);
    });

    zipfile.on("error", (err: Error) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}

// ─── Entry Reading ────────────────────────────────────────────────────────────

/**
 * Reads a single file entry from a ZIP archive into memory.
 */
export async function readZipEntry(
  path: string,
  entryName: string,
): Promise<Buffer> {
  const zipfile = await openZip(path);

  return new Promise<Buffer>((resolve, reject) => {
    let found = false;

    zipfile.on("entry", (entry: yauzl.Entry) => {
      if (entry.fileName !== entryName) {
        zipfile.readEntry();
        return;
      }

      found = true;

      if (entry.fileName.endsWith("/")) {
        zipfile.close();

        reject(new Error("Cannot read a directory entry"));

        return;
      }

      zipfile.openReadStream(entry, (err, stream) => {
        if (err) {
          zipfile.close();
          reject(err);
          return;
        }

        if (!stream) {
          zipfile.close();

          reject(new Error("Failed to open ZIP entry stream"));

          return;
        }

        const chunks: Buffer[] = [];

        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on("end", () => {
          zipfile.close();

          resolve(Buffer.concat(chunks));
        });

        stream.on("error", (err: Error) => {
          zipfile.close();
          reject(err);
        });
      });
    });

    zipfile.on("end", () => {
      if (!found) {
        zipfile.close();

        reject(new Error("Archive entry not found"));
      }
    });

    zipfile.on("error", (err: Error) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}

// ─── Entry Streaming ──────────────────────────────────────────────────────────

/**
 * Opens a readable stream for a single file entry in a ZIP archive.
 *
 * The ZIP archive remains open for the lifetime of the entry stream and
 * is closed when the stream ends or encounters an error.
 */
export async function streamZipEntry(
  path: string,
  entryName: string,
): Promise<ZipEntryStream> {
  const zipfile = await openZip(path);

  return new Promise<ZipEntryStream>((resolve, reject) => {
    let found = false;

    zipfile.on("entry", (entry: yauzl.Entry) => {
      if (entry.fileName !== entryName) {
        zipfile.readEntry();
        return;
      }

      found = true;

      if (entry.fileName.endsWith("/")) {
        zipfile.close();

        reject(new Error("Cannot stream a directory entry"));

        return;
      }

      zipfile.openReadStream(entry, (err, stream) => {
        if (err) {
          zipfile.close();
          reject(err);
          return;
        }

        if (!stream) {
          zipfile.close();

          reject(new Error("Failed to open ZIP entry stream"));

          return;
        }

        stream.once("end", () => {
          zipfile.close();
        });

        stream.once("error", () => {
          zipfile.close();
        });

        resolve({
          stream,
          size: entry.uncompressedSize,
        });
      });
    });

    zipfile.on("end", () => {
      if (!found) {
        zipfile.close();

        reject(new Error("Archive entry not found"));
      }
    });

    zipfile.on("error", (err: Error) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}
