const settingsService = require(
  "../services/settingsService",
);

async function getSettings(req, res) {
  try {
    const settings =
      await settingsService.getSettings();

    res.json(settings);
  } catch (err) {
    console.error(
      "Failed to get settings:",
      err,
    );

    res.status(500).json({
      error: "Failed to get settings",
    });
  }
}

async function updateSessionSettings(req, res) {
  try {
    const settings =
      await settingsService.updateSessionSettings({
        jwtLifetimeMinutes:
          req.body.jwtLifetimeMinutes,
      });

    res.json(settings);
  } catch (err) {
    console.error(
      "Failed to update session settings:",
      err,
    );

    res.status(400).json({
      error:
        err.message ||
        "Failed to update session settings",
    });
  }
}

module.exports = {
  getSettings,
  updateSessionSettings,
};