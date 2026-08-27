const mongoose = require("mongoose");

async function initDatabase(databaseType) {
  switch (databaseType) {
    case "mongo": {
      const mongoUri = process.env.DATABASE;

      if (!mongoUri) {
        throw new Error(
          "DATABASE environment variable is not set",
        );
      }

      mongoose.set("strictPopulate", false);

      await mongoose.connect(mongoUri);

      return;
    }

    case "sqlite":
      throw new Error(
        "SQLite database initialization not implemented",
      );

    default:
      throw new Error(
        `Unsupported database type: ${databaseType}`,
      );
  }
}

module.exports = initDatabase;