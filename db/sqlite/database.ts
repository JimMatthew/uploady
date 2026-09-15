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
 * the SQLite stores.
 */

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface SqliteAdapter {
  exec(sql: string): void;

  get<T = unknown>(sql: string, ...params: unknown[]): T | null;

  all<T = unknown>(sql: string, ...params: unknown[]): T[];

  run(sql: string, ...params: unknown[]): SqliteRunResult;

  close(): void;
}

type SqliteRuntime = "bun" | "node";

interface PreparedStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
}

interface NativeDatabase {
  exec(sql: string): unknown;
  query?(sql: string): PreparedStatement;
  prepare?(sql: string): PreparedStatement;
  close(): void;
}

let rawDb: NativeDatabase | null = null;
let adapter: SqliteAdapter | null = null;

function isBun(): boolean {
  return Boolean(
    (
      process.versions as typeof process.versions & {
        bun?: string;
      }
    ).bun,
  );
}

function createAdapter(
  db: NativeDatabase,
  runtime: SqliteRuntime,
): SqliteAdapter {
  const prepare = (sql: string): PreparedStatement => {
    if (runtime === "bun") {
      if (!db.query) {
        throw new Error("Bun SQLite database does not support query()");
      }

      return db.query(sql);
    }

    if (!db.prepare) {
      throw new Error("Node SQLite database does not support prepare()");
    }

    return db.prepare(sql);
  };

  return {
    exec(sql) {
      db.exec(sql);
    },

    get<T = unknown>(sql: string, ...params: unknown[]): T | null {
      const row = prepare(sql).get(...params);

      return (row ?? null) as T | null;
    },

    all<T = unknown>(sql: string, ...params: unknown[]): T[] {
      return prepare(sql).all(...params) as T[];
    },

    run(sql: string, ...params: unknown[]): SqliteRunResult {
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

export function openDatabase(path: string): SqliteAdapter {
  if (adapter) {
    return adapter;
  }

  if (isBun()) {
    const { Database } = require("bun:sqlite");

    rawDb = new Database(path, {
      create: true,
      strict: true,
    }) as NativeDatabase;

    adapter = createAdapter(rawDb, "bun");
  } else {
    const { DatabaseSync } = require("node:sqlite");

    rawDb = new DatabaseSync(path) as NativeDatabase;

    adapter = createAdapter(rawDb, "node");
  }

  return adapter;
}

export function getDatabase(): SqliteAdapter {
  if (!adapter) {
    throw new Error("SQLite database has not been initialized");
  }

  return adapter;
}

export function closeDatabase(): void {
  if (!adapter) {
    return;
  }

  adapter.close();

  adapter = null;
  rawDb = null;
}
