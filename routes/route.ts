import { Router } from "express";

import authenticateJWT from "../middlewares/jwtAuth";

import { uploadMiddleware } from "../controllers/storageController";

import {
  list_directory_get,
  cut_file_post,
  serve_shared_file_get,
  get_share_links_get,
  generate_share_link_post,
  stop_sharing_post,
  delete_file_post,
  download_file_get,
  download_file_stream,
  upload_files_post,
  create_folder_post,
  delete_folder_post,
  get_performance_stats,
  rename_file_post,
  get_archive_folder,
  paste_files_post,
  delete_files_post,
} from "../controllers/fileManagerController";

import {
  getSharedKeys,
  generateKey,
  deleteKey,
} from "../controllers/keyController";

const router = Router();

router.get("/api/files/*", authenticateJWT, list_directory_get);

router.get("/api//files/*", authenticateJWT, list_directory_get);

router.get("/api/files", authenticateJWT, list_directory_get);

router.post("/api/cut-file", authenticateJWT, cut_file_post);

// Download file from public link — not authenticated.
router.get("/share/:token/:filename", serve_shared_file_get);

router.get("/api/links", authenticateJWT, get_share_links_get);

router.post("/api/share", authenticateJWT, generate_share_link_post);

router.post("/api/stop-sharing", authenticateJWT, stop_sharing_post);

router.post("/api/delete/*", authenticateJWT, delete_file_post);

router.post("/api/delete-files", authenticateJWT, delete_files_post);

router.get("/api/download/*", authenticateJWT, download_file_get);

router.get("/api/downloadstream/*", download_file_stream);

router.post(
  "/api/upload",
  authenticateJWT,
  uploadMiddleware,
  upload_files_post,
);

router.post("/api/create-folder", authenticateJWT, create_folder_post);

router.post("/api/delete-folder", authenticateJWT, delete_folder_post);

router.get("/api/pstats", authenticateJWT, get_performance_stats);

router.post("/api/rename-file", authenticateJWT, rename_file_post);

router.get("/api/download-folder/*", authenticateJWT, get_archive_folder);

router.post("/api/paste-files", authenticateJWT, paste_files_post);

router.get("/api/keys/shared", authenticateJWT, getSharedKeys);

router.post("/api/keys/generate", authenticateJWT, generateKey);

router.delete("/api/keys/:id", authenticateJWT, deleteKey);

export default router;
