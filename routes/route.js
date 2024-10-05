const express = require("express");
const storageController = require("../controllers/storageController");
const passport = require("passport");
module.exports = function (uploadsDir, isAuthenticated, configStoreType) {
  const filemanagerController = require("../controllers/fileManagerController")(
    configStoreType
  );

  const router = express.Router();
  

  router.get(
    "/api/files/*",
    passport.authenticate("jwt", { session: false }),
    filemanagerController.list_directory_json_get
  );

  router.get(
    "/api/files",
    passport.authenticate("jwt", { session: false }),
    filemanagerController.list_directory_json_get
  );

  router.get(
    "/files",
    isAuthenticated,
    filemanagerController.list_directory_view_get
  );

  //list all files in path
  router.get(
    "/files/*?",
    isAuthenticated,
    filemanagerController.list_directory_view_get
  );

  //download file from public link - not authenticated
  router.get("/share/:token/:filename", filemanagerController.serveSharedFile);

  //display list of all shared links
  router.get("/links", isAuthenticated, filemanagerController.file_links_get);

  router.get("/api/links",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.file_links_json_get);

  //create a public link for a file
  router.post(
    "/share",
    isAuthenticated,
    filemanagerController.generateShareLink
  );

  router.post(
    "/api/share", 
    passport.authenticate('jwt', { session: false }),
    filemanagerController.generateShareLinkJsonPost);

  //stop sharing a public file
  router.post(
    "/stop-sharing",
    isAuthenticated,
    filemanagerController.stop_sharing_post
  );

  router.post(
    "/api/stop-sharing",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.stop_sharing_json_post
  )

  //delete file from managed directory
  router.post(
    "/delete/*",
    isAuthenticated,
    filemanagerController.delete_file_post
  );

  router.post(
    "/api/delete/*",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.delete_file_jspn_post
  )

  //download file from managed directory - is authenticated
  router.get(
    "/download/*",
    isAuthenticated,
    filemanagerController.download_file_get
  );

  router.get(
    "/api/download/*",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.download_file_get
  )

  //upload file/s to managed directory
  router.post(
    "/upload",
    isAuthenticated,
    storageController.uploadMiddleware,
    filemanagerController.upload_files_post
  );

  router.post(
    "/api/upload",
    passport.authenticate('jwt', { session: false }),
    storageController.uploadMiddleware,
    filemanagerController.upload_files_post
  )

  router.post(
    "/create-folder",
    isAuthenticated,
    filemanagerController.create_folder_post
  );

  router.post(
    "/api/create-folder",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.create_folder_json_post
  )

  router.post(
    "/delete-folder",
    isAuthenticated,
    filemanagerController.deleteFolder
  );

  router.post(
    "/api/delete-folder",
    passport.authenticate('jwt', { session: false }),
    filemanagerController.delete_folder_json_post
  )

  return router;
};
