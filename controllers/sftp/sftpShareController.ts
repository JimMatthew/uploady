import type { NextFunction, Request, Response } from "express";

import { share_file } from "../../services/serverService";
import { nextError } from "../helpers/requestHelpers";

import type {
  SftpShareFileRequest,
  SftpShareFileResponse,
} from "../../shared/api/sftpFiles";

export async function sftp_share_file_post(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    nextError(next, "Invalid request body", 400);
    return;
  }

  const { serverId, remotePath } = body as Record<string, unknown>;

  if (
    typeof serverId !== "string" ||
    !serverId ||
    typeof remotePath !== "string" ||
    !remotePath
  ) {
    nextError(next, "Missing required fields", 400);
    return;
  }

  const request: SftpShareFileRequest = {
    serverId,
    remotePath,
  };

  const fileName = request.remotePath.split("/").pop();

  if (!fileName) {
    nextError(next, "Invalid remote path", 400);
    return;
  }

  try {
    const { link } = await share_file(
      fileName,
      request.remotePath,
      request.serverId,
    );

    const response: SftpShareFileResponse = {
      link,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}
