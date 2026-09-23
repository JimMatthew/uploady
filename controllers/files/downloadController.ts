import fs from "node:fs";
import path from "node:path";
import archiver, { type Archiver } from "archiver";
import mime from "mime-types";
import type { NextFunction, Request, Response } from "express";
import { listLocalDir } from "../../services/localFileService";
import { getWildcardPath, nextError } from "../helpers/requestHelpers";

import { config } from "../../config/config";

const uploadsDir = path.resolve(config.storage.uploadsDirectory);

/**
 * Triggers a file download using Express's res.download helper.
 * Sets Content-Length so the browser can show download progress.
 */
export async function download_file_get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const relativePath = getWildcardPath(req);

  if (!relativePath) {
    nextError(next, "Missing file path", 400);
    return;
  }

  const filePath = path.join(uploadsDir, relativePath);

  try {
    const stat = await fs.promises.stat(filePath);

    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-store");

    res.download(filePath, (error) => {
      if (error) {
        console.error("Download error:", error);

        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Streams a local file with range request support for video/audio playback.
 * Returns 206 Partial Content when a Range header is present, 200 otherwise.
 */
export async function download_file_stream(
  req: Request,
  res: Response,
): Promise<void> {
  const relativePath = getWildcardPath(req);

  if (!relativePath) {
    res.status(400).json({
      error: "Missing file path",
    });
    return;
  }

  try {
    const filePath = path.join(uploadsDir, relativePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        end >= fileSize
      ) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);

        res.end();
        return;
      }

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(filePath, {
        start,
        end,
      }).pipe(res);

      return;
    }

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    });

    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("File stream error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to stream file",
      });
    } else {
      res.destroy();
    }
  }
}

// ─── Archive ──────────────────────────────────────────────────────────────────

async function addFolderToArchive(
  archive: Archiver,
  folderPath: string,
  zipFolderPath: string,
): Promise<void> {
  const { folders, files } = listLocalDir(folderPath);

  for (const file of files) {
    const itemPath = path.join(folderPath, file.name);
    const zipPath = path.posix.join(zipFolderPath, file.name);

    archive.append(fs.createReadStream(itemPath), {
      name: zipPath,
    });
  }

  for (const folder of folders) {
    const itemPath = path.join(folderPath, folder.name);
    const zipPath = path.posix.join(zipFolderPath, folder.name);

    archive.append(Buffer.alloc(0), {
      name: `${zipPath}/`,
    });

    await addFolderToArchive(archive, itemPath, zipPath);
  }
}

/**
 * Streams a local folder as a ZIP archive to the client.
 */
export async function get_archive_folder(
  req: Request,
  res: Response,
): Promise<void> {
  const relativePath = getWildcardPath(req);
  const folderPath = path.join(uploadsDir, relativePath || "/");

  try {
    res.setHeader("Content-Disposition", 'attachment; filename="folder.zip"');
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", {
      zlib: {
        level: 9,
      },
    });

    archive.on("error", (error) => {
      console.error("Archive error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          error: "Error creating archive",
        });
      }
    });

    archive.pipe(res);

    await addFolderToArchive(archive, folderPath, "/");

    await new Promise<void>((resolve, reject) => {
      archive.once("finish", resolve);

      archive.once("error", reject);

      archive.finalize();
    });
  } catch (error) {
    console.error("Archive folder error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Error downloading folder",
      });
    }
  }
}