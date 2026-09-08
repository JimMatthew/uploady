// scripts/migrateSshKeys.js

const mongoose = require("mongoose");
const SshKey = require("../models/SshKey");
const initSqlite = require("../db/sqlite/initSqlite");
const {
  openDatabase,
} = require("../db/sqlite/database");

async function migrateSshKeys() {
  const mongoUri = process.env.DATABASE;

  if (!mongoUri) {
    throw new Error("DATABASE environment variable is not set");
  }

  await mongoose.connect(mongoUri);
initSqlite();
  const db = openDatabase(
    process.env.SQLITE_PATH || "./data/uploady.db",
  );

  const keys = await SshKey.find().lean();

  const insert = `
    INSERT OR IGNORE INTO ssh_keys (
      id,
      name,
      scope,
      server_id,
      private_key_iv,
      private_key_content,
      private_key_tag,
      public_key,
      passphrase_iv,
      passphrase_content,
      passphrase_tag,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let inserted = 0;

  for (const key of keys) {
    const result = db.run(
      insert,

      String(key._id),
      key.name,
      key.scope,
      key.serverId ? String(key.serverId) : null,

      key.privateKey.iv,
      key.privateKey.content,
      key.privateKey.tag,

      key.publicKey ?? null,

      key.passphrase?.iv ?? null,
      key.passphrase?.content ?? null,
      key.passphrase?.tag ?? null,

      key.createdAt.toISOString(),
      key.updatedAt.toISOString(),
    );

    inserted += result.changes;
  }

  console.log(
    `SSH keys: ${keys.length} found, ${inserted} inserted`,
  );

  await mongoose.disconnect();
}

migrateSshKeys().catch((err) => {
  console.error("SSH key migration failed:", err);
  process.exit(1);
});