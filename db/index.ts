import createStores, {
  type DatabaseType,
} from "./createStores";

import initDatabase from "./initDatabase";

function getDatabaseType(): DatabaseType {
  const value =
    process.env.DATABASE_TYPE ??
    "sqlite";

  if (
    value !== "mongo" &&
    value !== "sqlite"
  ) {
    throw new Error(
      `Unsupported database type: ${value}`,
    );
  }

  return value;
}

const databaseType =
  getDatabaseType();

const stores = createStores({
  databaseType,
});

export const {
  servers,
  users,
  shares,
  transferJobs,
  transferItems,
  sshKeyStore,
  settingsStore,
  actions,
} = stores;

export const init = (): Promise<void> =>
  initDatabase(databaseType);