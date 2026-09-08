const { actions } = require("../db");

const serverService = require("./serverService");

const { sshExec } = require("../infrastructure/ssh/sshExec");

async function getAll() {
  return actions.getAll();
}

async function getById(id) {
  return actions.getById(id);
}

async function create(action) {
  return actions.create(action);
}

async function update(id, updates) {
  return actions.update(id, updates);
}

async function deleteAction(id) {
  return actions.delete(id);
}

async function execute(actionId) {
  const action = await actions.getById(actionId);

  if (!action) {
    throw new Error("Action not found");
  }

  switch (action.mode) {
    case "capture":
      return executeCapture(action);

    case "terminal":
      return executeTerminal(action);

    default:
      throw new Error(`Unsupported action mode: ${action.mode}`);
  }
}

async function executeCapture(action) {
  const connectConfig = await serverService.getServerOptions(action.serverId);

  const result = await sshExec(connectConfig, action.command);

  return {
    mode: "capture",
    ...result,
  };
}

function executeTerminal(action) {
  return {
    mode: "terminal",
    serverId: action.serverId,
    command: action.command,
  };
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteAction,
  execute,
};
