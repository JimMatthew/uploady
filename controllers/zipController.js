const sftpService = require("../services/sftpService");

const zipDownload = async (req, res) => {
  const { files } = req.body;
  if (!files?.length)
    return res.status(400).json({ error: "No files provided" });

  const timestamp = Date.now();
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="uploady-${timestamp}.zip"`,
  );

  try {
    await sftpService.zipClipboardFiles(files, res);
  } catch (err) {
    console.error("Zip clipboard error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create zip" });
    }
  }
};

module.exports = {
  zipDownload,
};
