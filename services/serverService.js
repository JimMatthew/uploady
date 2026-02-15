const SftpServer = require("../models/SftpServer");
const crypto = require("crypto");
const SharedFile = require("../models/SharedFile");
const net = require("net");
const { encrypt, decrypt } = require("../controllers/encryption");
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

async function save_server(
  host,
  username,
  password,
  authType,
  key,
  passphrase
) {
  const server = {
    host,
    username,
    authType,
    credentials: {},
  };
  if (authType === "password") {
    if (!password) {
      return handleError(res, "Password required for password auth", 400);
    }
    server.credentials.password = encrypt(password);
  } else if (authType === "key") {
    if (!key) {
      return handleError(res, "Key required for key Auth", 400);
    }
    server.credentials.privateKey = encrypt(key);
    if (passphrase) {
      server.credentials.passphrase = encrypt(passphrase);
    }
  }
  const newServer = new SftpServer(server);
  await newServer.save();
}

const checkServerStatus = async (serverId, port = 22) => {
  const server = await SftpServer.findById(serverId);
  return new Promise((resolve) => {
    if (!server) resolve("offline");
    const socket = new net.Socket();
    socket.setTimeout(5000); // Set timeout to 5 seconds
    socket
      .connect(port, server.host, () => {
        socket.end();
        resolve("online");
      })
      .on("error", () => {
        resolve("offline");
      })
      .on("timeout", () => {
        socket.destroy();
        resolve("offline");
      });
  });
};

const getServerOptions = async (serverId) => {
  const server = await SftpServer.findById(serverId);
  if (!server) throw new Error("Server not found");

  const options = {
    host: server.host,
    port: 22,
    username: server.username,
  };

  if (server.authType === "password") {
    options.password = decrypt(server.credentials.password);
  } else if (server.authType === "key") {
    let privateKey = decrypt(server.credentials.privateKey).trim();

    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }
    options.privateKey = privateKey;

    const passphrase =
      server.credentials.passphrase && server.credentials.passphrase.iv
        ? decrypt(server.credentials.passphrase)
        : undefined;

    if (passphrase) options.passphrase = passphrase;
  } else {
     throw new Error("Invalid server options");
  }
  return options;
};

module.exports = {
  share_file,
  checkServerStatus,
  save_server,
  getServerOptions,
};
