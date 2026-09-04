const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middlewares/jwtAuth");
const archiveController = require("../controllers/archiveController");

router.get("/local", authenticateJWT, archiveController.listLocalArchive);

router.get(
  "/local/entry",
  authenticateJWT,
  archiveController.getLocalArchiveEntry,
);

module.exports = router;
