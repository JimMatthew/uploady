const actionService = require("../services/actionService");

async function getAll(req, res) {
  try {
    const actions = await actionService.getAll();

    res.json(actions);
  } catch (err) {
    console.error("Failed to get actions:", err);

    res.status(500).json({
      error: "Failed to get actions",
    });
  }
}

async function getById(req, res) {
  try {
    const action = await actionService.getById(req.params.id);

    if (!action) {
      return res.status(404).json({
        error: "Action not found",
      });
    }

    res.json(action);
  } catch (err) {
    console.error("Failed to get action:", err);

    res.status(500).json({
      error: "Failed to get action",
    });
  }
}

async function create(req, res) {
  try {
    const action = await actionService.create(req.body);

    res.status(201).json(action);
  } catch (err) {
    console.error("Failed to create action:", err);

    res.status(400).json({
      error: err.message || "Failed to create action",
    });
  }
}

async function update(req, res) {
  try {
    const action = await actionService.update(
      req.params.id,
      req.body,
    );

    if (!action) {
      return res.status(404).json({
        error: "Action not found",
      });
    }

    res.json(action);
  } catch (err) {
    console.error("Failed to update action:", err);

    res.status(400).json({
      error: err.message || "Failed to update action",
    });
  }
}

async function deleteAction(req, res) {
  try {
    await actionService.delete(req.params.id);

    res.status(204).end();
  } catch (err) {
    console.error("Failed to delete action:", err);

    res.status(500).json({
      error: "Failed to delete action",
    });
  }
}

async function run(req, res) {
  try {
    const result = await actionService.execute(req.params.id);

    res.json(result);
  } catch (err) {
    console.error("Failed to execute action:", err);

    res.status(400).json({
      error: err.message || "Failed to execute action",
    });
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteAction,
  run,
};