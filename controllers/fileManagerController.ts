import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execSync } from "node:child_process";
import archiver, { type Archiver } from "archiver";
import mime from "mime-types";
import type { NextFunction, Request, Response } from "express";
import { shares, transferJobs, transferItems } from "../db";
import { downloadFile } from "../services/sftpService";
import { transferExecutor } from "../services/transferExecutor";
import { ItemKind } from "../controllers/jobs/jobConstants";
import { deleteFiles, listLocalDir } from "../services/localFileService";
import { LocalPasteRequest, parseTransferRequestFile } from "./transferRequest";

const uploadsDirectory = process.env.UPLOADS_DIRECTORY ?? "./uploads";
const uploadsDir = path.resolve(uploadsDirectory);
const domain = process.env.HOSTNAME;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getWildcardPath(req: Request): string {
  const value = req.params[0];

  return typeof value === "string" ? value : "";
}

interface RequestError {
  message: string;
  status: number;
}

function nextError(next: NextFunction, message: string, status: number): void {
  const error: RequestError = {
    message,
    status,
  };

  next(error);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

interface PerformanceStats {
  runtime: string;
  runtimeVersion: string;
  engine: string;
  engineVersion: string | null;

  database: string;
  databaseServer: string | null;

  memory: NodeJS.MemoryUsage | null;
  cpu: NodeJS.CpuUsage | null;
  uptime: number | null;

  pid: number;
  architecture: string;
  platform: NodeJS.Platform;

  osName: string | null;
  osRelease: string | null;
  osVersion: string | null;
  hostname: string | null;

  version: string | null;
}

/**
 * Returns runtime, process, system, database, and current git commit information.
 */
export function get_performance_stats(_req: Request, res: Response): void {
  const isBun = typeof process.versions.bun === "string";

  const databaseType = process.env.DATABASE_TYPE || "mongo";

  const stats: PerformanceStats = {
    runtime: isBun ? "Bun" : "Node.js",
    runtimeVersion: isBun ? process.versions.bun! : process.version,
    engine: isBun ? "JavaScriptCore" : "V8",
    engineVersion: isBun ? null : (process.versions.v8 ?? null),
    database: databaseType,
    databaseServer: null,
    memory: null,
    cpu: null,
    uptime: null,
    pid: process.pid,
    architecture: process.arch,
    platform: process.platform,
    osName: null,
    osRelease: null,
    osVersion: null,
    hostname: null,
    version: null,
  };

  try {
    stats.memory = process.memoryUsage();
  } catch (error) {
    console.warn("Failed to get memory usage:", getErrorMessage(error));
  }

  try {
    stats.cpu = process.cpuUsage();
  } catch (error) {
    console.warn("Failed to get CPU usage:", getErrorMessage(error));
  }

  try {
    stats.uptime = process.uptime();
  } catch (error) {
    console.warn("Failed to get process uptime:", getErrorMessage(error));
  }

  try {
    stats.osName = os.type();
    stats.osRelease = os.release();
    stats.osVersion = os.version();
    stats.hostname = os.hostname();
  } catch (error) {
    console.warn("Failed to get OS information:", getErrorMessage(error));
  }

  if (databaseType === "mongo" && process.env.DATABASE) {
    try {
      const mongoUrl = new URL(process.env.DATABASE);
      stats.databaseServer = mongoUrl.hostname;
    } catch (error) {
      console.warn("Failed to parse MongoDB server:", getErrorMessage(error));
    }
  }

  try {
    stats.version = execSync("git rev-parse --short HEAD").toString().trim();
  } catch (error) {
    console.warn("Failed to get Git version:", getErrorMessage(error));
  }

  res.json(stats);
}

// ─── Directory ────────────────────────────────────────────────────────────────

/**
 * Lists files and folders at the given local directory path.
 */
export function list_directory_get(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const currentDirectory = getWildcardPath(req);
    const data = getDirectoryData(currentDirectory);

    res.json({
      ...data,
      user: "admin",
    });
  } catch {
    nextError(next, "Failed to list directory", 500);
  }
}

function getDirectoryData(currentDirectory: string) {
  const { files, folders } = listLocalDir(
    path.join(uploadsDir, currentDirectory),
  );

  return {
    files,
    folders,
    currentDirectory,
  };
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export function upload_files_post(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    nextError(next, "No files uploaded", 400);
    return;
  }

  res.status(200).json({
    message: "Files uploaded successfully",
  });
}

// ─── Download ─────────────────────────────────────────────────────────────────

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

// ─── Folder Operations ────────────────────────────────────────────────────────

export async function create_folder_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { folderName, currentPath } = body as Record<string, unknown>;

  if (typeof folderName !== "string" || !folderName) {
    nextError(next, "Missing folder name", 400);
    return;
  }

  if (currentPath !== undefined && typeof currentPath !== "string") {
    nextError(next, "Invalid current path", 400);
    return;
  }

  try {
    const fullPath = path.join(uploadsDir, currentPath ?? "", folderName);

    if (fs.existsSync(fullPath)) {
      nextError(next, "Folder already exists", 409);
      return;
    }

    await fs.promises.mkdir(fullPath);

    res.status(200).json({
      message: "Folder created",
    });
  } catch (error) {
    console.error("Create folder error:", error);

    nextError(next, "Error creating folder", 500);
  }
}

export async function delete_folder_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { folderPath, folderName } = body as Record<string, unknown>;

  if (
    typeof folderPath !== "string" ||
    !folderPath ||
    typeof folderName !== "string" ||
    !folderName
  ) {
    nextError(next, "Missing required fields", 400);
    return;
  }

  try {
    await fs.promises.rmdir(path.join(uploadsDir, folderPath, folderName));

    res.status(200).json({
      message: "Folder deleted",
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    nextError(next, "Error deleting folder", 400);
  }
}

// ─── File Operations ──────────────────────────────────────────────────────────

export async function delete_file_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const relativeFilePath = getWildcardPath(req);

  if (!relativeFilePath) {
    nextError(next, "Missing file path", 400);
    return;
  }

  try {
    const absoluteFilePath = path.join(uploadsDir, relativeFilePath);
    await fs.promises.unlink(absoluteFilePath);
    await shares.deleteByPath(
      relativeFilePath,
      path.basename(relativeFilePath),
    );

    res.status(200).json({
      message: "File deleted",
    });
  } catch (error) {
    console.error("Delete file error:", error);

    nextError(next, "Error deleting file", 400);
  }
}
export async function delete_files_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { currentDirectory, fileNames } = body as Record<string, unknown>;

  if (
    typeof currentDirectory !== "string" ||
    !Array.isArray(fileNames) ||
    fileNames.length === 0 ||
    !fileNames.every(
      (fileName): fileName is string =>
        typeof fileName === "string" && fileName.length > 0,
    )
  ) {
    nextError(next, "Missing or invalid required fields", 400);
    return;
  }

  try {
    const results = await deleteFiles(currentDirectory, fileNames);

    res.status(200).json({
      results,
    });
  } catch (error) {
    console.error("Delete files error:", error);

    nextError(next, "Error deleting files", 400);
  }
}

export async function rename_file_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { filename, newFilename, currentPath } = body as Record<
    string,
    unknown
  >;

  if (
    typeof filename !== "string" ||
    !filename ||
    typeof newFilename !== "string" ||
    !newFilename ||
    typeof currentPath !== "string" ||
    !currentPath
  ) {
    nextError(next, "Missing required fields", 400);
    return;
  }

  try {
    const srcPath = path.join(uploadsDir, currentPath, filename);
    const destPath = path.join(uploadsDir, currentPath, newFilename);
    await fs.promises.rename(srcPath, destPath);

    res.status(200).json({
      message: "File renamed",
    });
  } catch (error) {
    console.error("Rename file error:", error);

    nextError(next, "Error renaming file", 500);
  }
}

export async function cut_file_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { filename, currentPath, newPath } = body as Record<string, unknown>;

  if (
    typeof filename !== "string" ||
    !filename ||
    typeof currentPath !== "string" ||
    !currentPath ||
    typeof newPath !== "string" ||
    !newPath
  ) {
    nextError(next, "Missing required fields", 400);
    return;
  }

  try {
    const srcPath = path.join(uploadsDir, currentPath, filename);
    const destPath = path.join(uploadsDir, newPath, filename);
    await fs.promises.copyFile(srcPath, destPath);

    const [srcStat, destStat] = await Promise.all([
      fs.promises.stat(srcPath),
      fs.promises.stat(destPath),
    ]);

    if (srcStat.size !== destStat.size) {
      await fs.promises.unlink(destPath);
      nextError(next, "File move failed — size mismatch", 500);
      return;
    }

    await fs.promises.unlink(srcPath);

    res.status(200).json({
      message: "File moved",
    });
  } catch (error) {
    console.error("Move file error:", error);

    nextError(next, "Error moving file", 500);
  }
}

// ─── Transfer ─────────────────────────────────────────────────────────────────
function parseLocalPasteRequest(body: unknown): LocalPasteRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw new Error("No files provided");
  }

  if (typeof data.newPath !== "string") {
    throw new Error("Destination path is required");
  }

  return {
    files: data.files.map(parseTransferRequestFile),
    newPath: data.newPath,
  };
}

/**
 * Handles a batch paste operation for local file management.
 * Supports local → local, SFTP → local and archive → local copies.
 */
export async function paste_files_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: LocalPasteRequest;

  try {
    request = parseLocalPasteRequest(req.body);
  } catch (error) {
    nextError(next, getErrorMessage(error), 400);
    return;
  }

  const { files, newPath } = request;

  try {
    const job = await transferJobs.create({
      destServerId: null,
      destPath: newPath,
    });

    await transferItems.createMany(
      files.map((file) => {
        let sourcePath: string;
        let archivePath: string | undefined;

        switch (file.source) {
          case "archive":
            sourcePath = path.posix.join(file.path, file.file);
            archivePath = path.join(uploadsDir, file.archivePath);
            break;

          case "sftp":
            sourcePath = path.posix.join(file.path, file.file);
            break;

          case "local":
            sourcePath = path.join(uploadsDir, file.path, file.file);
            break;
        }

        return {
          jobId: job._id,
          sourceType: file.source,
          sourceServerId: file.serverId,
          filename: file.file,
          rootItem: file.file,
          sourcePath,
          archivePath,
          destinationPath: path.join(uploadsDir, newPath, file.file),
          kind: file.isDirectory ? ItemKind.DIRECTORY : ItemKind.FILE,
          size: file.size,
        };
      }),
    );

    transferExecutor.enqueue(job._id);

    res.status(201).json({
      jobId: job._id,
    });
  } catch (error) {
    console.error("Failed to create paste job:", error);

    nextError(next, "Error pasting files", 500);
  }
}

// ─── Share Links ──────────────────────────────────────────────────────────────

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
