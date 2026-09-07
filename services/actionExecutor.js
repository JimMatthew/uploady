const serverService = require("./serverService");
const { sshExec2 } = require("../infrastructure/ssh/sshExec");

class ActionExecutor {
  constructor({ actionStore }) {
    this.actionStore = actionStore;
  }

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

  async executeCapture(action) {
    const connectConfig = await serverService.getServerOptions(action.serverId);

    const result = await sshExec2(connectConfig, action.command);

    return {
      mode: "capture",
      ...result,
    };
  }

  executeTerminal(action) {
    return {
      mode: "terminal",
      serverId: action.serverId,
      command: action.command,
    };
  }
}

module.exports = ActionExecutor;
