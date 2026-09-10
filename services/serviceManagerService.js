const serverService = require("./serverService");
const { sshExec } = require("../infrastructure/ssh/sshExec");

const systemd = require(
  "../infrastructure/serviceManagers/systemdServiceManager",
);

const procd = require(
  "../infrastructure/serviceManagers/procdServiceManager",
);

const SERVICE_MANAGERS = {
  systemd,
  procd,
};

const detectServiceManager = async (connectConfig) => {
  const checks = [
    {
      name: "systemd",
      command: "command -v systemctl >/dev/null 2>&1",
    },
    {
      name: "procd",
      command: "command -v ubus >/dev/null 2>&1 && [ -d /etc/init.d ]",
    },
  ];

  for (const check of checks) {
    try {
      const result = await sshExec(connectConfig, check.command);

      if (result.exitCode === 0) {
        return check.name;
      }
    } catch {
      // Try the next manager.
    }
  }

  return null;
};

const getServiceManager = async (connectConfig) => {
  const name = await detectServiceManager(connectConfig);

  if (!name) {
    return null;
  }

  return {
    name,
    adapter: SERVICE_MANAGERS[name],
  };
};

const listServices = async (serverId) => {
  const connectConfig =
    await serverService.getServerOptions(serverId);

  const manager = await getServiceManager(connectConfig);

  if (!manager) {
    return {
      supported: false,
      manager: null,
      services: [],
    };
  }

  const services = await manager.adapter.listServices(
    connectConfig,
    sshExec,
  );

  return {
    supported: true,
    manager: manager.name,
    services,
  };
};

module.exports = {
  listServices,
};