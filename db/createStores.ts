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

import type { ServerStore } from "./stores/serverStore";
import type { UserStore } from "./stores/userStore";
import type { SharedFileStore } from "./stores/sharedFileStore";
import type { TransferJobStore } from "./stores/transferJobStore";
import type { TransferItemStore } from "./stores/transferItemStore";
import type { SshKeyStore } from "./stores/sshKeyStore";
import type { SettingsStore } from "./stores/settingsStore";
import type { ActionStore } from "./stores/actionStore";
import type { NoteStore } from "./stores/noteStore";
import { MongoNoteStore } from "./stores/mongo/mongoNoteStore";
import { SqliteNoteStore } from "./stores/sqlite/sqliteNoteStore";

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
  notes: NoteStore;
}

interface CreateStoresOptions {
  databaseType: DatabaseType;
}

/**
 * Creates the complete store set for a database backend.
 *
 * This is the composition point where common store contracts are mapped
 * to their concrete MongoDB or SQLite implementations.
 *
 * @param options - Store creation options, including the selected backend.
 * @returns Store implementations for the selected database backend.
 */
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
        notes: new MongoNoteStore(),
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
        notes: new SqliteNoteStore()
      };
  }
};

export default createStores;
