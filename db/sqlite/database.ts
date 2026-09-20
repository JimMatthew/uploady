import { Worker } from "node:worker_threads";
import path from "node:path";

import type {
  SqliteTransactionStatement,
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from "./sqliteWorkerProtocol";

export type { SqliteTransactionStatement } from "./sqliteWorkerProtocol";

/**
 * Result returned by SQLite statements that modify the database.
 */
export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * Asynchronous SQLite interface exposed to the rest of Uploady.
 *
 * Although the underlying SQLite implementations use synchronous database
 * operations, those operations execute on a dedicated worker thread. This
 * adapter exposes them to the application as normal Promise-based methods.
 */
export interface SqliteAdapter {
  exec(sql: string): Promise<void>;

  get<T = unknown>(sql: string, ...params: unknown[]): Promise<T | null>;

  all<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]>;

  run(sql: string, ...params: unknown[]): Promise<SqliteRunResult>;

  transaction(statements: SqliteTransactionStatement[]): Promise<void>;

  close(): Promise<void>;
}

/**
 * Promise callbacks associated with a request currently being processed by
 * the SQLite worker.
 *
 * Requests are stored by ID until the corresponding worker response arrives.
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

// SQLite uses a single worker and adapter instance for the application process.
let worker: Worker | null = null;
let adapter: SqliteAdapter | null = null;

// Each worker request receives a unique ID so asynchronous responses can be
// matched back to the Promise created for the original operation.
let nextRequestId = 1;

const pending = new Map<number, PendingRequest>();

/**
 * Sends a database operation to the SQLite worker and returns a Promise for
 * its eventual result.
 *
 * The request type determines which fields are required by the worker
 * protocol. The generated request ID is used to correlate the worker's
 * response with the Promise returned to the caller.
 */
function request<T>(
  type: SqliteWorkerRequest["type"],
  sql?: string,
  params?: unknown[],
  statements?: SqliteTransactionStatement[],
): Promise<T> {
  const currentWorker = worker;

  if (!currentWorker) {
    return Promise.reject(new Error("SQLite worker has not been initialized"));
  }

  const id = nextRequestId++;

  let message: SqliteWorkerRequest;

  /*
   * Construct the appropriate discriminated-union request for the requested
   * database operation.
   */
  switch (type) {
    case "exec":
      if (sql === undefined) {
        return Promise.reject(new Error("SQLite exec request requires SQL"));
      }

      message = {
        id,
        type,
        sql,
      };
      break;

    case "get":
    case "all":
    case "run":
      if (sql === undefined) {
        return Promise.reject(new Error(`SQLite ${type} request requires SQL`));
      }

      message = {
        id,
        type,
        sql,
        params: params ?? [],
      };
      break;

    case "transaction":
      if (statements === undefined) {
        return Promise.reject(
          new Error("SQLite transaction request requires statements"),
        );
      }

      message = {
        id,
        type,
        statements,
      };
      break;

    case "close":
      message = {
        id,
        type,
      };
      break;
  }

  /*
   * Store the Promise callbacks before sending the message. When the worker
   * responds with this request ID, handleResponse() will resolve or reject
   * the corresponding Promise.
   */
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });

    currentWorker.postMessage(message);
  });
}

/**
 * Handles responses received from the SQLite worker.
 *
 * The response ID identifies the pending Promise for the original request.
 * Successful responses resolve that Promise; failed responses reject it.
 */
function handleResponse(response: SqliteWorkerResponse): void {
  const request = pending.get(response.id);

  // Ignore responses for requests that are no longer being tracked.
  if (!request) {
    return;
  }

  pending.delete(response.id);

  if (!response.success) {
    request.reject(new Error(response.error));
    return;
  }

  request.resolve(response.result);
}

/**
 * Rejects every outstanding database request.
 *
 * Used when the worker fails or exits unexpectedly so callers are not left
 * waiting indefinitely for responses that can no longer arrive.
 */
function rejectPending(error: Error): void {
  for (const request of pending.values()) {
    request.reject(error);
  }

  pending.clear();
}

/**
 * Creates the Promise-based database interface used by Uploady's stores.
 *
 * Each method translates a normal database operation into a request sent to
 * the SQLite worker. The worker performs the synchronous SQLite operation and
 * sends the result back to the main thread.
 */
function createAdapter(): SqliteAdapter {
  return {
    async exec(sql): Promise<void> {
      await request<void>("exec", sql);
    },

    async get<T = unknown>(
      sql: string,
      ...params: unknown[]
    ): Promise<T | null> {
      return request<T | null>("get", sql, params);
    },

    async all<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]> {
      return request<T[]>("all", sql, params);
    },

    async run(sql: string, ...params: unknown[]): Promise<SqliteRunResult> {
      return request<SqliteRunResult>("run", sql, params);
    },

    async transaction(statements: SqliteTransactionStatement[]): Promise<void> {
      await request<void>("transaction", undefined, undefined, statements);
    },

    async close(): Promise<void> {
      await request<void>("close");
    },
  };
}

/**
 * Initializes SQLite and returns the application's database adapter.
 *
 * A dedicated worker thread is created with the database path supplied through
 * workerData. Subsequent calls return the existing adapter rather than creating
 * another worker.
 *
 * Worker messages complete pending database requests, while worker failures
 * reject all outstanding operations.
 */
export function openDatabase(dbPath: string): SqliteAdapter {
  if (adapter) {
    return adapter;
  }

  worker = new Worker(path.join(__dirname, "sqliteWorker.js"), {
    workerData: {
      path: dbPath,
    },
  });

  // Responses from the worker resolve or reject the matching request Promise.
  worker.on("message", handleResponse);

  // A worker failure means its outstanding requests can no longer complete.
  worker.on("error", (error: unknown) => {
    const workerError =
      error instanceof Error ? error : new Error(String(error));

    rejectPending(workerError);
  });

  // Reject outstanding work if the worker terminates abnormally.
  worker.on("exit", (code) => {
    if (code !== 0) {
      rejectPending(new Error(`SQLite worker exited with code ${code}`));
    }

    worker = null;
  });

  adapter = createAdapter();

  return adapter;
}

/**
 * Returns the initialized SQLite adapter.
 *
 * openDatabase() must be called during application startup before database
 * stores attempt to access SQLite.
 */
export function getDatabase(): SqliteAdapter {
  if (!adapter) {
    throw new Error("SQLite database has not been initialized");
  }

  return adapter;
}

/**
 * Gracefully closes SQLite and shuts down its worker thread.
 *
 * The worker is first asked to close its database connection. After that
 * operation completes, the adapter is cleared and the worker is terminated.
 */
export async function closeDatabase(): Promise<void> {
  if (!adapter) {
    return;
  }

  await adapter.close();

  adapter = null;

  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
