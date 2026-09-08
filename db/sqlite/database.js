/**
 * SQLite runtime compatibility layer.
 *
 * Uploady supports running under both Bun and Node.js. Each runtime provides
 * a native SQLite implementation with a slightly different API:
 *
 * - Bun uses `bun:sqlite`
 * - Node.js uses `node:sqlite`
 *
 * This module hides those differences behind a small common interface used by
 * the SQLite stores. Consumers should use the adapter returned by
 * `openDatabase()` / `getDatabase()` rather than accessing the native database
 * instance directly.
 *
 * The database is opened once per process and reused until `closeDatabase()`
 * is called.
 */

let rawDb = null;
let adapter = null;

/**
 * Determines whether Uploady is currently running under Bun.
 *
 * @returns {boolean} True when running under Bun, otherwise false.
 */
function isBun() {
  return Boolean(process.versions?.bun);
}

/**
 * Creates a common SQLite adapter around a runtime-specific database instance.
 *
 * Normalizes the small subset of SQLite operations needed by Uploady's stores
 * so they can use the same API under Bun and Node.js.
 *
 * @param {Object} db - Native Bun or Node.js SQLite database instance.
 * @param {"bun"|"node"} runtime - SQLite runtime implementation being wrapped.
 * @returns {{
 *   exec: function(string): void,
 *   get: function(string, ...*): Object|null,
 *   all: function(string, ...*): Object[],
 *   run: function(string, ...*): {
 *     changes: number,
 *     lastInsertRowid: *
 *   },
 *   close: function(): void
 * }} Normalized SQLite adapter.
 */
function createAdapter(db, runtime) {
  const prepare = (sql) => {
    if (runtime === "bun") {
      return db.query(sql);
    }

    return db.prepare(sql);
  };

  return {
    /**
     * Executes one or more SQL statements without returning rows.
     *
     * Primarily used for schema creation, pragmas, and transaction control.
     *
     * @param {string} sql - SQL to execute.
     */
    exec(sql) {
      db.exec(sql);
    },

    /**
     * Executes a query and returns its first row.
     *
     * Normalizes the runtime-specific "no row" result to null.
     *
     * @param {string} sql - SQL query containing optional placeholders.
     * @param {...*} params - Values bound to the query placeholders.
     * @returns {Object|null} The first matching row, or null if none exists.
     */
    get(sql, ...params) {
      const row = prepare(sql).get(...params);

      // Normalize Bun null and Node undefined.
      return row ?? null;
    },

    /**
     * Executes a query and returns all matching rows.
     *
     * @param {string} sql - SQL query containing optional placeholders.
     * @param {...*} params - Values bound to the query placeholders.
     * @returns {Object[]} Query result rows.
     */
    all(sql, ...params) {
      return prepare(sql).all(...params);
    },

    /**
     * Executes a statement that modifies the database.
     *
     * Normalizes the execution result returned by Bun and Node.js.
     *
     * @param {string} sql - SQL statement containing optional placeholders.
     * @param {...*} params - Values bound to the statement placeholders.
     * @returns {{
     *   changes: number,
     *   lastInsertRowid: *
     * }} Number of affected rows and the last inserted row ID.
     */
    run(sql, ...params) {
      const result = prepare(sql).run(...params);

      return {
        changes: Number(result.changes),
        lastInsertRowid: result.lastInsertRowid,
      };
    },

    /**
     * Closes the underlying SQLite database connection.
     */
    close() {
      db.close();
    },
  };
}

/**
 * Opens Uploady's SQLite database and returns the shared compatibility adapter.
 *
 * The first call creates the runtime-specific database connection. Subsequent
 * calls return the existing adapter rather than opening another connection.
 *
 * Bun uses `bun:sqlite`, while Node.js uses the built-in `node:sqlite`
 * DatabaseSync implementation.
 *
 * @param {string} path - Filesystem path to the SQLite database.
 * @returns {Object} Shared SQLite compatibility adapter.
 */
function openDatabase(path) {
  if (adapter) {
    return adapter;
  }

  if (isBun()) {
    const { Database } = require("bun:sqlite");

    rawDb = new Database(path, {
      create: true,
      strict: true,
    });

    adapter = createAdapter(rawDb, "bun");
  } else {
    const { DatabaseSync } = require("node:sqlite");

    rawDb = new DatabaseSync(path);

    adapter = createAdapter(rawDb, "node");
  }

  return adapter;
}

/**
 * Returns the initialized SQLite compatibility adapter.
 *
 * `openDatabase()` must have been called before this function. SQLite stores
 * should normally use this function rather than opening their own connection.
 *
 * @returns {Object} Shared SQLite compatibility adapter.
 * @throws {Error} If the SQLite database has not been initialized.
 */
function getDatabase() {
  if (!adapter) {
    throw new Error("SQLite database has not been initialized");
  }

  return adapter;
}

/**
 * Closes the shared SQLite database connection and clears the cached state.
 *
 * Calling this function when the database is not open is a no-op. After the
 * database is closed, `openDatabase()` may be called again to create a new
 * connection.
 *
 * @returns {void}
 */
function closeDatabase() {
  if (!adapter) {
    return;
  }

  adapter.close();

  adapter = null;
  rawDb = null;
}

module.exports = {
  openDatabase,
  getDatabase,
  closeDatabase,
};
