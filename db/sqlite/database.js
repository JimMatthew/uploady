// db/sqlite/database.js

let rawDb = null;
let adapter = null;

function isBun() {
  return Boolean(process.versions?.bun);
}

function createAdapter(db, runtime) {
  const prepare = (sql) => {
    if (runtime === "bun") {
      return db.query(sql);
    }

    return db.prepare(sql);
  };

  return {
    exec(sql) {
      db.exec(sql);
    },

    get(sql, ...params) {
      const row = prepare(sql).get(...params);

      // Normalize Bun null and Node undefined.
      return row ?? null;
    },

    all(sql, ...params) {
      return prepare(sql).all(...params);
    },

    run(sql, ...params) {
      const result = prepare(sql).run(...params);

      return {
        changes: Number(result.changes),
        lastInsertRowid: result.lastInsertRowid,
      };
    },

    close() {
      db.close();
    },
  };
}

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

function getDatabase() {
  if (!adapter) {
    throw new Error("SQLite database has not been initialized");
  }

  return adapter;
}

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