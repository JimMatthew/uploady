import crypto from "node:crypto";
import net from "node:net";
import { encrypt, decrypt } from "../controllers/encryption";
import { servers, shares, sshKeyStore } from "../db";
import { generateSshKeyPair } from "./sshKeyGenerator";
import type { CreateServerData } from "../db/stores/serverStore";
import type { CreateSshKeyInput } from "../db/stores/sshKeyStore";
import type { ServerAuthType } from "../db/stores/serverStore";
import { KeyServerOptions, SaveServerOptions } from "../types/server";
// ─── Config ───────────────────────────────────────────────────────────────────

import { config } from "../config/config";

const domain = config.server.hostname;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedServerResult {
  id: string;
  host: string;
  username: string;
  authType: ServerAuthType;
  keyId: string | null;
  publicKey: string | null;
}

export interface ResolvedServerKey {
  keyId: string;
  publicKey: string | null;
}

export interface ServerConnectionOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export type ServerStatus = "online" | "offline";

// ─── Share Links ──────────────────────────────────────────────────────────────

/**
 * Creates a shareable link for a file on a remote SFTP server.
 *
 * When the link is accessed the backend streams the file directly
 * from the SFTP server to the requesting client without storing it locally.
 */
export async function share_file(
  fileName: string,
  filePath: string,
  serverId: string,
): Promise<{ link: string }> {
  const existing = await shares.findRemoteShare(fileName, filePath, serverId);

  if (existing) {
    return {
      link: existing.link,
    };
  }

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
    ...(server && {
      serverName: server.host,
    }),
  });

  return {
    link,
  };
}

// ─── Server Management ────────────────────────────────────────────────────────

/**
 * Saves a new SFTP server configuration to the database.
 *
 * Credentials and private key data are encrypted before storage.
 */
export async function save_server(
  options: SaveServerOptions,
): Promise<SavedServerResult> {
  let publicKey: string | null = null;
  let server: CreateServerData;

  if (options.authType === "password") {
    server = {
      host: options.host.trim(),
      username: options.username.trim(),
      authType: "password",
      credentials: {
        password: encrypt(options.password),
      },
    };
  } else {
    const keyResult = await resolveServerKey({
      ...options,
      host: options.host.trim(),
      username: options.username.trim(),
    });

    server = {
      host: options.host.trim(),
      username: options.username.trim(),
      authType: "key",
      credentials: {},
      keyId: keyResult.keyId,
    };

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

// ─── Server Keys ──────────────────────────────────────────────────────────────

async function resolveServerKey(
  options: KeyServerOptions,
): Promise<ResolvedServerKey> {
  switch (options.keyMode) {
    case "saved":
      return useSavedKey(options.keyId);

    case "generate":
      return generateServerKey(options.username, options.host);

    case "import":
      return importServerKey(
        options.username,
        options.host,
        options.key,
        options.passphrase,
      );
  }
}

async function useSavedKey(keyId: string): Promise<ResolvedServerKey> {
  const sshKey = await sshKeyStore.findSharedById(keyId);

  if (!sshKey) {
    throw new Error(`SSH key not found: ${keyId}`);
  }

  return {
    keyId: sshKey._id,
    publicKey: sshKey.publicKey ?? null,
  };
}

async function generateServerKey(
  username: string,
  host: string,
): Promise<ResolvedServerKey> {
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

async function importServerKey(
  username: string,
  host: string,
  privateKey: string,
  passphrase?: string,
): Promise<ResolvedServerKey> {
  const sshKeyData: CreateSshKeyInput = {
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

function normalizePrivateKey(privateKey: string): string {
  return privateKey.trim().replace(/\\n/g, "\n");
}

// ─── Server Status ────────────────────────────────────────────────────────────

/**
 * Checks whether a server is reachable by attempting a TCP connection.
 */
export async function checkServerStatus(
  serverId: string,
  port = 22,
): Promise<ServerStatus> {
  const server = await servers.findById(serverId);

  if (!server) {
    return "offline";
  }

  return new Promise<ServerStatus>((resolve) => {
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
}

// ─── Connection Options ───────────────────────────────────────────────────────

/**
 * Retrieves connection options for a saved SFTP server.
 */
export async function getServerOptions(
  serverId: string,
): Promise<ServerConnectionOptions> {
  const server = await servers.findById(serverId);

  if (!server) {
    throw new Error(`Server not found: ${serverId}`);
  }

  const options: ServerConnectionOptions = {
    host: server.host,
    port: server.port ?? 22,
    username: server.username,
  };

  if (server.authType === "password") {
    if (!server.credentials.password) {
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
  }

  return options;
}

/**
 * Returns the public SSH key associated with a saved server.
 */
export async function getServerPublicKey(
  serverId: string,
): Promise<string | null> {
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
}
