import { parentPort, workerData } from "node:worker_threads";

import type {
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from "./sqliteWorkerProtocol";

/**
 * SQLite runs inside a dedicated worker thread.
 *
 * All database operations are received from the parent thread as
 * SqliteWorkerRequest messages and returned as SqliteWorkerResponse messages.
 *
 * A parent port must therefore exist for this module to function.
 */
if (!parentPort) {
  throw new Error("SQLite worker requires a parent port");
}

// Preserve the narrowed parentPort type for use by the worker message handler.
const port = parentPort;

/**
 * Common prepared-statement interface implemented by the SQLite APIs used by
 * both Bun and Node.
 *
 * This keeps the rest of the worker independent of the runtime-specific
 * statement types.
 */
interface PreparedStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
}

/**
 * Minimal database interface required by the worker.
 *
 * Bun exposes prepared statements through query(), while Node exposes them
 * through prepare(). Both otherwise provide the operations needed here.
 */
interface NativeDatabase {
  exec(sql: string): unknown;
  query?(sql: string): PreparedStatement;
  prepare?(sql: string): PreparedStatement;
  close(): void;
}

type SqliteRuntime = "bun" | "node";

/**
 * Detects whether the worker is currently running under Bun.
 *
 * Bun exposes its version through process.versions.bun. Node does not define
 * that property.
 */
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

/**
 * Open the SQLite database using the implementation provided by the current
 * JavaScript runtime.
 *
 * workerData.path is supplied by the parent when this worker is created.
 *
 * Bun uses bun:sqlite, while Node uses the built-in node:sqlite DatabaseSync.
 * The synchronous APIs are intentional here because they execute on this
 * dedicated worker thread rather than blocking Uploady's main thread.
 */
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

/**
 * Prepares a SQL statement using the API provided by the active runtime.
 *
 * Bun calls this operation query(), while Node calls it prepare(). Normalizing
 * that difference here lets the request handler use the same statement API
 * regardless of which runtime started Uploady.
 */
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

/**
 * Execute SQLite requests sent by the parent thread.
 *
 * Each request contains an ID used to correlate the response with the original
 * operation. Successful operations return their result; failures are converted
 * into serializable error responses and sent back to the parent.
 */
port.on("message", (request: SqliteWorkerRequest) => {
  try {
    let result: unknown;

    switch (request.type) {
      // Execute raw SQL that does not require a returned row or statement result.
      case "exec":
        db.exec(request.sql);
        result = undefined;
        break;

      // Return the first matching row, normalizing "no row" to null.
      case "get":
        result = prepare(request.sql).get(...request.params) ?? null;
        break;

      // Return all rows produced by the statement.
      case "all":
        result = prepare(request.sql).all(...request.params);
        break;

      // Execute a mutating statement and return its write metadata.
      case "run": {
        const nativeResult = prepare(request.sql).run(...request.params);

        result = {
          changes: Number(nativeResult.changes),
          lastInsertRowid: nativeResult.lastInsertRowid,
        };
        break;
      }

      /*
       * Execute multiple statements atomically.
       *
       * Any failure rolls back every statement in the batch before the error is
       * returned to the parent.
       */
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

      // Close the worker's database connection.
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
    /*
     * Errors cannot simply be thrown across the worker boundary. Convert the
     * failure into the worker protocol's serializable error response instead.
     */
    const response: SqliteWorkerResponse = {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    port.postMessage(response);
  }
});
