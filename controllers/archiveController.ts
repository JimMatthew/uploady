import type { Request, Response } from "express";

import { listZip, readZipEntry } from "../services/archiveService";
import { resolveLocalPath } from "../services/localFileService";

export async function listLocalArchive(
  req: Request,
  res: Response,
): Promise<void> {
  const { path } = req.query;

  if (typeof path !== "string" || !path) {
    res.status(400).json({
      error: "Archive path is required",
    });
    return;
  }

  try {
    const archivePath = resolveLocalPath(path);

    const entries = await listZip(archivePath);

    res.json({
      entries,
    });
  } catch (error) {
    console.error("Failed to open archive:", error);

    res.status(500).json({
      error: "Failed to open archive",
    });
  }
}

export async function getLocalArchiveEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const { path, entry } = req.query;

  if (typeof path !== "string" || !path) {
    res.status(400).json({
      error: "Archive path is required",
    });
    return;
  }

  if (typeof entry !== "string" || !entry) {
    res.status(400).json({
      error: "Archive entry is required",
    });
    return;
  }

  try {
    const archivePath = resolveLocalPath(path);

    const data = await readZipEntry(archivePath, entry);

    res.type("application/octet-stream");
    res.send(data);
  } catch (error) {
    console.error("Failed to read archive entry:", error);

    res.status(500).json({
      error: "Failed to read archive entry",
    });
  }
}
