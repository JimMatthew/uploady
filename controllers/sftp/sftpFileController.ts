import path from "node:path";
import type { Request, Response } from "express";
import { servers } from "../../db";

import {
  createFolder,
  deleteFile,
  deleteFiles,
  deleteFolder,
  listDirectory,
  renameFile,
} from "../../services/sftpService";

import {
  getErrorMessage,
  getStringParam,
  getWildcardPath,
  handleError,
} from "../helpers/requestHelpers";

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

export async function sftp_delete_files_post(
  req: Request,
  res: Response,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    handleError(res, "Invalid request body", 400);
    return;
  }

  const { serverId, currentDirectory, fileNames } = body as Record<
    string,
    unknown
  >;

  if (
    typeof serverId !== "string" ||
    !serverId ||
    typeof currentDirectory !== "string" ||
    !currentDirectory ||
    !Array.isArray(fileNames) ||
    fileNames.length === 0 ||
    !fileNames.every(
      (fileName): fileName is string =>
        typeof fileName === "string" && fileName.length > 0,
    )
  ) {
    handleError(res, "Missing or invalid required fields", 400);
    return;
  }

  const filePaths = fileNames.map((fileName) =>
    path.posix.join(currentDirectory, fileName),
  );

  try {
    const results = await deleteFiles(serverId, filePaths);

    res.status(200).json({
      results,
    });
  } catch (error) {
    console.error("Delete files error:", error);

    handleError(res, "Error deleting files");
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
