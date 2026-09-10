const listServices = async (connectConfig, sshExec) => {
  const result = await sshExec(
    connectConfig,
    [
      "systemctl",
      "list-units",
      "--type=service",
      "--all",
      "--no-legend",
      "--no-pager",
      "--plain",
    ].join(" "),
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `systemctl failed with exit code ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }

  return parseServices(result.stdout);
};

const normalizeState = (activeState, subState) => {
  if (activeState === "failed") {
    return "failed";
  }

  if (activeState === "activating") {
    return "starting";
  }

  if (activeState === "deactivating") {
    return "stopping";
  }

  if (activeState === "active") {
    return "running";
  }

  if (activeState === "inactive") {
    return "stopped";
  }

  return "unknown";
};

const parseServices = (output) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);

      if (parts.length < 5) {
        return null;
      }

      const activeState = parts[2];
      const subState = parts[3];

      return {
        name: parts[0],
        state: normalizeState(activeState, subState),
        status: subState,
        description: parts.slice(4).join(" "),
      };
    })
    .filter(Boolean);

const runServiceCommand = async (
  connectConfig,
  serviceName,
  action,
  sshExec,
) => {
  const result = await sshExec(
    connectConfig,
    `systemctl ${action} ${serviceName}`,
  );

  if (result.exitCode !== 0) {
    throw new Error(
      `systemctl ${action} failed for ${serviceName}: ${result.stderr.trim()}`,
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
