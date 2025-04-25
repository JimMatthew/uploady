const express = require("express");
const storageController = require("../controllers/storageController");
const authenticateJWT = require("../middlewares/jwtAuth");
const filemanagerController = require("../controllers/fileManagerController");

const router = express.Router();

router.get(
  "/api/files/*",
  authenticateJWT,
  filemanagerController.list_directory_json_get
);

router.get(
  "/api//files/*",
  authenticateJWT,
  filemanagerController.list_directory_json_get
);

router.get(
  "/api/files",
  authenticateJWT,
  filemanagerController.list_directory_json_get
);

router.post(
  "/api/copy-file",
  authenticateJWT,
  filemanagerController.copy_file_json_post
);

router.post(
  "/api/cut-file",
  authenticateJWT,
  filemanagerController.cut_file_json_post
);

//download file from public link - not authenticated
router.get("/share/:token/:filename", filemanagerController.serveSharedFile);

router.get(
  "/api/links",
  authenticateJWT,
  filemanagerController.file_links_json_get
);

router.post(
  "/api/share",
  authenticateJWT,
  filemanagerController.generateShareLinkJsonPost
);

router.post(
  "/api/stop-sharing",
  authenticateJWT,
  filemanagerController.stop_sharing_json_post
);

router.post(
  "/api/delete/*",
  authenticateJWT,
  filemanagerController.delete_file_json_post
);

router.get(
  "/api/download/*",
  authenticateJWT,
  filemanagerController.download_file_get
);

router.post(
  "/api/upload",
  authenticateJWT,
  storageController.uploadMiddleware,
  filemanagerController.upload_files_post
);

router.post(
  "/api/create-folder",
  authenticateJWT,
  filemanagerController.create_folder_json_post
);

router.post(
  "/api/delete-folder",
  authenticateJWT,
  filemanagerController.delete_folder_json_post
);

router.get(
  "/api/pstats",
  authenticateJWT,
  filemanagerController.get_performance_stats
);

router.post(
  "/api/rename-file",
  authenticateJWT,
  filemanagerController.rename_file_json_post
);

module.exports = router;
