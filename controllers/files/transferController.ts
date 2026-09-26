import path from "node:path";
import type { NextFunction, Request, Response } from "express";

import { transferJobs, transferItems } from "../../db";
import { transferExecutor } from "../../services/transferExecutor";
import { ItemKind } from "../../controllers/jobs/jobConstants";

import { parseTransferRequestFile } from "../transferRequest";
import { getErrorMessage, nextError } from "../helpers/requestHelpers";

import type {
  LocalPasteRequest,
  LocalPasteResponse,
} from "../../shared/api/transfers";

import { config } from "../../config/config";

const uploadsDir = path.resolve(config.storage.uploadsDirectory);

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

    const response: LocalPasteResponse = {
      jobId: job._id,
    };

    res.status(201).json(response);
  } catch (error) {
    nextError(next, "Failed to create paste job", 500);
  }
}
