const express = require("express");

const router = express.Router();

const authenticateJWT = require("../middlewares/jwtAuth");
const actionController = require("../controllers/actionController");

router.get("/", authenticateJWT, actionController.getAll);

router.get("/:id", authenticateJWT, actionController.getById);

router.post("/", authenticateJWT, actionController.create);

router.put("/:id", authenticateJWT, actionController.update);

router.delete("/:id", authenticateJWT, actionController.delete);

router.post("/:id/run", authenticateJWT, actionController.run);

module.exports = router;
