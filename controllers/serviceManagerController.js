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

module.exports = {
  getServerServices,
};
