const SettingsStore = require("../settingsStore");
const { getDatabase } = require("../../sqlite/database");

const toSettings = (row) => {
  if (!row) {
    return null;
  }

  return {
    session: {
      jwtLifetimeMinutes: row.jwt_lifetime_minutes,
    },
  };
};

class SqliteSettingsStore extends SettingsStore {
  async get() {
    const db = getDatabase();

    const row = db.get(`
      SELECT
        jwt_lifetime_minutes
      FROM app_settings
      WHERE id = 1
    `);

    return toSettings(row);
  }

  async updateSessionSettings({ jwtLifetimeMinutes }) {
    const db = getDatabase();

    db.run(
      `
        INSERT INTO app_settings (
          id,
          jwt_lifetime_minutes
        )
        VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET
          jwt_lifetime_minutes = excluded.jwt_lifetime_minutes
      `,
      jwtLifetimeMinutes,
    );

    return this.get();
  }

  async update(settings) {
    const db = getDatabase();

    if (settings.sessionTimeoutMinutes !== undefined) {
      db.run(
        `
          INSERT INTO app_settings (
            id,
            jwt_lifetime_minutes
          )
          VALUES (1, ?)
          ON CONFLICT(id) DO UPDATE SET
            jwt_lifetime_minutes = excluded.jwt_lifetime_minutes
        `,
        settings.sessionTimeoutMinutes,
      );
    }

    return this.get();
  }
}

module.exports = SqliteSettingsStore;