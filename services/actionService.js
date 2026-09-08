const { actions } = require("../db");

const serverService = require("./serverService");

const { sshExec } = require("../infrastructure/ssh/sshExec");

/**
 * Returns all saved actions.
 *
 * @returns {Promise<Array<Object>>} Saved actions.
 */
async function getAll() {
  return actions.getAll();
}

/**
 * Returns a saved action by ID.
 *
 * @param {string} id - Action ID.
 * @returns {Promise<Object|null>} The saved action, or null if not found.
 */
async function getById(id) {
  return actions.getById(id);
}

/**
 * Creates a saved action.
 *
 * @param {Object} action - Action data to persist.
 * @returns {Promise<Object>} The created action.
 */
async function create(action) {
  return actions.create(action);
}

/**
 * Updates a saved action.
 *
 * @param {string} id - Action ID.
 * @param {Object} updates - Fields to update.
 * @returns {Promise<Object|null>} The updated action, or null if not found.
 */
async function update(id, updates) {
  return actions.update(id, updates);
}

/**
 * Deletes a saved action.
 *
 * @param {string} id - Action ID.
 * @returns {Promise<Object|null>} The deleted action, or null if not found.
 */
async function deleteAction(id) {
  return actions.delete(id);
}

/**
 * Executes a saved action according to its configured execution mode.
 *
 * Capture actions are executed immediately over SSH. Terminal actions return
 * the information needed by the client to execute the command in an
 * interactive SSH terminal.
 *
 * @param {string} actionId - ID of the action to execute.
 * @returns {Promise<Object>} The action execution result.
 * @throws {Error} If the action does not exist or its mode is unsupported.
 */
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

/**
 * Executes a capture action over SSH and returns its output.
 *
 * @param {Object} action - Action to execute.
 * @param {string} action.serverId - ID of the target server.
 * @param {string} action.command - Command to execute.
 * @returns {Promise<Object>} Captured command result with execution mode.
 */
async function executeCapture(action) {
  const connectConfig = await serverService.getServerOptions(action.serverId);

  const result = await sshExec(connectConfig, action.command);

  return {
    mode: "capture",
    ...result,
  };
}

/**
 * Creates the result for a terminal action.
 *
 * The command is not executed here. The client uses the returned server ID
 * and command to open an interactive SSH terminal and execute it.
 *
 * @param {Object} action - Action to prepare.
 * @param {string} action.serverId - ID of the target server.
 * @param {string} action.command - Command to execute in the terminal.
 * @returns {{mode: string, serverId: string, command: string}}
 * Terminal execution information.
 */
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
