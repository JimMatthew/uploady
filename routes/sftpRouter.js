const express = require("express");
const sftpController = require("../controllers/sftpController");
const authenticateJWT = require("../middlewares/jwtAuth");


  const router = express.Router();

  router.get("/api/",
    authenticateJWT,
    sftpController.sftp_servers_json_get
  )

  router.get(
    "/api/connect/:serverId/*?",
    authenticateJWT,
    sftpController.sftp_id_list_files_json_get
  );

  router.post(
    "/api/renameFile",
    authenticateJWT,
    sftpController.sftp_rename_file_json_post
  );

  router.post(
    "/api/sharefile",
    authenticateJWT,
    sftpController.share_sftp_file
  )

  router.post(
    "/api/upload",
    authenticateJWT,
    sftpController.sftp_stream_upload_post
  );

  router.get(
    "/api/download-folder/:serverId/*",
    authenticateJWT,
    sftpController.sftp_get_archive_folder
  );

  router.get(
    "/api/download/:serverId/*",
    authenticateJWT,
    sftpController.sftp_stream_download_get
  );

  router.post(
    "/api/create-folder",
    authenticateJWT,
    sftpController.sftp_create_folder_json_post
  );

  router.post(
    "/api/save-server",
    authenticateJWT,
    sftpController.sftp_save_server_json_post
  );

  router.post(
    "/api/delete-server",
    authenticateJWT,
    sftpController.sftp_delete_server__json_post
  );

  router.post(
    "/api/delete-file",
    authenticateJWT,
    sftpController.sftp_delete_file_json_post
  );

  router.post(
    "/api/delete-folder",
    authenticateJWT,
    sftpController.sftp_delete_folder_json_post
  );

  router.get(
    "/server-status/:serverId",
    sftpController.server_status_get
  )

  router.post(
    "/api/copy-files",
    sftpController.sftp_copy_files_batch_json_post
  )

  router.get(
    "/api/progress/:transferId",
    sftpController.get_transfer_progress
  )

 module.exports = router;