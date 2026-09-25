import type { NextFunction, Request, Response } from "express";
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
  nextError
} from "./helpers/requestHelpers";
import { KeyMode } from "../types/server";
import { propIfPresent } from "../shared/utils/PropHelper";
import {
  DeleteServerRequest,
  DeleteServerResponse,
  ListServersResponse,
  SavedServerResponse,
  SaveServerRequest,
  SaveServerResponse,
  ServerPublicKeyResponse,
  ServerStatusResponse,
} from "../shared/api/server";

import { logger } from "../logging";

const log = logger.child("SERVER");

export async function sftp_get_servers_get(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const serverList = await servers.listSummary();

    const response: ListServersResponse = {
      servers: serverList,
    };

    res.json(response);
  } catch (error) {
    log.error("Failed to retrieve servers", { error });
    res.json({
      status: "offline",
    });
  }
}

export async function sftp_server_status_get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    nextError(next, "Missing serverId", 400);
    return;
  }

  try {
    const status = await checkServerStatus(serverId);

    const response: ServerStatusResponse = {
      status,
    };

    res.json(response);
  } catch (error) {
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
function parseSaveServerRequest(body: unknown): SaveServerRequest {
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
        ...propIfPresent("passphrase", passphrase),
      };
    }
  }
}

export async function sftp_save_server_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: SaveServerRequest;

  try {
    request = parseSaveServerRequest(req.body);
  } catch (error) {
    nextError(
      next,
      getErrorMessage(error) || "Invalid request body",
      400,
    );
    return;
  }

  try {
    const server = await save_server(request);

    const savedServer: SavedServerResponse = {
      id: server.id,
      host: server.host,
      username: server.username,
      authType: server.authType,
      keyId: server.keyId,
      publicKey: server.publicKey,
    };

    const response: SaveServerResponse = {
      message: "Server saved",
      server: savedServer,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

function parseDeleteServerRequest(body: unknown): DeleteServerRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.serverId !== "string" || !data.serverId) {
    throw new Error("Missing serverId");
  }

  return {
    serverId: data.serverId,
  };
}

export async function sftp_delete_server_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: DeleteServerRequest;

  try {
    request = parseDeleteServerRequest(req.body);
  } catch (error) {
    nextError(
      next,
      getErrorMessage(error) || "Invalid request body",
      400,
    );
    return;
  }

  try {
    await servers.deleteById(request.serverId);

    const response: DeleteServerResponse = {
      message: "Server deleted",
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

export async function sftp_get_server_public_key(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    nextError(next, "Missing serverId", 400);
    return;
  }

  try {
    const publicKey = await getServerPublicKey(serverId);

    const response: ServerPublicKeyResponse = {
      publicKey: publicKey ?? "",
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
