const express = require("express");
const storageController = require("../controllers/storageController");

module.exports = function (uploadsDir, isAuthenticated, configStoreType) {
  const filemanagerController = require("../controllers/fileManagerController")(
    configStoreType,
  );

  const router = express.Router();
  router.get("/", (req, res) => {
    res.redirect("/files");
  });

  router.get("/api/files/*", filemanagerController.list_directory_json_get)

  router.get(
    "/api/files",
    isAuthenticated,
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

  router.get("/api/links", filemanagerController.file_links_json_get);
  //create a public link for a file
  router.post(
    "/share",
    isAuthenticated,
    filemanagerController.generateShareLink
  );

  //stop sharing a public file
  router.post(
    "/stop-sharing",
    isAuthenticated,
    filemanagerController.stop_sharing_post
  );

  //delete file from managed directory
  router.post(
    "/delete/*",
    isAuthenticated,
    filemanagerController.delete_file_post
  );

  //download file from managed directory - is authenticated
  router.get(
    "/download/*",
    isAuthenticated,
    filemanagerController.download_file_get
  );

  //upload file/s to managed directory
  router.post(
    "/upload",
    isAuthenticated,
    storageController.uploadMiddleware,
    filemanagerController.upload_files_post
  );

  router.post(
    "/create-folder",
    isAuthenticated,
    filemanagerController.create_folder_post
  );

  router.post(
    "/delete-folder",
    isAuthenticated,
    filemanagerController.deleteFolder
  );

  return router;
};
