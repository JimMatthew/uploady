const express = require("express");
const sftpController = require("../controllers/sftpController");
const authenticateJWT = require("../middlewares/jwtAuth");
const progressController = require("../controllers/progressController");
const { getServerStatsHandler } = require("../services/serverStatsService");
const zipController = require("../controllers/zipController");

const router = express.Router();

router.get("/api/", authenticateJWT, sftpController.sftp_get_servers_get);

router.get(
  "/api/connect/:serverId/*?",
  authenticateJWT,
  sftpController.sftp_list_directory_get,
);

router.post(
  "/api/renameFile",
  authenticateJWT,
  sftpController.sftp_rename_file_post,
);

router.post(
  "/api/sharefile",
  authenticateJWT,
  sftpController.sftp_share_file_post,
);

router.post("/api/upload", authenticateJWT, sftpController.sftp_upload_post);

router.get(
  "/api/download-folder/:serverId/*",
  authenticateJWT,
  sftpController.sftp_archive_folder_get,
);

router.get(
  "/api/download/:serverId/*",
  authenticateJWT,
  sftpController.sftp_download_get,
);

router.post(
  "/api/create-folder",
  authenticateJWT,
  sftpController.sftp_create_folder_post,
);

router.post(
  "/api/save-server",
  authenticateJWT,
  sftpController.sftp_save_server_post,
);

router.post(
  "/api/delete-server",
  authenticateJWT,
  sftpController.sftp_delete_server_post,
);

router.post(
  "/api/delete-file",
  authenticateJWT,
  sftpController.sftp_delete_file_post,
);

router.post(
  "/api/delete-folder",
  authenticateJWT,
  sftpController.sftp_delete_folder_post,
);

router.get("/server-status/:serverId", sftpController.sftp_server_status_get);

router.get("/server-stats/:serverId", getServerStatsHandler);

router.post("/api/copy-files", sftpController.sftp_copy_files_post);

router.get(
  "/api/progress/:transferId",
  progressController.get_transfer_progress,
);

router.post("/api/zip-clipboard", authenticateJWT, zipController.zipDownload);

router.get("/api/jobs/:jobId", authenticateJWT, async (req, res) => {
  const TransferJob = require("../models/transferJobs");
  const TransferItem = require("../models/TransferItem");
  const executor = require("../services/transferExecutor");

  const { jobId } = req.params;
  const job = await TransferJob.findById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const items = await TransferItem.find({ jobId });

  // overlay live state if job is active
  const liveJob = executor.getJob(jobId);
  const liveItems = liveJob ? liveJob.items : null;

  res.json({
    job,
    items: items.map((item) => {
      const live = liveItems?.get(item._id.toString());
      return {
        ...item.toObject(),
        percent: live?.percent ?? (item.status === "completed" ? 100 : 0),
      };
    }),
  });
});

module.exports = router;
