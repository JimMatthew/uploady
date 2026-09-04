const { settingsStore } = require("../db");

const DEFAULT_JWT_LIFETIME_MINUTES = 480;

async function getSettings() {
  const settings = await settingsStore.get();

  return {
    session: {
      jwtLifetimeMinutes:
        settings?.session?.jwtLifetimeMinutes ?? DEFAULT_JWT_LIFETIME_MINUTES,
    },
  };
}

async function updateSessionSettings({ jwtLifetimeMinutes }) {
  const lifetime = Number(jwtLifetimeMinutes);

  if (!Number.isFinite(lifetime) || lifetime <= 0) {
    throw new Error("JWT lifetime must be greater than 0");
  }

  await settingsStore.updateSessionSettings({
    jwtLifetimeMinutes: lifetime,
  });

  return getSettings();
}

module.exports = {
  getSettings,
  updateSessionSettings,
};
