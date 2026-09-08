// scripts/migrateServers.js

const mongoose = require("mongoose");
const SftpServer = require("../models/SftpServer");
const initSqlite = require("../db/sqlite/initSqlite");
const {
  getDatabase,
} = require("../db/sqlite/database");

async function migrateServers() {
  const mongoUri = process.env.DATABASE;

  if (!mongoUri) {
    throw new Error(
      "DATABASE environment variable is not set",
    );
  }

  await mongoose.connect(mongoUri);

  initSqlite();

  const db = getDatabase();

  const servers = await SftpServer.find().lean();

  let inserted = 0;

  for (const server of servers) {
    const result = db.run(
      `
        INSERT OR IGNORE INTO servers (
          id,
          host,
          port,
          username,
          auth_type,
          password_iv,
          password_content,
          password_tag,
          key_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,

      String(server._id),
      server.host,
      server.port ?? 22,
      server.username,
      server.authType,

      server.credentials?.password?.iv ?? null,
      server.credentials?.password?.content ?? null,
      server.credentials?.password?.tag ?? null,

      server.keyId != null
        ? String(server.keyId)
        : null,

      server.createdAt.toISOString(),
      server.updatedAt.toISOString(),
    );

    inserted += result.changes;
  }

  console.log(
    `Servers: ${servers.length} found, ${inserted} inserted`,
  );

  await mongoose.disconnect();
}

migrateServers().catch((err) => {
  console.error(
    "Server migration failed:",
    err,
  );

  process.exit(1);
});