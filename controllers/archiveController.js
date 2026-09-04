const archiveService = require("../services/archiveService");

const { resolveLocalPath } = require("../services/localFileService");

async function listLocalArchive(req, res) {
  try {
    const archivePath = resolveLocalPath(req.query.path);

    const entries = await archiveService.listZip(archivePath);

    res.json({
      entries,
    });
  } catch (err) {
    console.error("Failed to open archive:", err);

    res.status(500).json({
      error: "Failed to open archive",
    });
  }
}

async function getLocalArchiveEntry(req, res) {
  try {
    const archivePath = resolveLocalPath(req.query.path);

    const entryName = req.query.entry;

    if (!entryName) {
      return res.status(400).json({
        error: "Archive entry is required",
      });
    }

    const data = await archiveService.readZipEntry(archivePath, entryName);

    res.type("application/octet-stream");
    res.send(data);
  } catch (err) {
    console.error("Failed to read archive entry:", err);

    res.status(500).json({
      error: "Failed to read archive entry",
    });
  }
}

module.exports = {
  listLocalArchive,
  getLocalArchiveEntry,
};
