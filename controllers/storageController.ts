import fs from "node:fs";
import path from "node:path";
import multer from "multer";

import { config } from "../config/config";

const uploadsDir = path.resolve(config.storage.uploadsDirectory);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const folderPath = req.body.folderPath;

    if (folderPath !== undefined && typeof folderPath !== "string") {
      cb(new Error("Invalid folder path"), "");
      return;
    }

    const targetFolder = path.join(uploadsDir, folderPath ?? "");

    if (!fs.existsSync(targetFolder)) {
      cb(new Error("Folder does not exist"), "");
      return;
    }

    cb(null, targetFolder);
  },

  filename(_req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
});

export const uploadMiddleware = upload.array("files", 10);
