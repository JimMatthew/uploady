import fs from "node:fs";
import path from "node:path";
import { shares } from "../db";

// ─── Config ───────────────────────────────────────────────────────────────────

const uploadsDirectory = process.env.UPLOADS_DIRECTORY ?? "./uploads";
const uploadsDir = path.resolve(uploadsDirectory);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalFile {
  name: string;
  size: string;
  date: string;
}

export interface LocalFolder {
  name: string;
}

export interface LocalDirectoryListing {
  files: LocalFile[];
  folders: LocalFolder[];
}

export interface DeleteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

// ─── Directory Listing ────────────────────────────────────────────────────────

/**
 * Lists files and folders at the given absolute directory path.
 *
 * Returns files with size (KB) and last modified date.
 */
export function listLocalDir(dirPath: string): LocalDirectoryListing {
  const contents = fs.readdirSync(dirPath);

  const files: LocalFile[] = [];
  const folders: LocalFolder[] = [];

  for (const item of contents) {
    const itemPath = path.join(dirPath, item);

    const stats = fs.lstatSync(itemPath);

    if (stats.isDirectory()) {
      folders.push({
        name: item,
      });
    } else if (stats.isFile()) {
      files.push({
        name: item,
        size: (stats.size / 1024).toFixed(2),
        date: stats.mtime.toLocaleDateString(),
      });
    }
  }

  return {
    files,
    folders,
  };
}

/**
 * Recursively counts all files in a local directory.
 *
 * Used to calculate accurate progress percentages for folder copies.
 */
export function countLocalFiles(dirPath: string): number {
  const { files, folders } = listLocalDir(dirPath);

  let count = files.length;

  for (const folder of folders) {
    count += countLocalFiles(path.join(dirPath, folder.name));
  }

  return count;
}

/**
 * Resolves a path relative to the configured uploads directory.
 *
 * Rejects paths that escape the uploads directory.
 */
export function resolveLocalPath(relativePath: string): string {
  const resolved = path.resolve(uploadsDir, relativePath);

  if (
    resolved !== uploadsDir &&
    !resolved.startsWith(`${uploadsDir}${path.sep}`)
  ) {
    throw new Error("Invalid local path");
  }

  return resolved;
}

function resolveUploadPath(relativePath: string): string {
  const root = path.resolve(uploadsDir);
  const resolved = path.resolve(root, relativePath);

  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid file path");
  }

  return resolved;
}

export async function deleteFiles(
  currentDirectory: string,
  fileNames: string[],
): Promise<DeleteFileResult[]> {
  const results: DeleteFileResult[] = [];

  for (const fileName of fileNames) {
    const relativeFilePath = path.join(
      currentDirectory,
      fileName,
    );

    try {
      const absoluteFilePath = resolveUploadPath(
        relativeFilePath,
      );

      await fs.promises.unlink(absoluteFilePath);

      await shares.deleteByPath(
        relativeFilePath,
        path.basename(relativeFilePath),
      );

      results.push({
        path: relativeFilePath,
        success: true,
      });
    } catch (error) {
      results.push({
        path: relativeFilePath,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Delete failed",
      });
    }
  }

  return results;
}