import { MongoServerStore } from "./stores/mongo/mongoServerStore";
import { MongoUserStore } from "./stores/mongo/mongoUserStore";
import { MongoSharedFileStore } from "./stores/mongo/mongoSharedFileStore";
import { MongoTransferJobStore } from "./stores/mongo/mongoTransferJobStore";
import { MongoTransferItemStore } from "./stores/mongo/mongoTransferItemStore";
import { MongoSshKeyStore } from "./stores/mongo/mongoSshKeyStore";
import { MongoSettingsStore } from "./stores/mongo/mongoAppSettings";
import { MongoActionStore } from "./stores/mongo/mongoActionStore";

import { SqliteUserStore } from "./stores/sqlite/sqliteUserStore";
import { SqliteSettingsStore } from "./stores/sqlite/sqliteSettingsStore";
import { SqliteSharedFileStore } from "./stores/sqlite/sqliteSharedFileStore";
import { SqliteSshKeyStore } from "./stores/sqlite/sqliteSshKeyStore";
import { SqliteServerStore } from "./stores/sqlite/sqliteServerStore";
import { SqliteActionStore } from "./stores/sqlite/sqliteActionStore";
import { SqliteTransferJobStore } from "./stores/sqlite/sqliteTransferJobStore";
import { SqliteTransferItemStore } from "./stores/sqlite/sqliteTransferItemStore";

import { ServerStore } from "./stores/serverStore";
import { UserStore } from "./stores/userStore";
import { SharedFileStore } from "./stores/sharedFileStore";
import { TransferJobStore } from "./stores/transferJobStore";
import { TransferItemStore } from "./stores/transferItemStore";
import { SshKeyStore } from "./stores/sshKeyStore";
import { SettingsStore } from "./stores/settingsStore";
import { ActionStore } from "./stores/actionStore";

export type DatabaseType = "mongo" | "sqlite";

export interface Stores {
  servers: ServerStore;
  users: UserStore;
  shares: SharedFileStore;
  transferJobs: TransferJobStore;
  transferItems: TransferItemStore;
  sshKeyStore: SshKeyStore;
  settingsStore: SettingsStore;
  actions: ActionStore;
}

interface CreateStoresOptions {
  databaseType: DatabaseType;
}

const createStores = ({ databaseType }: CreateStoresOptions): Stores => {
  switch (databaseType) {
    case "mongo":
      return {
        servers: new MongoServerStore(),
        users: new MongoUserStore(),
        shares: new MongoSharedFileStore(),
        transferJobs: new MongoTransferJobStore(),
        transferItems: new MongoTransferItemStore(),
        sshKeyStore: new MongoSshKeyStore(),
        settingsStore: new MongoSettingsStore(),
        actions: new MongoActionStore(),
      };

    case "sqlite":
      return {
        servers: new SqliteServerStore(),
        users: new SqliteUserStore(),
        shares: new SqliteSharedFileStore(),
        transferJobs: new SqliteTransferJobStore(),
        transferItems: new SqliteTransferItemStore(),
        sshKeyStore: new SqliteSshKeyStore(),
        settingsStore: new SqliteSettingsStore(),
        actions: new SqliteActionStore(),
      };
  }
};

export default createStores;
