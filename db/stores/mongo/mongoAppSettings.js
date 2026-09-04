const SettingsStore = require("../settingsStore");
const AppSettings = require("../../../models/AppSettings");

class MongoSettingsStore extends SettingsStore {
  async get() {
    return AppSettings.findOne();
  }

  async updateSessionSettings({ jwtLifetimeMinutes }) {
    return AppSettings.findOneAndUpdate(
      {},
      {
        $set: {
          "session.jwtLifetimeMinutes": jwtLifetimeMinutes,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async update(settings) {
    const $set = {};

    if (settings.sessionTimeoutMinutes !== undefined) {
      $set["session.jwtLifetimeMinutes"] = settings.sessionTimeoutMinutes;
    }

    return AppSettings.findOneAndUpdate(
      {},
      { $set },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
  }
}

module.exports = MongoSettingsStore;
