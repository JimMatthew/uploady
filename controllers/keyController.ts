import type { Request, Response } from "express";

import {
  getSharedKeys as getSharedKeysService,
  generateSharedKey,
  importSharedKey,
  deleteSharedKey,
  GenerateSharedKeyOptions,
  ImportSharedKeyOptions,
} from "../services/keyService";
import { propIfPresent } from "../shared/utils/PropHelper";

/**
 * Returns all shared SSH keys available for reuse.
 *
 * Only public key metadata is returned by the key service.
 */
export async function getSharedKeys(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const keys = await getSharedKeysService();

    res.json(keys);
  } catch (error) {
    console.error("Failed to get SSH keys:", error);

    res.status(500).json({
      error: "Failed to get SSH keys",
    });
  }
}

function parseGenerateSharedKeyOptions(
  body: unknown,
): GenerateSharedKeyOptions {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new Error("Key name is required");
  }

  return {
    name: data.name.trim(),
  };
}

function parseImportSharedKeyOptions(body: unknown): ImportSharedKeyOptions {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new Error("Key name is required");
  }

  if (typeof data.privateKey !== "string" || !data.privateKey.trim()) {
    throw new Error("Private key is required");
  }

  if (data.publicKey !== undefined && typeof data.publicKey !== "string") {
    throw new Error("Invalid public key");
  }

  if (data.passphrase !== undefined && typeof data.passphrase !== "string") {
    throw new Error("Invalid passphrase");
  }

  return {
    name: data.name.trim(),
    privateKey: data.privateKey,
    ...propIfPresent("publicKey", data.publicKey),
    ...propIfPresent("passphrase", data.passphrase),
  };
}

/**
 * Generates and saves a new shared SSH key pair.
 *
 * Expects a user-defined key name in the request body and returns
 * the public representation of the newly created key.
 */
export async function generateKey(req: Request, res: Response): Promise<void> {
  try {
    const options = parseGenerateSharedKeyOptions(req.body);

    const key = await generateSharedKey(options);

    res.status(201).json(key);
  } catch (error) {
    console.error("Failed to generate SSH key:", error);

    res.status(400).json({
      error:
        error instanceof Error ? error.message : "Failed to generate SSH key",
    });
  }
}

/**
 * Imports an existing private key as a shared SSH key.
 *
 * The request body must contain a name and private key. A public
 * key and private-key passphrase may optionally be supplied.
 */
export async function importKey(req: Request, res: Response): Promise<void> {
  try {
    const options = parseImportSharedKeyOptions(req.body);

    const key = await importSharedKey(options);

    res.status(201).json(key);
  } catch (error) {
    console.error("Failed to import SSH key:", error);

    res.status(400).json({
      error:
        error instanceof Error ? error.message : "Failed to import SSH key",
    });
  }
}

/**
 * Deletes a shared SSH key by ID.
 *
 * The key service verifies that the requested key has shared scope
 * before allowing it to be deleted.
 */
export async function deleteKey(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        error: "Invalid SSH key ID",
      });
      return;
    }

    await deleteSharedKey(id);

    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete SSH key:", error);

    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to delete SSH key",
    });
  }
}
