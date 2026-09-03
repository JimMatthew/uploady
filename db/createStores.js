const MongoServerStore = require("./stores/mongo/mongoServerStore");
const MongoUserStore = require("./stores/mongo/mongoUserStore");
const MongoSharedFileStore = require("./stores/mongo/mongoSharedFileStore");
const MongoTransferJobStore = require("./stores/mongo/mongoTransferJobStore");
const MongoTransferItemStore = require("./stores/mongo/mongoTransferItemStore");
const MongoSshKeyStore = require("./stores/mongo/mongoSshKeyStore");

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
      };
    case "sqlite":
      throw new Error("SQLite not implemented yet");

    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
};

module.exports = createStores;
