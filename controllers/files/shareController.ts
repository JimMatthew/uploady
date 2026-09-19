import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { shares } from "../../db";
import { downloadFile } from "../../services/sftpService";
import { nextError } from "../helpers/requestHelpers";

const uploadsDirectory = process.env.UPLOADS_DIRECTORY ?? "./uploads";
const uploadsDir = path.resolve(uploadsDirectory);
const domain = process.env.HOSTNAME;

async function storeLinkInfo(
  fileName: string,
  filePath: string,
  link: string,
  token: string,
): Promise<boolean> {
  const existing = await shares.findByFile(fileName, filePath);

  if (existing) {
    return false;
  }

  await shares.create({
    fileName,
    filePath,
    link,
    token,
  });

  return true;
}

/**
 * Generates a public share link for a local file.
 */
export async function generate_share_link_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { filePath, fileName } = body as Record<string, unknown>;

  if (typeof fileName !== "string" || !fileName) {
    nextError(next, "Missing required fields", 400);
    return;
  }

  if (filePath !== undefined && typeof filePath !== "string") {
    nextError(next, "Invalid file path", 400);
    return;
  }

  const relativeFilePath = filePath ?? "";
  const absoluteFilePath = path.join(uploadsDir, relativeFilePath, fileName);

  if (!fs.existsSync(absoluteFilePath)) {
    nextError(next, "File not found", 404);
    return;
  }

  const relPathName = path.join(relativeFilePath, fileName);
  const token = crypto.randomBytes(5).toString("hex");

  const shareLink =
    `${req.protocol}://${domain}` + `/share/${token}/${fileName}`;

  try {
    const stored = await storeLinkInfo(fileName, relPathName, shareLink, token);

    if (!stored) {
      nextError(next, "File is already shared", 400);
      return;
    }

    res.json({
      link: shareLink,
      fileName,
    });
  } catch (error) {
    console.error("Generate share link error:", error);

    nextError(next, "Failed to create share link", 500);
  }
}

/**
 * Serves a shared file — either from local disk or proxied from a remote
 * SFTP server depending on how the share was created.
 */
export async function serve_shared_file_get(
  req: Request,
  res: Response,
): Promise<void> {
  const { token, filename } = req.params;

  if (
    typeof token !== "string" ||
    !token ||
    typeof filename !== "string" ||
    !filename
  ) {
    res.status(400).send("Invalid share link");

    return;
  }

  const sharedFile = await shares.findByToken(token);

  if (!sharedFile) {
    res.status(404).send("File not found by token");
    return;
  }

  if (sharedFile.isRemote) {
    const { filePath: remotePath, serverId } = sharedFile;

    if (!serverId || !remotePath) {
      res.status(404).send("File not found");
      return;
    }

    try {
      const {
        stream,
        filename: remoteFilename,
        cleanup,
        size,
      } = await downloadFile(serverId, remotePath);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${remoteFilename}"`,
      );

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");

      if (size) {
        res.setHeader("Content-Length", size);
      }

      let cleanedUp = false;

      const safeCleanup = async (): Promise<void> => {
        if (cleanedUp) {
          return;
        }

        cleanedUp = true;
        await cleanup();
      };

      stream.on("error", async () => {
        await safeCleanup();
        res.destroy();
      });

      res.on("finish", safeCleanup);
      res.on("close", safeCleanup);

      stream.pipe(res);
    } catch (error) {
      console.error("Remote share download error:", error);

      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    }

    return;
  }

  const filePath = path.join(uploadsDir, sharedFile.filePath);
  const absoluteFilePath = path.join(path.dirname(filePath), filename);

  if (!fs.existsSync(absoluteFilePath)) {
    res.status(404).send("File not found");

    return;
  }

  res.download(absoluteFilePath, filename, (error) => {
    if (error && !res.headersSent) {
      console.error("Share download error:", error);
      res.status(500).send("Error downloading file");
    }
  });
}

/**
 * Returns all active share links.
 */
export async function get_share_links_get(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const links = await shares.list();

    res.json({
      links,
    });
  } catch (error) {
    console.error("Get share links error:", error);

    res.status(500).json({
      error: "Server error",
    });
  }
}

/**
 * Removes a share link by token, revoking public access to the file.
 */
export async function stop_sharing_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({
      error: "Invalid request body",
    });

    return;
  }

  const { token } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token) {
    res.status(400).json({
      error: "Missing token",
    });

    return;
  }

  try {
    await shares.deleteByToken(token);

    res.status(200).json({
      message: "Link deleted",
    });
  } catch (error) {
    console.error("Stop sharing error:", error);

    res.status(500).json({
      error: "Error deleting link",
    });
  }
}
