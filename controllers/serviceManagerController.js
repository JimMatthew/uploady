const serviceManagerService = require("../services/serviceManagerService");

/**
 * GET /api/servers/:serverId/services
 *
 * Lists services reported by the server's supported service manager.
 */
const getServerServices = async (req, res) => {
  const { serverId } = req.params;

  if (!serverId) {
    return res.status(400).json({
      error: "Missing serverId",
    });
  }

  try {
    const result = await serviceManagerService.listServices(serverId);

    res.json(result);
  } catch (err) {
    console.error(`Service fetch failed for server ${serverId}:`, err.message);

    res.status(500).json({
      error: "Failed to retrieve server services",
    });
  }
};

/**
 * POST /api/servers/:serverId/services/:serviceName/start
 */
const startServerService = async (req, res) => {
  const { serverId, serviceName } = req.params;

  if (!serverId || !serviceName) {
    return res.status(400).json({
      error: "Missing serverId or serviceName",
    });
  }

  try {
    const result = await serviceManagerService.startService(
      serverId,
      serviceName,
    );

    res.json(result);
  } catch (err) {
    console.error(
      `Failed to start service ${serviceName} on server ${serverId}:`,
      err.message,
    );

    res.status(500).json({
      error: "Failed to start service",
    });
  }
};

/**
 * POST /api/servers/:serverId/services/:serviceName/stop
 */
const stopServerService = async (req, res) => {
  const { serverId, serviceName } = req.params;

  if (!serverId || !serviceName) {
    return res.status(400).json({
      error: "Missing serverId or serviceName",
    });
  }

  try {
    const result = await serviceManagerService.stopService(
      serverId,
      serviceName,
    );

    res.json(result);
  } catch (err) {
    console.error(
      `Failed to stop service ${serviceName} on server ${serverId}:`,
      err.message,
    );

    res.status(500).json({
      error: "Failed to stop service",
    });
  }
};

/**
 * POST /api/servers/:serverId/services/:serviceName/restart
 */
const restartServerService = async (req, res) => {
  const { serverId, serviceName } = req.params;

  if (!serverId || !serviceName) {
    return res.status(400).json({
      error: "Missing serverId or serviceName",
    });
  }

  try {
    const result = await serviceManagerService.restartService(
      serverId,
      serviceName,
    );

    res.json(result);
  } catch (err) {
    console.error(
      `Failed to restart service ${serviceName} on server ${serverId}:`,
      err.message,
    );

    res.status(500).json({
      error: "Failed to restart service",
    });
  }
};
module.exports = {
  getServerServices,
  stopServerService,
  startServerService,
  restartServerService,
};
