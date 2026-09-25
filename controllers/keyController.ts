import type { NextFunction, Request, Response } from "express";

import {
  getSharedKeys as getSharedKeysService,
  generateSharedKey,
  importSharedKey,
  deleteSharedKey,
  type GenerateSharedKeyOptions,
  type ImportSharedKeyOptions,
} from "../services/keyService";

import { propIfPresent } from "../shared/utils/PropHelper";
import {
  getErrorMessage,
  getStringParam,
  nextError,
} from "./helpers/requestHelpers";

/**
 * Returns all shared SSH keys available for reuse.
 *
 * Only public key metadata is returned by the key service.
 */
export async function getSharedKeys(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const keys = await getSharedKeysService();

    res.json(keys);
  } catch (error) {
    next(error);
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
 */
export async function generateKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let options: GenerateSharedKeyOptions;

  try {
    options = parseGenerateSharedKeyOptions(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error) || "Invalid request body", 400);
    return;
  }

  try {
    const key = await generateSharedKey(options);

    res.status(201).json(key);
  } catch (error) {
    next(error);
  }
}

/**
 * Imports an existing private key as a shared SSH key.
 */
export async function importKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let options: ImportSharedKeyOptions;

  try {
    options = parseImportSharedKeyOptions(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error) || "Invalid request body", 400);
    return;
  }

  try {
    const key = await importSharedKey(options);

    res.status(201).json(key);
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a shared SSH key by ID.
 */
export async function deleteKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const id = getStringParam(req, "id");

  if (!id) {
    nextError(next, "Invalid SSH key ID", 400);
    return;
  }

  try {
    await deleteSharedKey(id);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
