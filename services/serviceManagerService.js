const serverService = require("./serverService");
const { sshExec } = require("../infrastructure/ssh/sshExec");
const systemd = require("../infrastructure/serviceManagers/systemdServiceManager");

const detectServiceManager = async (connectConfig) => {
  try {
    const result = await sshExec(
      connectConfig,
      "command -v systemctl >/dev/null 2>&1",
    );

    if (result.exitCode === 0) {
      return "systemd";
    }

    return null;
  } catch {
    return null;
  }
}

const listServices = async (serverId) => {
  const connectConfig = await serverService.getServerOptions(serverId);

  const manager = await detectServiceManager(connectConfig);

  if (!manager) {
    return {
      supported: false,
      manager: null,
      services: [],
    };
  }

  if (manager === "systemd") {
    const services = await systemd.listServices(connectConfig, sshExec);

    return {
      supported: true,
      manager,
      services,
    };
  }

  return {
    supported: false,
    manager,
    services: [],
  };
};

module.exports = {
  listServices,
};
