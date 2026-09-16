import path from "node:path";
import type { Request, Response } from "express";
import { servers } from "../db";

import {
  checkServerStatus,
  getServerPublicKey,
  save_server,
} from "../services/serverService";

import { ServerAuthType } from "../db/stores/serverStore";
import {
  getErrorMessage,
  getStringParam,
  handleError,
} from "./helpers/requestHelpers";
import { KeyMode, SaveServerOptions } from "../types/server";

export async function sftp_get_servers_get(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const server = await servers.listSummary();

    res.json({
      servers: server,
    });
  } catch (error) {
    console.error("Get servers error:", error);

    res.json({
      status: "offline",
    });
  }
}

export async function sftp_server_status_get(
  req: Request,
  res: Response,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  try {
    const status = await checkServerStatus(serverId);

    res.json({
      status,
    });
  } catch (error) {
    console.error("Server status error:", error);

    res.json({
      status: "offline",
    });
  }
}
function isServerAuthType(value: unknown): value is ServerAuthType {
  return value === "password" || value === "key";
}

function isKeyMode(value: unknown): value is KeyMode {
  return value === "saved" || value === "generate" || value === "import";
}

function parseSaveServerOptions(body: unknown): SaveServerOptions {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  const host = data.host;
  const username = data.username;

  if (typeof host !== "string" || !host.trim()) {
    throw new Error("Host is required");
  }

  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Username is required");
  }

  const authType = data.authType === undefined ? "password" : data.authType;

  if (!isServerAuthType(authType)) {
    throw new Error("Invalid authType");
  }

  if (authType === "password") {
    const password = data.password;

    if (typeof password !== "string" || !password) {
      throw new Error("Password required for password auth");
    }

    return {
      host,
      username,
      authType: "password",
      password,
    };
  }

  const keyMode = data.keyMode;

  if (!isKeyMode(keyMode)) {
    throw new Error("Valid keyMode required for key auth");
  }

  switch (keyMode) {
    case "saved": {
      const keyId = data.keyId;

      if (typeof keyId !== "string" || !keyId) {
        throw new Error("SSH key required for saved key auth");
      }

      return {
        host,
        username,
        authType: "key",
        keyMode: "saved",
        keyId,
      };
    }

    case "generate":
      return {
        host,
        username,
        authType: "key",
        keyMode: "generate",
      };

    case "import": {
      const key = data.key;

      if (typeof key !== "string" || !key.trim()) {
        throw new Error("Private key required for imported key auth");
      }

      const passphrase = data.passphrase;

      if (passphrase !== undefined && typeof passphrase !== "string") {
        throw new Error("Invalid passphrase");
      }

      return {
        host,
        username,
        authType: "key",
        keyMode: "import",
        key,
        ...(passphrase !== undefined && {
          passphrase,
        }),
      };
    }
  }
}

export async function sftp_save_server_post(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const options = parseSaveServerOptions(req.body);

    const server = await save_server(options);

    res.status(201).json({
      message: "Server saved",
      server,
    });
  } catch (error) {
    console.error("Save server error:", error);

    handleError(res, getErrorMessage(error) || "Cannot save server", 400);
  }
}

export async function sftp_delete_server_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { serverId } = body as Record<string, unknown>;

  if (typeof serverId !== "string" || !serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  try {
    await servers.deleteById(serverId);

    res.status(200).json({
      message: "Server deleted",
    });
  } catch (error) {
    console.error("Delete server error:", error);

    handleError(res, "Error deleting server");
  }
}

export async function sftp_get_server_public_key(
  req: Request,
  res: Response,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  try {
    const publicKey = await getServerPublicKey(serverId);

    res.json({
      publicKey,
    });
  } catch (error) {
    console.error("Failed to get server public key:", error);

    res.status(500).json({
      error: "Failed to get server public key",
    });
  }
}
