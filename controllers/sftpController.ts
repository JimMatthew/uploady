import path from "node:path";
import type { Readable } from "node:stream";
import Busboy from "busboy";
import type { Request, Response } from "express";
import { servers, transferJobs, transferItems } from "../db";

import {
  archiveFolder,
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  listDirectory,
  renameFile,
  uploadFile,
} from "../services/sftpService";

import { share_file } from "../services/serverService";

import { transferExecutor } from "../services/transferExecutor";
import { ItemKind } from "../controllers/jobs/jobConstants";
import type { TransferSourceType } from "../db/stores/transferItemStore";
import {
  getErrorMessage,
  getStringParam,
  getWildcardPath,
  handleError,
} from "./helpers/requestHelpers";
import { parseTransferRequestFile, SftpCopyRequest } from "./transferRequest";

const uploadsDir = path.resolve("uploads");

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── File Listing ─────────────────────────────────────────────────────────────

export async function sftp_list_directory_get(
  req: Request,
  res: Response,
): Promise<void> {
  const serverId = getStringParam(req, "serverId");

  if (!serverId) {
    handleError(res, "Missing serverId", 400);
    return;
  }

  const relativePath = getWildcardPath(req);

  const currentDirectory = "/" + (relativePath || "/");

  try {
    const server = await servers.findById(serverId);

    if (!server) {
      handleError(res, "Server not found", 404);
      return;
    }

    const { files, folders } = await listDirectory(serverId, currentDirectory);

    res.json({
      files,
      folders,
      currentDirectory,
      serverId,
      host: server.host,
    });
  } catch (error) {
    console.error("List directory error:", error);

    handleError(res, "Error listing directory");
  }
}

// ─── File Operations ──────────────────────────────────────────────────────────

export async function sftp_rename_file_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { currentPath, fileName, newFileName, serverId } = body as Record<
    string,
    unknown
  >;

  if (
    typeof currentPath !== "string" ||
    !currentPath ||
    typeof fileName !== "string" ||
    !fileName ||
    typeof newFileName !== "string" ||
    !newFileName ||
    typeof serverId !== "string" ||
    !serverId
  ) {
    handleError(res, "Missing required fields", 400);
    return;
  }

  try {
    await renameFile(serverId, currentPath, fileName, newFileName);

    res.status(200).json({
      message: "File renamed",
    });
  } catch (error) {
    handleError(res, `Error renaming file: ${getErrorMessage(error)}`);
  }
}

export async function sftp_delete_file_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { serverId, currentDirectory, fileName } = body as Record<
    string,
    unknown
  >;

  if (
    typeof serverId !== "string" ||
    !serverId ||
    typeof currentDirectory !== "string" ||
    !currentDirectory ||
    typeof fileName !== "string" ||
    !fileName
  ) {
    handleError(res, "Missing required fields", 400);
    return;
  }

  try {
    await deleteFile(serverId, path.posix.join(currentDirectory, fileName));

    res.status(200).json({
      message: "File deleted",
    });
  } catch (error) {
    console.error("Delete file error:", error);

    handleError(res, "Error deleting file");
  }
}

export async function sftp_delete_folder_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { serverId, currentDirectory, deleteDir } = body as Record<
    string,
    unknown
  >;

  if (
    typeof serverId !== "string" ||
    !serverId ||
    typeof currentDirectory !== "string" ||
    !currentDirectory ||
    typeof deleteDir !== "string" ||
    !deleteDir
  ) {
    handleError(res, "Missing required fields", 400);
    return;
  }

  try {
    await deleteFolder(serverId, path.posix.join(currentDirectory, deleteDir));

    res.status(200).json({
      message: "Folder deleted",
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    handleError(res, "Error deleting folder");
  }
}

export async function sftp_create_folder_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { currentPath, folderName, serverId } = body as Record<string, unknown>;

  if (
    typeof currentPath !== "string" ||
    !currentPath ||
    typeof folderName !== "string" ||
    !folderName ||
    typeof serverId !== "string" ||
    !serverId
  ) {
    handleError(res, "Missing required fields", 400);
    return;
  }

  try {
    const result = await createFolder(currentPath, folderName, serverId);

    res.status(200).json({
      message: "Folder created",
      path: result.path,
    });
  } catch (error) {
    handleError(res, `Error creating folder: ${getErrorMessage(error)}`);
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────

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

// ─── Upload ───────────────────────────────────────────────────────────────────

export function sftp_upload_post(req: Request, res: Response): void {
  const busboy = Busboy({
    headers: req.headers,
  });

  let currentDirectory: string | undefined;
  let serverId: string | undefined;

  busboy.on("field", (fieldName: string, value: string) => {
    if (fieldName === "currentDirectory") {
      currentDirectory = value;
    }

    if (fieldName === "serverId") {
      serverId = value;
    }
  });

  busboy.on("file", async (_fieldName, file, info) => {
    if (!serverId || !currentDirectory) {
      file.resume();

      if (!res.headersSent) {
        res.status(400).send("Missing directory or server ID");
      }

      return;
    }

    try {
      const remotePath = path.posix.join(currentDirectory, info.filename);

      const { close } = await uploadFile(serverId, file, remotePath);

      await close();

      if (!res.headersSent) {
        res.status(200).json({
          message: "File uploaded successfully",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);

      if (!res.headersSent) {
        res.status(500).send("Error uploading file");
      }
    }
  });

  busboy.on("error", (error: Error) => {
    console.error("Busboy error:", error);

    if (!res.headersSent) {
      res.status(500).send("Error processing upload");
    }
  });

  req.pipe(busboy);
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

function parseSftpCopyRequest(body: unknown): SftpCopyRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.files) || data.files.length === 0) {
    throw new Error("No files provided");
  }

  if (typeof data.newPath !== "string" || !data.newPath) {
    throw new Error("Destination path is required");
  }

  if (typeof data.newServerId !== "string" || !data.newServerId) {
    throw new Error("Destination server ID is required");
  }

  return {
    files: data.files.map(parseTransferRequestFile),
    newPath: data.newPath,
    newServerId: data.newServerId,
  };
}

export async function sftp_copy_files_post(
  req: Request,
  res: Response,
): Promise<void> {
  let request: SftpCopyRequest;

  try {
    request = parseSftpCopyRequest(req.body);
  } catch (error) {
    handleError(res, getErrorMessage(error), 400);
    return;
  }

  const { files, newPath, newServerId } = request;

  try {
    const job = await transferJobs.create({
      destServerId: newServerId,
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
          archivePath,
          filename: file.file,
          rootItem: file.file,
          sourcePath,
          destinationPath: path.posix.join(newPath, file.file),
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
    console.error("Failed to create transfer job:", error);

    res.status(500).send("Failed to create transfer job");
  }
}

// ─── Share ────────────────────────────────────────────────────────────────────

export async function sftp_share_file_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { serverId, remotePath } = body as Record<string, unknown>;

  if (
    typeof serverId !== "string" ||
    !serverId ||
    typeof remotePath !== "string" ||
    !remotePath
  ) {
    handleError(res, "Missing required fields", 400);
    return;
  }

  try {
    const fileName = remotePath.split("/").pop();

    if (!fileName) {
      handleError(res, "Invalid remote path", 400);
      return;
    }

    const { link } = await share_file(fileName, remotePath, serverId);

    res.json({
      link,
    });
  } catch (error) {
    console.error("Share file error:", error);

    handleError(res, "Error creating share link");
  }
}
