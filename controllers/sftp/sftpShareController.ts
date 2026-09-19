import { share_file } from "../../services/serverService";
import { handleError } from "../helpers/requestHelpers";
import type { Request, Response } from "express";

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
