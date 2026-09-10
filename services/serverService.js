const crypto = require("crypto");
const net = require("net");
const { encrypt, decrypt } = require("../controllers/encryption");
const { servers, shares, sshKeyStore } = require("../db");
const domain = process.env.HOSTNAME;
const { generateSshKeyPair } = require("./sshKeyGenerator");

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
  const link = `https://${domain}/share/${token}/${encodeURIComponent(fileName)}`;

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
 * Credentials and private key data are encrypted before storage.
 *
 * Supports password and private key authentication. For key authentication,
 * keyMode determines how the SSH key is obtained:
 * - "saved": Use an existing shared SSH key identified by keyId.
 * - "generate": Generate and store a new server-specific SSH key pair.
 * - "import": Import and store the private key provided in key.
 *
 * @param {string} host
 * @param {string} username
 * @param {string} [password] - Password for password authentication
 * @param {'password'|'key'} authType
 * @param {'saved'|'generate'|'import'} [keyMode] - How the SSH key is obtained for key authentication
 * @param {string} [keyId] - ID of an existing shared SSH key when keyMode is "saved"
 * @param {string} [key] - Private key contents when keyMode is "import"
 * @param {string} [passphrase] - Optional passphrase for an imported private key
 * @throws {Error} If required credentials are missing or authType/keyMode is unsupported
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
  validateServerInput({
    host,
    username,
    password,
    authType,
    keyId,
    key,
    keyMode,
  });

  const server = {
    host: host.trim(),
    username: username.trim(),
    authType,
    credentials: {},
  };

  let publicKey = null;

  if (authType === "password") {
    server.credentials.password = encrypt(password);
  }

  if (authType === "key") {
    const keyResult = await resolveServerKey({
      host: server.host,
      username: server.username,
      keyMode,
      keyId,
      key,
      passphrase,
    });

    server.keyId = keyResult.keyId;
    publicKey = keyResult.publicKey;
  }

  const savedServer = await servers.create(server);

  return {
    id: savedServer._id,
    host: savedServer.host,
    username: savedServer.username,
    authType: savedServer.authType,
    keyId: savedServer.keyId ?? null,
    publicKey,
  };
}

function validateServerInput({
  host,
  username,
  password,
  authType,
  keyId,
  key,
  keyMode,
}) {
  if (!host?.trim()) {
    throw new Error("Host is required");
  }

  if (!username?.trim()) {
    throw new Error("Username is required");
  }

  if (authType === "password") {
    if (!password) {
      throw new Error("Password required for password auth");
    }

    return;
  }

  if (authType !== "key") {
    throw new Error(`Unsupported authType: ${authType}`);
  }

  switch (keyMode) {
    case "saved":
      if (!keyId) {
        throw new Error("SSH key required for saved key auth");
      }
      break;

    case "generate":
      break;

    case "import":
      if (!key?.trim()) {
        throw new Error("Private key required for imported key auth");
      }
      break;

    default:
      throw new Error(`Unsupported keyMode: ${keyMode}`);
  }
}

async function resolveServerKey({
  host,
  username,
  keyMode,
  keyId,
  key,
  passphrase,
}) {
  switch (keyMode) {
    case "saved":
      return useSavedKey(keyId);

    case "generate":
      return generateServerKey(username, host);

    case "import":
      return importServerKey(username, host, key, passphrase);

    default:
      // validateServerInput should prevent this,
      // but keep the invariant protected here too.
      throw new Error(`Unsupported keyMode: ${keyMode}`);
  }
}

async function useSavedKey(keyId) {
  const sshKey = await sshKeyStore.findSharedById(keyId);

  if (!sshKey) {
    throw new Error(`SSH key not found: ${keyId}`);
  }

  return {
    keyId: sshKey._id,
    publicKey: sshKey.publicKey ?? null,
  };
}

async function generateServerKey(username, host) {
  const generated = await generateSshKeyPair();

  const sshKey = await sshKeyStore.create({
    name: `${username}@${host}`,
    scope: "server",
    privateKey: encrypt(generated.privateKey),
    publicKey: generated.publicKey,
  });

  return {
    keyId: sshKey._id,
    publicKey: generated.publicKey,
  };
}

async function importServerKey(username, host, privateKey, passphrase) {
  const sshKeyData = {
    name: `${username}@${host}`,
    scope: "server",
    privateKey: encrypt(normalizePrivateKey(privateKey)),
  };

  if (passphrase) {
    sshKeyData.passphrase = encrypt(passphrase);
  }

  const sshKey = await sshKeyStore.create(sshKeyData);

  return {
    keyId: sshKey._id,
    publicKey: sshKey.publicKey ?? null,
  };
}

function normalizePrivateKey(privateKey) {
  return privateKey.trim().replace(/\\n/g, "\n");
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
