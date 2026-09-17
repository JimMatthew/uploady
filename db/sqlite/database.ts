import { Worker } from "node:worker_threads";
import path from "node:path";

import type {
  SqliteTransactionStatement,
  SqliteWorkerRequest,
  SqliteWorkerResponse,
} from "./sqliteWorkerProtocol";
export type { SqliteTransactionStatement } from "./sqliteWorkerProtocol";
export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface SqliteAdapter {
  exec(sql: string): Promise<void>;

  get<T = unknown>(sql: string, ...params: unknown[]): Promise<T | null>;

  all<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]>;

  run(sql: string, ...params: unknown[]): Promise<SqliteRunResult>;

  transaction(statements: SqliteTransactionStatement[]): Promise<void>;

  close(): Promise<void>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let adapter: SqliteAdapter | null = null;

let nextRequestId = 1;

const pending = new Map<number, PendingRequest>();

function request<T>(
  type: SqliteWorkerRequest["type"],
  sql?: string,
  params?: unknown[],
  statements?: SqliteTransactionStatement[],
): Promise<T> {
  const currentWorker = worker;

  if (!currentWorker) {
    return Promise.reject(
      new Error("SQLite worker has not been initialized"),
    );
  }

  const id = nextRequestId++;

  let message: SqliteWorkerRequest;

  switch (type) {
    case "exec":
      if (sql === undefined) {
        return Promise.reject(
          new Error("SQLite exec request requires SQL"),
        );
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
        return Promise.reject(
          new Error(`SQLite ${type} request requires SQL`),
        );
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

  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });

    currentWorker.postMessage(message);
  });
}

function handleResponse(response: SqliteWorkerResponse): void {
  const request = pending.get(response.id);

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

function rejectPending(error: Error): void {
  for (const request of pending.values()) {
    request.reject(error);
  }

  pending.clear();
}

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

    async all<T = unknown>(
      sql: string,
      ...params: unknown[]
    ): Promise<T[]> {
      return request<T[]>("all", sql, params);
    },

    async run(
      sql: string,
      ...params: unknown[]
    ): Promise<SqliteRunResult> {
      return request<SqliteRunResult>("run", sql, params);
    },

    async transaction(
      statements: SqliteTransactionStatement[],
    ): Promise<void> {
      await request<void>(
        "transaction",
        undefined,
        undefined,
        statements,
      );
    },

    async close(): Promise<void> {
      await request<void>("close");
    },
  };
}

export function openDatabase(dbPath: string): SqliteAdapter {
  if (adapter) {
    return adapter;
  }

  worker = new Worker(
    path.join(__dirname, "sqliteWorker.js"),
    {
      workerData: {
        path: dbPath,
      },
    },
  );

  worker.on("message", handleResponse);

  worker.on("error", (error: unknown) => {
    const workerError =
      error instanceof Error
        ? error
        : new Error(String(error));

    rejectPending(workerError);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      rejectPending(
        new Error(`SQLite worker exited with code ${code}`),
      );
    }

    worker = null;
  });

  adapter = createAdapter();

  return adapter;
}

export function getDatabase(): SqliteAdapter {
  if (!adapter) {
    throw new Error("SQLite database has not been initialized");
  }

  return adapter;
}

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