import {
  SettingsStore,
  AppSettings,
  SessionSettings,
  AppSettingsUpdate,
} from "../settingsStore";

import AppSettingsModel from "../../../models/AppSettings";

export class MongoSettingsStore extends SettingsStore {
  async get(): Promise<AppSettings | null> {
    return AppSettingsModel.findOne().lean<AppSettings>();
  }

  async updateSessionSettings({
    jwtLifetimeMinutes,
  }: Partial<SessionSettings>): Promise<AppSettings | null> {
    return AppSettingsModel.findOneAndUpdate(
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
    ).lean<AppSettings>();
  }

  async update(settings: AppSettingsUpdate): Promise<AppSettings | null> {
    const $set: Record<string, unknown> = {};

    if (settings.jwtLifetimeMinutes !== undefined) {
      $set["session.jwtLifetimeMinutes"] = settings.jwtLifetimeMinutes;
    }

    return AppSettingsModel.findOneAndUpdate(
      {},
      { $set },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean<AppSettings>();
  }
}
