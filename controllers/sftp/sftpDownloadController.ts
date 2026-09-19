import type { Readable } from "node:stream";
import type { Request, Response } from "express";

import {
  archiveFolder,
  downloadFile,
} from "../../services/sftpService";

import {
  getStringParam,
  getWildcardPath,
  handleError,
} from "../helpers/requestHelpers";

export async function sftp_download_get(
  req: Request,
  res: Response,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  const relativePath = getWildcardPath(req);

  const remotePath = relativePath ? `/${relativePath}` : "/";

  try {
    const { stream, filename, cleanup, size } = await downloadFile(
      serverId,
      remotePath,
    );

    setDownloadHeaders(res, filename, size);

    await pipeStreamToResponse(stream, res, cleanup);
  } catch (error) {
    console.error("Download error:", error);

    if (!res.headersSent) {
      handleError(res, "Error downloading file");
    }
  }
}

export async function sftp_archive_folder_get(
  req: Request,
  res: Response,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  const relativePath = getWildcardPath(req);

  const remotePath = relativePath ? `/${relativePath}` : "/";

  try {
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");

    await archiveFolder(serverId, remotePath, res);
  } catch (error) {
    console.error("Archive folder error:", error);

    if (!res.headersSent) {
      handleError(res, "Failed to download folder");
    }
  }
}

async function pipeStreamToResponse(
  stream: Readable,
  res: Response,
  cleanup: () => Promise<void>,
): Promise<void> {
  let cleanedUp = false;

  const safeCleanup = async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;

    try {
      await cleanup();
    } catch (error) {
      console.error("Stream cleanup error:", error);
    }
  };

  stream.on("error", async (error) => {
    console.error("Stream error:", error);

    await safeCleanup();

    if (!res.headersSent) {
      res.status(500).json({
        error: "Stream error during download",
      });
    } else {
      res.destroy();
    }
  });

  res.on("finish", safeCleanup);

  res.on("close", safeCleanup);

  stream.pipe(res);
}

function setDownloadHeaders(
  res: Response,
  filename: string,
  size?: number,
): void {
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");

  if (size !== undefined) {
    res.setHeader("Content-Length", size);
  }
}