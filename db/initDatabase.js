const mongoose = require("mongoose");

async function initDatabase(databaseType) {
  switch (databaseType) {
    case "mongo": {
      const mongoUri = process.env.DATABASE;

      if (!mongoUri) {
        throw new Error("DATABASE environment variable is not set");
      }

      mongoose.set("strictPopulate", false);
      
      mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
      });

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });

      console.log("MongoDB connected");
      return;
    }

    case "sqlite":
      throw new Error("SQLite database initialization not implemented");

    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}

module.exports = initDatabase;
