const MongoServerStore = require("./stores/mongo/mongoServerStore");

const createStores = ({ databaseType }) => {
    switch (databaseType) {
        case "mongo":
            return {
                servers: new MongoServerStore(),
            }
        case "sqlite":
            throw new Error("SQLite not implemented yet");

        default:
            throw new Error(
                `Unsupported database type: ${databaseType}`,
            );
    }
}

module.exports = createStores;