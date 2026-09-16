import type { Request, Response } from "express";

import {
  getSharedKeys as getSharedKeysService,
  generateSharedKey,
  importSharedKey,
  deleteSharedKey,
} from "../services/keyService";

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

/**
 * Generates and saves a new shared SSH key pair.
 *
 * Expects a user-defined key name in the request body and returns
 * the public representation of the newly created key.
 */
export async function generateKey(req: Request, res: Response): Promise<void> {
  try {
    const { name } = req.body;

    const key = await generateSharedKey({
      name,
    });

    res.status(201).json(key);
  } catch (error) {
    console.error("Failed to generate SSH key:", error);

    res.status(500).json({
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
    const { name, privateKey, publicKey, passphrase } = req.body;

    const key = await importSharedKey({
      name,
      privateKey,
      publicKey,
      passphrase,
    });

    res.status(201).json(key);
  } catch (error) {
    console.error("Failed to import SSH key:", error);

    res.status(500).json({
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
