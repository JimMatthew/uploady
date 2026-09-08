const MongoServerStore = require("./stores/mongo/mongoServerStore");
const MongoUserStore = require("./stores/mongo/mongoUserStore");
const MongoSharedFileStore = require("./stores/mongo/mongoSharedFileStore");
const MongoTransferJobStore = require("./stores/mongo/mongoTransferJobStore");
const MongoTransferItemStore = require("./stores/mongo/mongoTransferItemStore");
const MongoSshKeyStore = require("./stores/mongo/mongoSshKeyStore");
const MongoAppSettings = require("./stores/mongo/mongoAppSettings");
const MongoActionStore = require("./stores/mongo/mongoActionStore");

const SqliteUserStore = require("./stores/sqlite/sqliteUserStore");
const SqliteSettingsStore = require("./stores/sqlite/sqliteSettingsStore");
const SqliteSharedFileStore = require("./stores/sqlite/sqliteSharedFileStore");
const SqliteSshKeyStore = require("./stores/sqlite/sqliteSshKeyStore");
const SqliteServerStore = require("./stores/sqlite/sqliteServerStore");
const SqliteActionStore = require("./stores/sqlite/sqliteActionStore");
const SqliteTransferJobStore = require("./stores/sqlite/sqliteTransferJobStore");
const SqliteTransferItemStore = require("./stores/sqlite/sqliteTransferItemStore");

const createStores = ({ databaseType }) => {
  switch (databaseType) {
    case "mongo":
      return {
        servers: new MongoServerStore(),
        users: new MongoUserStore(),
        shares: new MongoSharedFileStore(),
        transferJobs: new MongoTransferJobStore(),
        transferItems: new MongoTransferItemStore(),
        sshKeyStore: new MongoSshKeyStore(),
        settingsStore: new MongoAppSettings(),
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

    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
};

module.exports = createStores;
