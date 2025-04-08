const express = require("express");
const passport = require("passport");
const sftpController = require("../controllers/sftpController")();

module.exports = function () {
  const router = express.Router();

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
    "/api/sharefile",
    passport.authenticate("jwt", { session: false }),
    sftpController.share_sftp_file
  )

  router.post(
    "/api/upload",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_stream_upload_post
  );

  router.get(
    "/api/download-folder/:serverId/*",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_get_archive_folder
  );

  router.get(
    "/api/download/:serverId/*",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_stream_download_get
  );

  router.post(
    "/api/create-folder",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_create_folder_json_post
  );

  router.post(
    "/api/save-server",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_save_server_json_post
  );

  router.post(
    "/api/delete-server",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_server__json_post
  );

  router.post(
    "/api/delete-file",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_file_json_post
  );

  router.post(
    "/api/delete-folder",
    passport.authenticate("jwt", { session: false }),
    sftpController.sftp_delete_folder_json_post
  );

  router.get(
    "/server-status/:serverId",
    sftpController.server_status_get
  )

  return router;
};
