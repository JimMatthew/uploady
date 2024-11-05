const express = require("express");
const storageController = require("../controllers/storageController");
const passport = require("passport");
module.exports = function () {
  const filemanagerController = require("../controllers/fileManagerController")()
  const router = express.Router();
  
  router.get(
    "/api/files/*",
    passport.authenticate("jwt", { session: false }),
    filemanagerController.list_directory_json_get
  );

  router.get(
    "/api//files/*",
    passport.authenticate("jwt", { session: false }),
    filemanagerController.list_directory_json_get
  );

  router.get(
    "/api/files",
    passport.authenticate("jwt", { session: false }),
    filemanagerController.list_directory_json_get
  );

  //download file from public link - not authenticated
  router.get("/share/:token/:filename", filemanagerController.serveSharedFile);

  router.get("/api/links",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.file_links_json_get);

  router.post(
    "/api/share", 
    passport.authenticate('jwt', { session: false }),
    filemanagerController.generateShareLinkJsonPost);

  router.post(
    "/api/stop-sharing",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.stop_sharing_json_post
  )

  router.post(
    "/api/delete/*",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.delete_file_json_post
  )

  router.get(
    "/api/download/*",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.download_file_get
  )

  router.post(
    "/api/upload",
    passport.authenticate('jwt', { session: false }),
    storageController.uploadMiddleware,
    filemanagerController.upload_files_post
  )

  router.post(
    "/api/create-folder",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.create_folder_json_post
  )

  router.post(
    "/api/delete-folder",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.delete_folder_json_post
  )

  return router;
};
