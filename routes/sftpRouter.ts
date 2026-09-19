import { Router } from "express";

import authenticateJWT from "../middlewares/jwtAuth";

import {
  sftp_list_directory_get,
  sftp_rename_file_post,
  sftp_create_folder_post,
  sftp_delete_file_post,
  sftp_delete_folder_post,
  sftp_delete_files_post,
} from "../controllers/sftp/sftpFileController";

import { getServerStatsHandler } from "../services/serverStatsService";
import { zipDownload } from "../controllers/zipController";

import {
  getServerServices,
  startServerService,
  stopServerService,
  restartServerService,
} from "../controllers/serviceManagerController";
import {
  sftp_delete_server_post,
  sftp_get_server_public_key,
  sftp_get_servers_get,
  sftp_save_server_post,
  sftp_server_status_get,
} from "../controllers/serverController";
import { sftp_archive_folder_get, sftp_download_get } from "../controllers/sftp/sftpDownloadController";
import { sftp_upload_post } from "../controllers/sftp/sftpUploadController";
import { sftp_copy_files_post } from "../controllers/sftp/sftpTransferController";
import { sftp_share_file_post } from "../controllers/sftp/sftpShareController";

const router = Router();

router.get("/api/", authenticateJWT, sftp_get_servers_get);

router.get(
  "/api/connect/:serverId/*?",
  authenticateJWT,
  sftp_list_directory_get,
);

router.post("/api/renameFile", authenticateJWT, sftp_rename_file_post);

router.post("/api/sharefile", authenticateJWT, sftp_share_file_post);

router.post("/api/upload", authenticateJWT, sftp_upload_post);

router.get(
  "/api/download-folder/:serverId/*",
  authenticateJWT,
  sftp_archive_folder_get,
);

router.get("/api/download/:serverId/*", authenticateJWT, sftp_download_get);

router.post("/api/create-folder", authenticateJWT, sftp_create_folder_post);

router.post("/api/save-server", authenticateJWT, sftp_save_server_post);

router.post("/api/delete-server", authenticateJWT, sftp_delete_server_post);

router.post("/api/delete-file", authenticateJWT, sftp_delete_file_post);

router.post(
  "/api/delete-files",
  authenticateJWT,
  sftp_delete_files_post,
);
router.post("/api/delete-folder", authenticateJWT, sftp_delete_folder_post);

router.get("/api/servers/:serverId/public-key", sftp_get_server_public_key);

router.get("/server-status/:serverId", sftp_server_status_get);

router.get("/server-stats/:serverId", getServerStatsHandler);

router.get("/server-services/:serverId", getServerServices);

router.post(
  "/server-services/:serverId/services/:serviceName/start",
  startServerService,
);

router.post(
  "/server-services/:serverId/services/:serviceName/stop",
  stopServerService,
);

router.post(
  "/server-services/:serverId/services/:serviceName/restart",
  restartServerService,
);

router.post("/api/copy-files", sftp_copy_files_post);

router.post("/api/zip-clipboard", authenticateJWT, zipDownload);

export default router;
