import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { shares } from "../../db";
import { deleteFiles, listLocalDir } from "../../services/localFileService";
import { getWildcardPath, nextError } from "../helpers/requestHelpers";
import {
  CreateFolderRequest,
  CreateFolderResponse,
  DeleteFilesRequest,
  DeleteFilesResponse,
  DeleteFolderRequest,
  DeleteFolderResponse,
  RenameFileRequest,
  RenameFileResponse,
} from "../../shared/api/files";
import { config } from "../../config/config";
import { logger } from "../../logging";

const uploadsDir = path.resolve(config.storage.uploadsDirectory);
const log = logger.child("FILES");
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

// ─── Folder Operations ────────────────────────────────────────────────────────

function parseCreateFolderRequest(body: unknown): CreateFolderRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (typeof data.folderName !== "string" || !data.folderName) {
    throw new Error("Missing folder name");
  }

  if (data.currentPath !== undefined && typeof data.currentPath !== "string") {
    throw new Error("Invalid current path");
  }

  return {
    folderName: data.folderName,
    ...(data.currentPath !== undefined && {
      currentPath: data.currentPath,
    }),
  };
}

export async function create_folder_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: CreateFolderRequest;

  try {
    request = parseCreateFolderRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    const fullPath = path.join(
      uploadsDir,
      request.currentPath ?? "",
      request.folderName,
    );

    if (fs.existsSync(fullPath)) {
      nextError(next, "Folder already exists", 409);
      return;
    }

    await fs.promises.mkdir(fullPath);

    const response: CreateFolderResponse = {
      message: "Folder created",
    };

    res.status(200).json(response);
  } catch (error) {
    log.error("Failed to create folder",{ error })
    nextError(next, "Error creating folder", 500);
  }
}

function parseDeleteFolderRequest(body: unknown): DeleteFolderRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.folderPath !== "string" ||
    !data.folderPath ||
    typeof data.folderName !== "string" ||
    !data.folderName
  ) {
    throw new Error("Missing required fields");
  }

  return {
    folderPath: data.folderPath,
    folderName: data.folderName,
  };
}

export async function delete_folder_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: DeleteFolderRequest;

  try {
    request = parseDeleteFolderRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    await fs.promises.rmdir(
      path.join(uploadsDir, request.folderPath, request.folderName),
    );

    const response: DeleteFolderResponse = {
      message: "Folder deleted",
    };

    res.status(200).json(response);
  } catch (error) {
    log.error("Failed to delete Folder", { error });
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
    log.error("Failed to delete file", { error })
    nextError(next, "Error deleting file", 400);
  }
}

function parseDeleteFilesRequest(body: unknown): DeleteFilesRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.currentDirectory !== "string" ||
    !Array.isArray(data.fileNames) ||
    data.fileNames.length === 0 ||
    !data.fileNames.every(
      (fileName): fileName is string =>
        typeof fileName === "string" && fileName.length > 0,
    )
  ) {
    throw new Error("Missing or invalid required fields");
  }

  return {
    currentDirectory: data.currentDirectory,
    fileNames: data.fileNames,
  };
}

export async function delete_files_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: DeleteFilesRequest;

  try {
    request = parseDeleteFilesRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    const results = await deleteFiles(
      request.currentDirectory,
      request.fileNames,
    );

    const response: DeleteFilesResponse = {
      results,
    };

    res.status(200).json(response);
  } catch (error) {
    log.error("Failed to delete files", { error });
    nextError(next, "Error deleting files", 400);
  }
}

function parseRenameFileRequest(body: unknown): RenameFileRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.filename !== "string" ||
    !data.filename ||
    typeof data.newFilename !== "string" ||
    !data.newFilename ||
    typeof data.currentPath !== "string" ||
    !data.currentPath
  ) {
    throw new Error("Missing required fields");
  }

  return {
    filename: data.filename,
    newFilename: data.newFilename,
    currentPath: data.currentPath,
  };
}

export async function rename_file_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let request: RenameFileRequest;

  try {
    request = parseRenameFileRequest(req.body);
  } catch (error) {
    nextError(
      next,
      error instanceof Error ? error.message : "Invalid request body",
      400,
    );
    return;
  }

  try {
    const srcPath = path.join(
      uploadsDir,
      request.currentPath,
      request.filename,
    );

    const destPath = path.join(
      uploadsDir,
      request.currentPath,
      request.newFilename,
    );

    await fs.promises.rename(srcPath, destPath);

    const response: RenameFileResponse = {
      message: "File renamed",
    };

    res.status(200).json(response);
  } catch (error) {
    log.error("Failed to rename file", { error });
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
    log.error("Failed to move file", { error });
    nextError(next, "Error moving file", 500);
  }
}
