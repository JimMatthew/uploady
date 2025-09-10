const { connectToSftp } = require("../services/sftpService");
const { complete } = require("../services/progressService");
const { streamFileSftpPair, streamFolderSftpToSftp, copySftpFolder } = require("../services/sftpTransferService");
const path = require("path");

async function sftp_copy_files_batch_json_post(req, res) {
  const { files, newPath, newServerId, transferId } = req.body;

  try {
    const grouped = {};
    for (const item of files) {
      const key = item.serverId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    for (const [serverId, fileGroup] of Object.entries(grouped)) {
      let sftpSource, sftpDest;

      if (!newServerId || newServerId === serverId) {
        // same server copy
        sftpSource = await connectToSftp(serverId);
        for (const file of fileGroup) {
          const sourcePath = path.join(file.path, file.file);
          const destPath = path.join(newPath, file.file);
          if (file.isDirectory) {
            await copySftpFolder(sftpSource, sourcePath, destPath);
          } else {
            await sftpSource.rcopy(sourcePath, destPath);
          }
        }
        await sftpSource.end();
      } else {
        // cross-server copy
        sftpSource = await connectToSftp(serverId);
        sftpDest = await connectToSftp(newServerId);

        for (const file of fileGroup) {
          const sourcePath = path.join(file.path, file.file);
          const destPath = path.join(newPath, file.file);
          if (file.isDirectory) {
            await streamFolderSftpToSftp(sftpSource, sftpDest, sourcePath, destPath, transferId);
          } else {
            await streamFileSftpPair(sftpSource, sftpDest, sourcePath, destPath, file.file, transferId);
          }
        }

        await sftpSource.end();
        await sftpDest.end();
      }
    }

    complete(transferId);
    res.status(200).send("Batch transfer complete");
  } catch (err) {
    console.error("Transfer failed:", err);
    res.status(500).send("Batch transfer failed");
  }
}

module.exports = { sftp_copy_files_batch_json_post };