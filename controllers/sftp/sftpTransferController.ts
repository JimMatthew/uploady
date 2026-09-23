import path from "node:path";
import type { Request, Response } from "express";

import { transferJobs, transferItems } from "../../db";
import { transferExecutor } from "../../services/transferExecutor";
import { ItemKind } from "../../controllers/jobs/jobConstants";

import { getErrorMessage, handleError } from "../helpers/requestHelpers";

import { parseTransferRequestFile } from "../transferRequest";

import type {
  SftpCopyRequest,
  SftpCopyResponse,
} from "../../shared/api/transfers";

import { config } from "../../config/config";

const uploadsDir = path.resolve(config.storage.uploadsDirectory);

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

    const response: SftpCopyResponse = {
      jobId: job._id,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Failed to create transfer job:", error);

    res.status(500).send("Failed to create transfer job");
  }
}
