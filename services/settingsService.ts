import { settingsStore } from "../db";

import type { AppSettings } from "../db/stores/settingsStore";

const DEFAULT_JWT_LIFETIME_MINUTES = 480;

export interface UpdateSessionSettingsOptions {
  jwtLifetimeMinutes: number | string;
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
  const lifetime = Number(jwtLifetimeMinutes);

  if (!Number.isFinite(lifetime) || lifetime <= 0) {
    throw new Error("JWT lifetime must be greater than 0");
  }

  await settingsStore.updateSessionSettings({
    jwtLifetimeMinutes: lifetime,
  });

  return getSettings();
}
