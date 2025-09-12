const path = require("path");
const SftpServer = require("../models/SftpServer");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");

const domain = process.env.HOSTNAME;
async function share_file(fileName, filePath, serverId) {
  const token = crypto.randomBytes(5).toString("hex");
  const link = `https://${domain}/share/${token}/${fileName}`;
  const server = await SftpServer.findById(serverId);

  const sharedFile = new SharedFile({
    fileName,
    filePath,
    link,
    token,
    isRemote: true,
    serverId,
    ...(server && { serverName: server.host }),
  });
  await sharedFile.save();
  return { link };
}

module.exports = {
  share_file,
};
