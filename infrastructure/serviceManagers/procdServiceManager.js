const listServices = async (connectConfig, sshExec) => {
  const result = await sshExec(connectConfig, "ubus call service list");

  if (result.exitCode !== 0) {
    throw new Error(
      `procd failed with exit code ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }

  return parseServices(result.stdout);
};

const normalizeState = (service) => {
  const instances = Object.values(service.instances ?? {});

  if (instances.length === 0) {
    return "stopped";
  }

  if (instances.some((instance) => instance.running === true)) {
    return "running";
  }

  return "stopped";
};

const parseServices = (output) => {
  let services;

  try {
    services = JSON.parse(output);
  } catch {
    throw new Error("Failed to parse procd service response");
  }

  return Object.entries(services).map(([name, service]) => {
    const state = normalizeState(service);

    return {
      name,
      state,
      status: state,
      description: null,
    };
  });
};

module.exports = {
  listServices,
};
