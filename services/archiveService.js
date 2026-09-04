const yauzl = require("yauzl");

/**
 * Opens a ZIP archive for lazy entry traversal.
 *
 * Entries are read explicitly with zipfile.readEntry(), and automatic
 * closing is disabled so callers can control the archive lifetime.
 *
 * @param {string} path - Filesystem path to the ZIP archive.
 * @returns {Promise<Object>} Open yauzl ZipFile instance.
 */
function openZip(path) {
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

        resolve(zipfile);
      },
    );
  });
}

/**
 * Lists all entries contained in a ZIP archive.
 *
 * Returns metadata for both files and directories. Entry contents are
 * not read or decompressed.
 *
 * @param {string} path - Filesystem path to the ZIP archive.
 * @returns {Promise<Array<{
 *   name: string,
 *   directory: boolean,
 *   compressedSize: number,
 *   size: number
 * }>>} Metadata for each entry in the archive.
 */
async function listZip(path) {
  const zipfile = await openZip(path);

  return new Promise((resolve, reject) => {
    const entries = [];

    zipfile.on("entry", (entry) => {
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

    zipfile.on("error", (err) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}

/**
 * Reads a single file entry from a ZIP archive into memory.
 *
 * The entry is fully decompressed and collected into a Buffer before
 * the promise resolves. This is useful when the complete contents are
 * needed at once, but should be avoided for large entries where
 * streaming is more appropriate.
 *
 * Directory entries cannot be read and will cause the promise to reject.
 *
 * @param {string} path - Filesystem path to the ZIP archive.
 * @param {string} entryName - Full entry path within the archive.
 * @returns {Promise<Buffer>} Decompressed contents of the archive entry.
 * @throws {Error} If the entry does not exist or refers to a directory.
 */
async function readZipEntry(path, entryName) {
  const zipfile = await openZip(path);

  return new Promise((resolve, reject) => {
    let found = false;

    zipfile.on("entry", (entry) => {
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

        const chunks = [];

        stream.on("data", (chunk) => {
          chunks.push(chunk);
        });

        stream.on("end", () => {
          zipfile.close();

          resolve(Buffer.concat(chunks));
        });

        stream.on("error", (err) => {
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

    zipfile.on("error", (err) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}

/**
 * Opens a readable stream for a single file entry in a ZIP archive.
 *
 * The returned stream emits the decompressed entry contents without
 * buffering the complete file in memory. The ZIP archive remains open
 * for the lifetime of the entry stream and is closed when the stream
 * ends or encounters an error.
 *
 * The returned size is the uncompressed size of the entry and can be
 * used for transfer accounting and progress reporting.
 *
 * Directory entries cannot be streamed and will cause the promise
 * to reject.
 *
 * @param {string} path - Filesystem path to the ZIP archive.
 * @param {string} entryName - Full entry path within the archive.
 * @returns {Promise<{
 *   stream: import("stream").Readable,
 *   size: number
 * }>} Entry stream and its uncompressed size in bytes.
 * @throws {Error} If the entry does not exist or refers to a directory.
 */
async function streamZipEntry(path, entryName) {
  const zipfile = await openZip(path);

  return new Promise((resolve, reject) => {
    let found = false;

    zipfile.on("entry", (entry) => {
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

    zipfile.on("error", (err) => {
      zipfile.close();
      reject(err);
    });

    zipfile.readEntry();
  });
}

module.exports = {
  listZip,
  readZipEntry,
  streamZipEntry,
};
