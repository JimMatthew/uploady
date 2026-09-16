import type { Request, Response } from "express";

import { zipClipboardFiles } from "../services/sftpService";
import type { ClipboardFile } from "../services/sftpService";

function parseClipboardFiles(body: unknown): ClipboardFile[] {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw new Error("No files provided");
  }

  return data.files.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`Invalid file at index ${index}`);
    }

    const file = item as Record<string, unknown>;

    if (typeof file.file !== "string" || !file.file) {
      throw new Error(`Invalid file name at index ${index}`);
    }

    if (typeof file.path !== "string") {
      throw new Error(`Invalid path at index ${index}`);
    }

    if (
      file.source !== "local" &&
      file.source !== "sftp" &&
      file.source !== "archive"
    ) {
      throw new Error(`Invalid source at index ${index}`);
    }

    if (file.serverId !== null && typeof file.serverId !== "string") {
      throw new Error(`Invalid serverId at index ${index}`);
    }

    if (typeof file.isDirectory !== "boolean") {
      throw new Error(`Invalid isDirectory at index ${index}`);
    }

    if (file.source === "sftp" && !file.serverId) {
      throw new Error(`Missing serverId at index ${index}`);
    }

    if (
      file.source === "archive" &&
      (typeof file.archivePath !== "string" || !file.archivePath)
    ) {
      throw new Error(`Missing archivePath at index ${index}`);
    }

    const result: ClipboardFile = {
      file: file.file,
      path: file.path,
      source: file.source,
      serverId: file.serverId,
      isDirectory: file.isDirectory,
    };

    if (file.source === "archive" && typeof file.archivePath === "string") {
      result.archivePath = file.archivePath;
    }

    return result;
  });
}

export async function zipDownload(req: Request, res: Response): Promise<void> {
  let files: ClipboardFile[];

  try {
    files = parseClipboardFiles(req.body);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid request",
    });
    return;
  }

  const timestamp = Date.now();

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="uploady-${timestamp}.zip"`,
  );

  try {
    await zipClipboardFiles(files, res);
  } catch (error) {
    console.error("Zip clipboard error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to create zip",
      });
    }
  }
}
