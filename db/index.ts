import createStores, {
  type DatabaseType,
} from "./createStores";

import initDatabase from "./initDatabase";

/**
 * Reads and validates the configured database backend.
 *
 * SQLite is used by default when DATABASE_TYPE is not set.
 * Keeping this validation at the configuration boundary ensures the rest
 * of the database layer only receives a valid DatabaseType.
 */
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

/**
 * Application store instances for the selected database backend.
 */
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
  notes,
} = stores;

/**
 * Initializes the configured database backend.
 *
 * Store objects are created above, while database connection/schema
 * initialization is deferred until application startup calls init().
 */
export const init = (): Promise<void> =>
  initDatabase(databaseType);