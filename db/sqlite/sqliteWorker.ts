import { parentPort, workerData } from "node:worker_threads";

import type {
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from "./sqliteWorkerProtocol";

if (!parentPort) {
  throw new Error("SQLite worker requires a parent port");
}

const port = parentPort;

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

type SqliteRuntime = "bun" | "node";

function isBun(): boolean {
  return Boolean(
    (
      process.versions as typeof process.versions & {
        bun?: string;
      }
    ).bun,
  );
}

const runtime: SqliteRuntime = isBun() ? "bun" : "node";

let db: NativeDatabase;

if (runtime === "bun") {
  const { Database } = require("bun:sqlite");

  db = new Database(workerData.path, {
    create: true,
    strict: true,
  }) as NativeDatabase;
} else {
  const { DatabaseSync } = require("node:sqlite");

  db = new DatabaseSync(workerData.path) as NativeDatabase;
}

function prepare(sql: string): PreparedStatement {
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
}
port.on("message", (request: SqliteWorkerRequest) => {
  try {
    let result: unknown;

    switch (request.type) {
      case "exec":
        db.exec(request.sql);
        result = undefined;
        break;

      case "get":
        result = prepare(request.sql).get(...request.params) ?? null;
        break;

      case "all":
        result = prepare(request.sql).all(...request.params);
        break;

      case "run": {
        const nativeResult = prepare(request.sql).run(...request.params);

        result = {
          changes: Number(nativeResult.changes),
          lastInsertRowid: nativeResult.lastInsertRowid,
        };
        break;
      }

      case "transaction": {
        db.exec("BEGIN");

        try {
          for (const statement of request.statements) {
            prepare(statement.sql).run(...statement.params);
          }

          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }

        result = undefined;
        break;
      }

      case "close":
        db.close();
        result = undefined;
        break;
    }

    const response: SqliteWorkerResponse = {
      id: request.id,
      success: true,
      result,
    };

    port.postMessage(response);
  } catch (error) {
    const response: SqliteWorkerResponse = {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    port.postMessage(response);
  }
});
