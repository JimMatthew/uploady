const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middlewares/jwtAuth");
const settingsController = require(
  "../controllers/settingsController",
);

router.get(
  "/",
  authenticateJWT,
  settingsController.getSettings,
);

router.patch(
  "/session",
  authenticateJWT,
  settingsController.updateSessionSettings,
);

module.exports = router;