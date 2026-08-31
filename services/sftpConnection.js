const SftpClient = require("ssh2-sftp-client");
const serverService = require("./serverService");

/**
 * Connects to an SFTP server and returns the client instance.
 * Caller is responsible for calling sftp.end() when done.
 *
 * @param {string} serverId
 * @returns {Promise<import("ssh2-sftp-client")>}
 */
const connectToSftp = async (serverId) => {
  const sftp = new SftpClient();
  const options = await serverService.getServerOptions(serverId);

  await sftp.connect(options);

  return sftp;
};

module.exports = {
  connectToSftp,
};