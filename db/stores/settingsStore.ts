export interface SessionSettings {
  jwtLifetimeMinutes: number;
}

export interface AppSettings {
  session: SessionSettings;
}

export interface AppSettingsUpdate {
  jwtLifetimeMinutes?: number;
}

export abstract class SettingsStore {
  abstract get(): Promise<AppSettings | null>;

  abstract updateSessionSettings(
    settings: Partial<SessionSettings>,
  ): Promise<AppSettings | null>;

  abstract update(settings: AppSettingsUpdate): Promise<AppSettings | null>;
}
