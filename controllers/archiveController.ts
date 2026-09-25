import type { NextFunction, Request, Response } from "express";
import { listZip, readZipEntry } from "../services/archiveService";
import { resolveLocalPath } from "../services/localFileService";
import { nextError } from "./helpers/requestHelpers";

export async function listLocalArchive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { path } = req.query;

  if (typeof path !== "string" || !path) {
    nextError(next, "Archive path is required", 400);
    return;
  }

  try {
    const archivePath = resolveLocalPath(path);

    const entries = await listZip(archivePath);

    res.json({
      entries,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLocalArchiveEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { path, entry } = req.query;

  if (typeof path !== "string" || !path) {
    nextError(next, "Archive path is required", 400);
    return;
  }

  if (typeof entry !== "string" || !entry) {
    nextError(next, "Archive entry is required", 400);
    return;
  }

  try {
    const archivePath = resolveLocalPath(path);

    const data = await readZipEntry(archivePath, entry);

    res.type("application/octet-stream");
    res.send(data);
  } catch (error) {
    next(error);
  }
}
