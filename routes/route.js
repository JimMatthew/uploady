const express = require("express");
const storageController = require("../controllers/storageController");
const authenticateJWT = require("../middlewares/jwtAuth");
const filemanagerController = require("../controllers/fileManagerController");
const progressController = require("../controllers/progressController");
const transferJobController = require("../controllers/jobs/transferJob");
const router = express.Router();

router.get(
  "/api/files/*",
  authenticateJWT,
  filemanagerController.list_directory_get,
);

router.get(
  "/api//files/*",
  authenticateJWT,
  filemanagerController.list_directory_get,
);

router.get(
  "/api/files",
  authenticateJWT,
  filemanagerController.list_directory_get,
);

router.post(
  "/api/cut-file",
  authenticateJWT,
  filemanagerController.cut_file_post,
);

//download file from public link - not authenticated
router.get(
  "/share/:token/:filename",
  filemanagerController.serve_shared_file_get,
);

router.get(
  "/api/links",
  authenticateJWT,
  filemanagerController.get_share_links_get,
);

router.post(
  "/api/share",
  authenticateJWT,
  filemanagerController.generate_share_link_post,
);

router.post(
  "/api/stop-sharing",
  authenticateJWT,
  filemanagerController.stop_sharing_post,
);

router.post(
  "/api/delete/*",
  authenticateJWT,
  filemanagerController.delete_file_post,
);

router.get(
  "/api/download/*",
  authenticateJWT,
  filemanagerController.download_file_get,
);

router.get("/api/downloadstream/*", filemanagerController.download_file_stream);

router.post(
  "/api/upload",
  authenticateJWT,
  storageController.uploadMiddleware,
  filemanagerController.upload_files_post,
);

router.post(
  "/api/create-folder",
  authenticateJWT,
  filemanagerController.create_folder_post,
);

router.post(
  "/api/delete-folder",
  authenticateJWT,
  filemanagerController.delete_folder_post,
);

router.get(
  "/api/pstats",
  authenticateJWT,
  filemanagerController.get_performance_stats,
);

router.post(
  "/api/rename-file",
  authenticateJWT,
  filemanagerController.rename_file_post,
);

router.get(
  "/api/download-folder/*",
  authenticateJWT,
  filemanagerController.get_archive_folder,
);

router.post(
  "/api/paste-files",
  authenticateJWT,
  filemanagerController.paste_files_post,
);

router.get(
  "/api/progress/:transferId",
  progressController.get_transfer_progress,
);

router.get("/api/jobs", transferJobController.list_jobs_get);
router.get(
  "/api/jobs/:jobId",
  authenticateJWT,
  transferJobController.get_job_get,
);
router.post(
  "/api/jobs/:jobId/retry",
  authenticateJWT,
  transferJobController.retry_job_post,
);
router.delete(
  "/api/jobs/:jobId",
  authenticateJWT,
  transferJobController.delete_job_delete,
);
router.delete(
  "/api/jobs",
  authenticateJWT,
  transferJobController.clear_completed_delete,
);
router.get(
  "/api/progress/:transferId",
  progressController.get_transfer_progress,
);
router.get(
  "/api/jobs/:jobId/items",
  authenticateJWT,
  transferJobController.get_job_items_chunk,
);
module.exports = router;
