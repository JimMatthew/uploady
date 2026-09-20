import mongoose from "mongoose";

import initSqlite from "./sqlite/initSqlite";
import type { DatabaseType } from "./createStores";

/**
 * Initializes the MongoDB connection used by Mongo-backed stores.
 *
 * The DATABASE environment variable must contain the MongoDB connection URI.
 * Connection lifecycle events are logged so disconnects and reconnects are
 * visible after the initial connection succeeds.
 */
async function initMongo(): Promise<void> {
  const mongoUri = process.env.DATABASE;

  if (!mongoUri) {
    throw new Error(
      "DATABASE environment variable is not set",
    );
  }

  mongoose.set("strictPopulate", false);

  mongoose.connection.on("error", (err: Error) => {
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
}

/**
 * Initializes infrastructure required by the selected database backend.
 *
 * MongoDB establishes the Mongoose connection. SQLite performs its local
 * database/schema initialization.
 *
 * @param databaseType - Database backend selected during application startup.
 */
async function initDatabase(
  databaseType: DatabaseType,
): Promise<void> {
  switch (databaseType) {
    case "mongo":
      await initMongo();
      return;

    case "sqlite":
      await initSqlite();

      console.log("SQLite initialized");

      return;
  }
}

export default initDatabase;