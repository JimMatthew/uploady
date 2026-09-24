import type { Request, Response } from "express";

import { share_file } from "../../services/serverService";
import { handleError } from "../helpers/requestHelpers";

import type {
  SftpShareFileRequest,
  SftpShareFileResponse,
} from "../../shared/api/sftpFiles";

import { logger } from "../../logging";

const log = logger.child("SHARE");

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

  const request: SftpShareFileRequest = {
    serverId,
    remotePath,
  };

  try {
    const fileName = request.remotePath.split("/").pop();

    if (!fileName) {
      handleError(res, "Invalid remote path", 400);
      return;
    }

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
    log.error("Failed to create share link", { error });
    handleError(res, "Error creating share link");
  }
}
