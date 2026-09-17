import crypto from "node:crypto";

import {
  TransferItemStore,
  type CreateTransferItemData,
  type TransferItem,
  type TransferItemPage,
  type TransferItemPageOptions,
  type TransferSource,
  type TransferSourceType,
} from "../transferItemStore";

import {
  getDatabase,
  type SqliteTransactionStatement,
} from "../../sqlite/database";

import { ItemStatus, ItemKind } from "../../../controllers/jobs/jobConstants";

interface TransferItemRow {
  id: string;
  job_id: string;

  source_server_id: string | null;
  source_type: TransferSourceType | null;

  archive_path: string | null;

  filename: string;
  source_path: string | null;
  destination_path: string | null;

  kind: ItemKind;
  status: ItemStatus;

  root_item: string;

  size: number;
  bytes_transferred: number;

  started_at: string | null;
  completed_at: string | null;

  error: string | null;
}

interface SourceServerRow {
  job_id: string;
  source_server_id: string | null;
}

interface SourceRow {
  job_id: string;
  source_type: TransferSourceType | null;
  source_server_id: string | null;
}

interface CountRow {
  total: number;
}

function toTransferItem(row: TransferItemRow | null): TransferItem | null {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    jobId: String(row.job_id),

    sourceServerId: row.source_server_id ?? null,

    sourceType: row.source_type ?? "local",

    ...(row.archive_path != null ? { archivePath: row.archive_path } : {}),

    filename: row.filename,

    ...(row.source_path != null ? { sourcePath: row.source_path } : {}),

    ...(row.destination_path != null
      ? { destinationPath: row.destination_path }
      : {}),

    kind: row.kind,
    status: row.status,

    rootItem: row.root_item,

    size: row.size,
    bytesTransferred: row.bytes_transferred,

    ...(row.started_at ? { startedAt: new Date(row.started_at) } : {}),

    ...(row.completed_at ? { completedAt: new Date(row.completed_at) } : {}),

    ...(row.error != null ? { error: row.error } : {}),
  };
}

export class SqliteTransferItemStore extends TransferItemStore {
  async createMany(items: CreateTransferItemData[]): Promise<TransferItem[]> {
    if (!items.length) {
      return [];
    }

    const db = getDatabase();

    const created: TransferItem[] = [];
    const statements: SqliteTransactionStatement[] = [];

    for (const item of items) {
      const id = crypto.randomUUID();

      const jobId = String(item.jobId);

      const sourceServerId =
        item.sourceServerId != null ? String(item.sourceServerId) : null;

      const sourceType = item.sourceType ?? "local";

      const archivePath = item.archivePath ?? null;

      const sourcePath = item.sourcePath ?? null;

      const destinationPath = item.destinationPath ?? null;

      const kind = item.kind ?? ItemKind.FILE;

      const status = item.status ?? ItemStatus.PENDING;

      const size = item.size ?? 0;

      const bytesTransferred = item.bytesTransferred ?? 0;

      statements.push({
        sql: `
          INSERT INTO transfer_items (
            id,
            job_id,
            source_server_id,
            source_type,
            archive_path,
            filename,
            source_path,
            destination_path,
            kind,
            status,
            root_item,
            size,
            bytes_transferred,
            started_at,
            completed_at,
            error
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
          )
        `,
        params: [
          id,
          jobId,
          sourceServerId,
          sourceType,
          archivePath,
          item.filename,
          sourcePath,
          destinationPath,
          kind,
          status,
          item.rootItem,
          size,
          bytesTransferred,
          null,
          null,
          null,
        ],
      });

      created.push({
        _id: id,
        jobId,

        sourceServerId,
        sourceType,

        ...(archivePath != null ? { archivePath } : {}),

        filename: item.filename,

        ...(sourcePath != null ? { sourcePath } : {}),

        ...(destinationPath != null ? { destinationPath } : {}),

        kind,
        status,

        rootItem: item.rootItem,

        size,
        bytesTransferred,
      });
    }

    await db.transaction(statements);

    return created;
  }

  private async findById(id: string): Promise<TransferItem | null> {
    const db = getDatabase();

    const row = await db.get<TransferItemRow>(
      `
        SELECT *
        FROM transfer_items
        WHERE id = ?
      `,
      id,
    );

    return toTransferItem(row);
  }

  async findByJobId(jobId: string): Promise<TransferItem[]> {
    const db = getDatabase();

    const rows = await db.all<TransferItemRow>(
      `
        SELECT *
        FROM transfer_items
        WHERE job_id = ?
      `,
      jobId,
    );

    return rows
      .map(toTransferItem)
      .filter((item): item is TransferItem => item !== null);
  }

  async findFilesByJobId(jobId: string): Promise<TransferItem[]> {
    const db = getDatabase();

    const rows = await db.all<TransferItemRow>(
      `
        SELECT *
        FROM transfer_items
        WHERE job_id = ?
          AND kind = ?
      `,
      jobId,
      ItemKind.FILE,
    );

    return rows
      .map(toTransferItem)
      .filter((item): item is TransferItem => item !== null);
  }

  async deleteById(id: string): Promise<void> {
    const db = getDatabase();

    await db.run(
      `
        DELETE FROM transfer_items
        WHERE id = ?
      `,
      id,
    );
  }

  async markStarted(id: string): Promise<void> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_items
        SET
          status = ?,
          started_at = ?
        WHERE id = ?
      `,
      ItemStatus.IN_PROGRESS,
      new Date().toISOString(),
      id,
    );
  }

  async markCompleted(id: string, size: number): Promise<TransferItem | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_items
        SET
          status = ?,
          completed_at = ?,
          size = ?
        WHERE id = ?
      `,
      ItemStatus.COMPLETED,
      new Date().toISOString(),
      size,
      id,
    );

    return this.findById(id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_items
        SET
          status = ?,
          error = ?,
          completed_at = ?
        WHERE id = ?
      `,
      ItemStatus.FAILED,
      error,
      new Date().toISOString(),
      id,
    );
  }

  async updateSize(id: string, size: number): Promise<void> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_items
        SET size = ?
        WHERE id = ?
      `,
      size,
      id,
    );
  }

  async getSourceServerIdsByJobIds(
    jobIds: string[],
  ): Promise<Record<string, Array<string | null>>> {
    if (!jobIds.length) {
      return {};
    }

    const db = getDatabase();

    const placeholders = jobIds.map(() => "?").join(", ");

    const rows = await db.all<SourceServerRow>(
      `
        SELECT DISTINCT
          job_id,
          source_server_id
        FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...jobIds,
    );

    const result: Record<string, Array<string | null>> = {};

    for (const row of rows) {
      result[row.job_id] ??= [];
      result[row.job_id].push(row.source_server_id ?? null);
    }

    return result;
  }

  async getSourcesByJobIds(
    jobIds: string[],
  ): Promise<Record<string, TransferSource[]>> {
    if (!jobIds.length) {
      return {};
    }

    const db = getDatabase();

    const placeholders = jobIds.map(() => "?").join(", ");

    const rows = await db.all<SourceRow>(
      `
        SELECT DISTINCT
          job_id,
          source_type,
          source_server_id
        FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...jobIds,
    );

    const result: Record<string, TransferSource[]> = {};

    for (const row of rows) {
      result[row.job_id] ??= [];

      result[row.job_id].push({
        sourceType: row.source_type ?? "local",
        sourceServerId: row.source_server_id ?? null,
      });
    }

    return result;
  }

  async findPageByJobId(
    jobId: string,
    { status, page, limit }: TransferItemPageOptions,
  ): Promise<TransferItemPage> {
    const db = getDatabase();

    const offset = (page - 1) * limit;

    let where = "job_id = ?";

    const params: Array<string | number> = [jobId];

    if (status) {
      where += " AND status = ?";
      params.push(status);
    }

    const rows = await db.all<TransferItemRow>(
      `
        SELECT *
        FROM transfer_items
        WHERE ${where}
        LIMIT ?
        OFFSET ?
      `,
      ...params,
      limit,
      offset,
    );

    const items = rows
      .map(toTransferItem)
      .filter((item): item is TransferItem => item !== null);

    const count = await db.get<CountRow>(
      `
        SELECT COUNT(*) AS total
        FROM transfer_items
        WHERE ${where}
      `,
      ...params,
    );

    if (!count) {
      throw new Error(`Failed to count transfer items for job ${jobId}`);
    }

    return {
      items,
      total: Number(count.total),
    };
  }

  async findFailedByJobId(jobId: string): Promise<TransferItem[]> {
    const db = getDatabase();

    const rows = await db.all<TransferItemRow>(
      `
        SELECT *
        FROM transfer_items
        WHERE job_id = ?
          AND status = ?
      `,
      jobId,
      ItemStatus.FAILED,
    );

    return rows
      .map(toTransferItem)
      .filter((item): item is TransferItem => item !== null);
  }

  async deleteByJobId(jobId: string): Promise<number> {
    const db = getDatabase();

    const result = await db.run(
      `
        DELETE FROM transfer_items
        WHERE job_id = ?
      `,
      jobId,
    );

    return result.changes;
  }

  async deleteByJobIds(jobIds: string[]): Promise<number> {
    if (!jobIds.length) {
      return 0;
    }

    const db = getDatabase();

    const placeholders = jobIds.map(() => "?").join(", ");

    const result = await db.run(
      `
        DELETE FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...jobIds,
    );

    return result.changes;
  }
}
