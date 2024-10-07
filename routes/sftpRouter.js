const express = require("express");
const passport = require("passport");
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

  router.get("/api/",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_servers_json_get
  )

  router.get(
    "/api/connect/:serverId/*?",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_id_list_files_json_get
  );

  router.post(
    "/upload",
    isAuthenticated,
    sftpController.upload.array("files", 10),
    sftpController.sftp_stream_upload_post
  );

  router.post(
    "/api/upload",
    passport.authenticate("jwt", { session: false }),
    sftpController.upload.array("files", 10),
    sftpController.sftp_stream_upload_post
  );

  router.get(
    "/download/:serverId/*",
    isAuthenticated,
    sftpController.sftp_stream_download_get
  );

  router.get(
    "/api/download/:serverId/*",
    passport.authenticate("jwt", { session: false }),
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
    "/api/delete-server",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_server__json_post
  );

  router.post(
    "/delete-file",
    isAuthenticated,
    sftpController.sftp_delete_file_json_post
  );

  router.post(
    "/api/delete-file",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_file_json_post
  );

  router.post(
    "/delete-folder",
    isAuthenticated,
    sftpController.sftp_delete_folder_post
  );

  router.post(
    "/api/delete-folder",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_folder_post
  );

  router.get(
    "/console/:serverId",
    isAuthenticated,
    sftpController.ssh_console_get
  );

  router.get(
    "/server-status/:serverId",
    sftpController.server_status_get
  )

  return router;
};
