import mongoose from "mongoose";

import initSqlite from "./sqlite/initSqlite";
import type { DatabaseType } from "./createStores";

async function initMongo(): Promise<void> {
  const mongoUri = process.env.DATABASE;

  if (!mongoUri) {
    throw new Error("DATABASE environment variable is not set");
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

async function initDatabase(databaseType: DatabaseType): Promise<void> {
  switch (databaseType) {
    case "mongo":
      await initMongo();
      return;

    case "sqlite":
      initSqlite();

      console.log("SQLite initialized");

      return;
  }
}

export default initDatabase;
