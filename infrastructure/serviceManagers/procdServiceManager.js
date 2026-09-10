const listServices = async (connectConfig, sshExec) => {

  const [initResult, runtimeResult] = await Promise.all([
    sshExec(connectConfig, "ls -1 /etc/init.d"),
    sshExec(connectConfig, "ubus call service list"),
  ]);

  if (initResult.exitCode !== 0) {
    throw new Error(
      `Failed to list procd services: ${initResult.stderr.trim()}`,
    );
  }

  if (runtimeResult.exitCode !== 0) {
    throw new Error(
      `Failed to retrieve procd runtime state: ${runtimeResult.stderr.trim()}`,
    );
  }

  const serviceNames = initResult.stdout
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);

  const runtimeServices = parseServices(runtimeResult.stdout);

  return serviceNames.map((name) => {
    const runtimeService = runtimeServices[name];
    const state = normalizeState(runtimeService);
    return {
      name,
      state,
      status: state,
      description: null,
    };
  });
};

const normalizeState = (service) => {
  if (!service) {
    return "stopped";
  }

  const instances = Object.values(service.instances ?? {});

  if (instances.some((instance) => instance.running === true)) {
    return "running";
  }

  return "stopped";
};

const parseServices = (output) => {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Failed to parse procd service response");
  }
};

const runServiceCommand = async (
  connectConfig,
  serviceName,
  action,
  sshExec,
) => {
  const result = await sshExec(
    connectConfig,
    `service ${serviceName} ${action}`,
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `service ${serviceName} ${action} failed: ${result.stderr.trim()}`,
    );
  }
};

const startService = (connectConfig, serviceName, sshExec) =>
  runServiceCommand(connectConfig, serviceName, "start", sshExec);

const stopService = (connectConfig, serviceName, sshExec) =>
  runServiceCommand(connectConfig, serviceName, "stop", sshExec);

const restartService = (connectConfig, serviceName, sshExec) =>
  runServiceCommand(connectConfig, serviceName, "restart", sshExec);

module.exports = {
  listServices,
  startService,
  stopService,
  restartService,
};
