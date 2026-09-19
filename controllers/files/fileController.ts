import fs from "node:fs";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import { shares } from "../../db";
import { deleteFiles, listLocalDir } from "../../services/localFileService";
import { getWildcardPath, nextError } from "../helpers/requestHelpers";

const uploadsDirectory = process.env.UPLOADS_DIRECTORY ?? "./uploads";
const uploadsDir = path.resolve(uploadsDirectory);

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