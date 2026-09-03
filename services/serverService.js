const crypto = require("crypto");
const net = require("net");
const { encrypt, decrypt } = require("../controllers/encryption");
const { servers, shares, sshKeyStore } = require("../db");

const domain = process.env.HOSTNAME;
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { generateSshKeyPair } = require("./sshKeyGenerator");
const execFileAsync = promisify(execFile);

// ─── Share Links ──────────────────────────────────────────────────────────────

/**
 * Creates a shareable link for a file on a remote SFTP server.
 * When the link is accessed the backend streams the file directly
 * from the SFTP server to the requesting client without storing it locally.
 * @param {string} fileName
 * @param {string} filePath - Remote path on the SFTP server
 * @param {string} serverId
 * @returns {Promise<{ link: string }>}
 */
async function share_file(fileName, filePath, serverId) {
  const existing = await shares.findRemoteShare(fileName, filePath, serverId);

  if (existing) return { link: existing.link };

  const server = await servers.findById(serverId);
  const token = crypto.randomBytes(5).toString("hex");
  const link = `https://${domain}/share/${token}/${fileName}`;

  await shares.create({
    fileName,
    filePath,
    link,
    token,
    isRemote: true,
    serverId,
    ...(server && { serverName: server.host }),
  });
  return { link };
}

// ─── Server Management ────────────────────────────────────────────────────────

/**
 * Saves a new SFTP server configuration to the database.
 * Credentials are encrypted before storage.
 * Supports password and private key authentication.
 * @param {string} host
 * @param {string} username
 * @param {string} [password]
 * @param {'password'|'key'} authType
 * @param {string} [key] - Private key contents for key auth
 * @param {string} [passphrase] - Optional passphrase for the private key
 * @throws {Error} If required credentials are missing for the given authType
 */
async function save_server({
  host,
  username,
  password,
  authType,
  keyId,
  key,
  passphrase,
  keyMode,
}) {
  const server = {
    host,
    username,
    authType,
    credentials: {},
  };

  let publicKey = null;

  if (authType === "password") {
    if (!password) {
      throw new Error("Password required for password auth");
    }

    server.credentials.password = encrypt(password);
  } else if (authType === "key") {
    if (keyMode === "saved") {
      if (!keyId) {
        throw new Error("SSH key required for key auth");
      }

      const sshKey = await sshKeyStore.findSharedById(keyId);

      if (!sshKey) {
        throw new Error("SSH key not found");
      }

      server.keyId = sshKey._id;
      publicKey = sshKey.publicKey ?? null;
    } else if (keyMode === "generate") {
      const generated = await generateSshKeyPair();

      const sshKey = await sshKeyStore.create({
        name: `${username}@${host}`,
        scope: "server",
        privateKey: encrypt(generated.privateKey),
        publicKey: generated.publicKey,
      });

      server.keyId = sshKey._id;

      // Preserve value for API response.
      publicKey = generated.publicKey;
    } else if (keyMode === "import") {
      if (!key) {
        throw new Error("Private key required for key auth");
      }

      const sshKeyData = {
        name: `${username}@${host}`,
        scope: "server",
        privateKey: encrypt(key),
      };

      if (passphrase) {
        sshKeyData.passphrase = encrypt(passphrase);
      }

      const sshKey = await SshKey.create(sshKeyData);

      server.keyId = sshKey._id;
    } else {
      throw new Error(`Unsupported keyMode: ${keyMode}`);
    }
  } else {
    throw new Error(`Unsupported authType: ${authType}`);
  }

  const savedServer = await servers.create(server);

  return {
    id: savedServer._id,
    host: savedServer.host,
    username: savedServer.username,
    authType: savedServer.authType,
    keyId: savedServer.keyId ?? null,

    // Keep old frontend contract working.
    publicKey,
  };
}

/**
 * Checks whether a server is reachable by attempting a TCP connection on port 22.
 * Resolves to "online" if the connection succeeds within 5 seconds, "offline" otherwise.
 * @param {string} serverId
 * @param {number} [port=22]
 * @returns {Promise<'online'|'offline'>}
 */
const checkServerStatus = async (serverId, port = 22) => {
  const server = await servers.findById(serverId);
  if (!server) return "offline";

  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(5000);

    socket
      .connect(port, server.host, () => {
        socket.end();
        resolve("online");
      })
      .on("error", () => resolve("offline"))
      .on("timeout", () => {
        socket.destroy();
        resolve("offline");
      });
  });
};

// ─── Connection Options ───────────────────────────────────────────────────────
/**
 * Retrieves the connection options for a saved SFTP server.
 *
 * Password credentials are decrypted directly from the server record.
 * For key authentication, the referenced SSH key is loaded from the
 * key store and its private key and optional passphrase are decrypted.
 *
 * Returns an options object ready to pass directly to
 * ssh2-sftp-client.connect().
 *
 * @param {string} serverId - ID of the saved server.
 * @returns {Promise<{
 *   host: string,
 *   port: number,
 *   username: string,
 *   password?: string,
 *   privateKey?: string,
 *   passphrase?: string
 * }>}
 * @throws {Error} If the server is not found.
 * @throws {Error} If the required password credential is missing.
 * @throws {Error} If the server has no SSH key reference.
 * @throws {Error} If the referenced SSH key is not found.
 * @throws {Error} If the server has an invalid authentication type.
 */
const getServerOptions = async (serverId) => {
  const server = await servers.findById(serverId);

  if (!server) {
    throw new Error(`Server not found: ${serverId}`);
  }

  const options = {
    host: server.host,
    port: server.port ?? 22,
    username: server.username,
  };

  if (server.authType === "password") {
    if (!server.credentials?.password) {
      throw new Error(`Password missing for server: ${serverId}`);
    }

    options.password = decrypt(server.credentials.password);
  } else if (server.authType === "key") {
    if (!server.keyId) {
      throw new Error(`SSH key reference missing for server: ${serverId}`);
    }

    const sshKey = await sshKeyStore.findById(server.keyId);

    if (!sshKey) {
      throw new Error(`SSH key not found for server: ${serverId}`);
    }

    let privateKey = decrypt(sshKey.privateKey).trim();

    // Normalize escaped newlines that may have been
    // introduced during import/storage.
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    options.privateKey = privateKey;

    if (sshKey.passphrase?.iv) {
      options.passphrase = decrypt(sshKey.passphrase);
    }
  } else {
    throw new Error(
      `Invalid authType on server ${serverId}: ${server.authType}`,
    );
  }

  return options;
};

/**
 * Returns the public SSH key associated with a saved server.
 *
 * Returns null when the server does not use key authentication or
 * does not have an SSH key reference. The private key and passphrase
 * are never returned by this operation.
 *
 * @param {string} serverId - ID of the saved server.
 * @returns {Promise<string|null>} The server's public SSH key,
 * or null if no public key is associated with the server.
 * @throws {Error} If the server is not found.
 * @throws {Error} If the referenced SSH key is not found.
 */
const getServerPublicKey = async (serverId) => {
  const server = await servers.findById(serverId);

  if (!server) {
    throw new Error("Server not found");
  }

  if (server.authType !== "key") {
    return null;
  }

  if (!server.keyId) {
    return null;
  }

  const sshKey = await sshKeyStore.findById(server.keyId);

  if (!sshKey) {
    throw new Error(`SSH key not found for server: ${serverId}`);
  }

  return sshKey.publicKey ?? null;
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  share_file,
  save_server,
  checkServerStatus,
  getServerOptions,
  getServerPublicKey,
};
