// scripts/migrateActions.js

const mongoose = require("mongoose");
const Action = require("../models/Action");
const initSqlite = require("../db/sqlite/initSqlite");
const {
  getDatabase,
} = require("../db/sqlite/database");

async function migrateActions() {
  const mongoUri = process.env.DATABASE;

  if (!mongoUri) {
    throw new Error(
      "DATABASE environment variable is not set",
    );
  }

  await mongoose.connect(mongoUri);

  initSqlite();

  const db = getDatabase();

  const actions = await Action.find().lean();

  let inserted = 0;

  for (const action of actions) {
    const result = db.run(
      `
        INSERT OR IGNORE INTO actions (
          id,
          name,
          description,
          server_id,
          command,
          mode,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      String(action._id),
      action.name,
      action.description ?? null,
      String(action.serverId),
      action.command,
      action.mode,
      action.createdAt.toISOString(),
      action.updatedAt.toISOString(),
    );

    inserted += result.changes;
  }

  console.log(
    `Actions: ${actions.length} found, ${inserted} inserted`,
  );

  await mongoose.disconnect();
}

migrateActions().catch((err) => {
  console.error(
    "Action migration failed:",
    err,
  );

  process.exit(1);
});