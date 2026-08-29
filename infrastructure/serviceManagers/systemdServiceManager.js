const listServices = async (connectConfig, sshExec) => {
  const output = await sshExec(
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

  return parseServices(output);
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

      return {
        name: parts[0],
        state: parts[2],
        status: parts[3],
        description: parts.slice(4).join(" "),
      };
    })
    .filter(Boolean);

module.exports = {
  listServices,
};
