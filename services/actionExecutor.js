const serverService = require("./serverService");
const { sshExec2 } = require("../infrastructure/ssh/sshExec");

/**
 * Executes saved actions according to their configured execution mode.
 *
 * Capture actions are executed immediately over SSH and return the captured
 * command output. Terminal actions return the information required by the
 * client to open an interactive SSH session and run the command there.
 */
class ActionExecutor {
  /**
   * Creates an ActionExecutor.
   *
   * @param {Object} dependencies
   * @param {Object} dependencies.actionStore - Store used to retrieve actions.
   */
  constructor({ actionStore }) {
    this.actionStore = actionStore;
  }

  /**
   * Executes a saved action.
   *
   * The action is loaded from the configured action store and dispatched to
   * the appropriate execution handler based on its mode.
   *
   * @param {string} actionId - ID of the action to execute.
   * @returns {Promise<Object>} Result describing the action execution.
   * @throws {Error} If the action does not exist or its mode is unsupported.
   */
  async execute(actionId) {
    const action = await this.actionStore.getById(actionId);

    if (!action) {
      throw new Error("Action not found");
    }

    switch (action.mode) {
      case "capture":
        return this.executeCapture(action);

      case "terminal":
        return this.executeTerminal(action);

      default:
        throw new Error(`Unsupported action mode: ${action.mode}`);
    }
  }

  /**
   * Executes an action over SSH and captures its output.
   *
   * @param {Object} action - Action to execute.
   * @param {string} action.serverId - ID of the target server.
   * @param {string} action.command - Command to execute.
   * @returns {Promise<Object>} Captured stdout, stderr, exit code, and mode.
   */
  async executeCapture(action) {
    const connectConfig = await serverService.getServerOptions(action.serverId);

    const result = await sshExec2(connectConfig, action.command);

    return {
      mode: "capture",
      ...result,
    };
  }

  /**
   * Creates the execution result for an interactive terminal action.
   *
   * The command is not executed here. The returned server ID and command are
   * used by the client to open an interactive SSH session and run the command.
   *
   * @param {Object} action - Action to execute.
   * @param {string} action.serverId - ID of the target server.
   * @param {string} action.command - Command to run in the terminal.
   * @returns {{mode: string, serverId: string, command: string}}
   * Terminal execution information.
   */
  executeTerminal(action) {
    return {
      mode: "terminal",
      serverId: action.serverId,
      command: action.command,
    };
  }
}

module.exports = ActionExecutor;
