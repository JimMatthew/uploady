const serverService = require("./serverService");
const { sshExec } = require("../infrastructure/ssh/sshExec");
const systemd = require("../infrastructure/serviceManagers/systemdServiceManager");
const procd = require("../infrastructure/serviceManagers/procdServiceManager");

const SERVICE_MANAGERS = {
  systemd,
  procd,
};

const validateServiceName = (serviceName) => {
  if (
    typeof serviceName !== "string" ||
    !/^[a-zA-Z0-9_.@-]+$/.test(serviceName)
  ) {
    throw new Error("Invalid service name");
  }
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
      // Try the next supported manager.
    }
  }

  return null;
};

const getManager = async (serverId) => {
  const connectConfig = await serverService.getServerOptions(serverId);
  const managerName = await detectServiceManager(connectConfig);

  if (!managerName) {
    throw new Error("Unsupported service manager");
  }

  const manager = SERVICE_MANAGERS[managerName];

  if (!manager) {
    throw new Error(`Service manager adapter not found: ${managerName}`);
  }

  return {
    connectConfig,
    manager,
    managerName,
  };
};

const listServices = async (serverId) => {
  const { connectConfig, manager, managerName } = await getManager(serverId);

  const services = await manager.listServices(connectConfig, sshExec);

  return {
    supported: true,
    manager: managerName,
    services,
  };
};
const runServiceAction = async (serverId, serviceName, action) => {
  validateServiceName(serviceName);

  const { connectConfig, manager, managerName } = await getManager(serverId);

  const actions = {
    start: manager.startService,
    stop: manager.stopService,
    restart: manager.restartService,
  };

  const actionMethod = actions[action];

  if (typeof actionMethod !== "function") {
    throw new Error(
      `Service action ${action} is not supported by ${managerName}`,
    );
  }

  await actionMethod(connectConfig, serviceName, sshExec);

  return {
    success: true,
    service: serviceName,
    action,
    manager: managerName,
  };
};

const startService = (serverId, serviceName) =>
  runServiceAction(serverId, serviceName, "start");

const stopService = (serverId, serviceName) =>
  runServiceAction(serverId, serviceName, "stop");

const restartService = (serverId, serviceName) =>
  runServiceAction(serverId, serviceName, "restart");

module.exports = {
  listServices,
  startService,
  stopService,
  restartService,
};
