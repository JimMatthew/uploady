const yauzl = require("yauzl");

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

async function streamZipEntry(
  path,
  entryName,
) {
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

        reject(
          new Error(
            "Cannot stream a directory entry",
          ),
        );

        return;
      }

      zipfile.openReadStream(
        entry,
        (err, stream) => {
          if (err) {
            zipfile.close();
            reject(err);
            return;
          }

          //
          // Important:
          // don't close the ZIP until the
          // entry stream has finished.
          //
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
        },
      );
    });

    zipfile.on("end", () => {
      if (!found) {
        zipfile.close();

        reject(
          new Error(
            "Archive entry not found",
          ),
        );
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
  streamZipEntry
};
