const express = require("express");

const {actions} = require("../db");
const ActionExecutor = require("../services/actionExecutor");
const createActionController = require("../controllers/actionController");

const router = express.Router();

const actionExecutor = new ActionExecutor({
  actionStore: actions,
});

const actionController = createActionController({
  actionStore: actions,
  actionExecutor,
});

router.get("/", actionController.getAll);
router.get("/:id", actionController.getById);
router.post("/", actionController.create);
router.put("/:id", actionController.update);
router.delete("/:id", actionController.delete);
router.post("/:id/run", actionController.run);

module.exports = router;