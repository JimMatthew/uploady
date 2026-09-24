import path from "node:path";
import Busboy from "busboy";
import type { Request, Response } from "express";

import {
  uploadFile,
} from "../../services/sftpService";

import { logger } from "../../logging";

const log = logger.child("UPLOAD");

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
      log.error("Failed to upload file", { error })

      if (!res.headersSent) {
        res.status(500).send("Error uploading file");
      }
    }
  });

  busboy.on("error", (error: Error) => {
    log.error("Busboy error", { error });

    if (!res.headersSent) {
      res.status(500).send("Error processing upload");
    }
  });

  req.pipe(busboy);
}