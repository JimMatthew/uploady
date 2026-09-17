export type SqliteWorkerRequest =
  | {
      id: number;
      type: "exec";
      sql: string;
    }
  | {
      id: number;
      type: "get";
      sql: string;
      params: unknown[];
    }
  | {
      id: number;
      type: "all";
      sql: string;
      params: unknown[];
    }
  | {
      id: number;
      type: "run";
      sql: string;
      params: unknown[];
    }
  | {
      id: number;
      type: "transaction";
      statements: SqliteTransactionStatement[];
    }
  | {
      id: number;
      type: "close";
    };

export type SqliteWorkerResponse =
  | {
      id: number;
      success: true;
      result: unknown;
    }
  | {
      id: number;
      success: false;
      error: string;
    };

    export interface SqliteTransactionStatement {
  sql: string;
  params: unknown[];
}