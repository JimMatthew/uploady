// db/sqlite/initSqlite.js

const { openDatabase } = require("./database");

function initSqlite() {
  const db = openDatabase(process.env.SQLITE_PATH || "./data/uploady.db");

  // Database configuration
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL
    );
  `);

  // Application settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      jwt_lifetime_minutes INTEGER NOT NULL DEFAULT 60
    );
  `);

  // Shared files
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
      ON shared_files(
        file_name,
        file_path,
        server_id,
        is_remote
      );
  `);

  // SSH keys
  db.exec(`
    CREATE TABLE IF NOT EXISTS ssh_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scope TEXT NOT NULL
        CHECK (scope IN ('server', 'shared')),
      server_id TEXT,

      private_key_iv TEXT NOT NULL,
      private_key_content TEXT NOT NULL,
      private_key_tag TEXT NOT NULL,

      public_key TEXT,

      passphrase_iv TEXT,
      passphrase_content TEXT,
      passphrase_tag TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ssh_keys_scope
      ON ssh_keys(scope);

    CREATE INDEX IF NOT EXISTS idx_ssh_keys_server_id
      ON ssh_keys(server_id);
  `);

  // Servers
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL
        CHECK (auth_type IN ('password', 'key')),

      password_iv TEXT,
      password_content TEXT,
      password_tag TEXT,

      key_id TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_servers_host
      ON servers(host);

    CREATE INDEX IF NOT EXISTS idx_servers_key_id
      ON servers(key_id);
  `);

  // Actions
  db.exec(`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      server_id TEXT NOT NULL,
      command TEXT NOT NULL,
      mode TEXT NOT NULL
        CHECK (mode IN ('capture', 'terminal')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_actions_server_id
      ON actions(server_id);
  `);

  // Transfer jobs and items
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfer_jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      type TEXT NOT NULL,
      dest_server_id TEXT,
      dest_path TEXT NOT NULL,
      current_file TEXT,
      total_files INTEGER NOT NULL DEFAULT 0,
      completed_files INTEGER NOT NULL DEFAULT 0,
      failed_files INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0,
      transferred_bytes INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transfer_jobs_status
      ON transfer_jobs(status);

    CREATE INDEX IF NOT EXISTS idx_transfer_jobs_created_at
      ON transfer_jobs(created_at);

    CREATE TABLE IF NOT EXISTS transfer_items (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      source_server_id TEXT,
      source_type TEXT,
      filename TEXT NOT NULL,
      source_path TEXT,
      destination_path TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      root_item TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      bytes_transferred INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      error TEXT,

      FOREIGN KEY (job_id)
        REFERENCES transfer_jobs(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transfer_items_job_id
      ON transfer_items(job_id);

    CREATE INDEX IF NOT EXISTS idx_transfer_items_job_status
      ON transfer_items(job_id, status);

    CREATE INDEX IF NOT EXISTS idx_transfer_items_job_kind
      ON transfer_items(job_id, kind);
  `);
}

module.exports = initSqlite;
