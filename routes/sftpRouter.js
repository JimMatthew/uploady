const express = require("express");

const sftpController = require("../controllers/sftpController")();
const storageController = require("../controllers/storageController");

module.exports = function (isAuthenticated) {
  const router = express.Router();

  router.get("/", isAuthenticated, sftpController.sftp_servers_get);

  router.get(
    "/connect/:serverId/*?",
    isAuthenticated,
    sftpController.sftp_id_list_files_get
  );

  router.post(
    "/upload",
    isAuthenticated,
    sftpController.upload.array("files", 10),
    sftpController.sftp_stream_upload_post
  );

  router.get(
    "/download/:serverId/*",
    isAuthenticated,
    sftpController.sftp_stream_download_get
  );

  router.post(
    "/create-folder",
    isAuthenticated,
    sftpController.sftp_create_folder_post
  );

  router.post(
    "/save-server",
    isAuthenticated,
    sftpController.sftp_save_server_post
  );

  router.post(
    "/delete-server",
    isAuthenticated,
    sftpController.sftp_delete_server_post
  );

  router.post(
    "/delete-file",
    isAuthenticated,
    sftpController.sftp_delete_file_post
  );

  router.post(
    "/delete-folder",
    isAuthenticated,
    sftpController.sftp_delete_folder_post
  );

  router.get(
    "/console/:serverId",
    isAuthenticated,
    sftpController.ssh_console_get
  );

  return router;
};
