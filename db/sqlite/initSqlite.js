const {
  openDatabase,
} = require("./database");

function initSqlite() {
  const db = openDatabase(
    process.env.SQLITE_PATH || "./data/uploady.db"
  );

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL
    );
  `);

  db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    jwt_lifetime_minutes INTEGER NOT NULL DEFAULT 60
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS shared_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    link TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    is_remote INTEGER NOT NULL DEFAULT 0,
    server_id TEXT,
    server_name TEXT,
    shared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_shared_files_file
    ON shared_files(file_name, file_path);

  CREATE INDEX IF NOT EXISTS idx_shared_files_remote
    ON shared_files(file_name, file_path, server_id, is_remote);
`);
}

module.exports = initSqlite;

