import { settingsStore } from "../db";

import type { AppSettings } from "../db/stores/settingsStore";

const DEFAULT_JWT_LIFETIME_MINUTES = 480;

export interface UpdateSessionSettingsOptions {
  jwtLifetimeMinutes: number;
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await settingsStore.get();

  return {
    session: {
      jwtLifetimeMinutes:
        settings?.session.jwtLifetimeMinutes ?? DEFAULT_JWT_LIFETIME_MINUTES,
    },
  };
}

export async function updateSessionSettings({
  jwtLifetimeMinutes,
}: UpdateSessionSettingsOptions): Promise<AppSettings> {
  
  await settingsStore.updateSessionSettings({
    jwtLifetimeMinutes
  });

  return getSettings();
}
