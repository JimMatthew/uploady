import {
  SettingsStore,
  AppSettings,
  SessionSettings,
  AppSettingsUpdate,
} from "../settingsStore";

import { getDatabase } from "../../sqlite/database";

interface SettingsRow {
  jwt_lifetime_minutes: number;
}

const toSettings = (row: SettingsRow | undefined): AppSettings | null => {
  if (!row) {
    return null;
  }

  return {
    session: {
      jwtLifetimeMinutes: row.jwt_lifetime_minutes,
    },
  };
};

export class SqliteSettingsStore extends SettingsStore {
  async get(): Promise<AppSettings | null> {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT
          jwt_lifetime_minutes
        FROM app_settings
        WHERE id = 1
      `,
    ) as SettingsRow | undefined;

    return toSettings(row);
  }

  async updateSessionSettings({
    jwtLifetimeMinutes,
  }: Partial<SessionSettings>): Promise<AppSettings | null> {
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

  async update(settings: AppSettingsUpdate): Promise<AppSettings | null> {
    const db = getDatabase();

    if (settings.jwtLifetimeMinutes !== undefined) {
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
        settings.jwtLifetimeMinutes,
      );
    }

    return this.get();
  }
}
