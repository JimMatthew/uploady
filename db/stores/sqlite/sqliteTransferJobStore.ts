import crypto from "node:crypto";

import {
  TransferJobStore,
  type CreateTransferJobData,
  type TransferJob,
  TransferJobPersistenceBatch,
} from "../transferJobStore";

import { getDatabase } from "../../sqlite/database";

import {
  JobStatus,
  type JobStatus as JobStatusType,
} from "../../../controllers/jobs/jobConstants";
import { propIfPresent } from "../../../shared/utils/PropHelper";

interface TransferJobRow {
  id: string;

  status: JobStatusType;
  type: string;

  dest_server_id: string | null;
  dest_path: string;

  current_file: string | null;

  total_files: number;
  completed_files: number;
  failed_files: number;

  total_bytes: number;
  transferred_bytes: number;

  error: string | null;

  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

interface IdRow {
  id: string;
}

function toTransferJob(row: TransferJobRow | null): TransferJob | null {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),

    status: row.status,
    type: row.type,

    destServerId: row.dest_server_id ?? null,
    destPath: row.dest_path,

    currentFile: row.current_file ?? null,
    totalFiles: row.total_files,
    completedFiles: row.completed_files,
    failedFiles: row.failed_files,
    totalBytes: row.total_bytes,
    transferredBytes: row.transferred_bytes,
    error: row.error ?? null,
    createdAt: new Date(row.created_at),
    ...propIfPresent(
      "startedAt",
      row.started_at ? new Date(row.started_at) : undefined,
    ),

    ...propIfPresent(
      "finishedAt",
      row.finished_at ? new Date(row.finished_at) : undefined,
    ),
  };
}

export class SqliteTransferJobStore extends TransferJobStore {
  async create(data: CreateTransferJobData): Promise<TransferJob> {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `
        INSERT INTO transfer_jobs (
          id,
          status,
          type,
          dest_server_id,
          dest_path,
          current_file,
          total_files,
          completed_files,
          failed_files,
          total_bytes,
          transferred_bytes,
          error,
          created_at,
          started_at,
          finished_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `,
      id,
      data.status ?? JobStatus.QUEUED,
      data.type ?? "copy",
      data.destServerId != null ? String(data.destServerId) : null,
      data.destPath,

      null,
      0,
      0,
      0,
      0,
      0,

      null,
      now,
      null,
      null,
    );

    const job = await this.findById(id);

    if (!job) {
      throw new Error(`Failed to create transfer job ${id}`);
    }

    return job;
  }

  async findById(id: string): Promise<TransferJob | null> {
    const db = getDatabase();

    const row = await db.get<TransferJobRow>(
      `
        SELECT *
        FROM transfer_jobs
        WHERE id = ?
      `,
      id,
    );

    return toTransferJob(row);
  }

  async persistBatch(batch: TransferJobPersistenceBatch): Promise<void> {
    const db = getDatabase();

    await db.run(
      `
      UPDATE transfer_jobs
      SET
        current_file = COALESCE(?, current_file),
        completed_files = completed_files + ?,
        transferred_bytes = transferred_bytes + ?,
        failed_files = failed_files + ?
      WHERE id = ?
    `,
      batch.currentFile ?? null,
      batch.completedFiles,
      batch.transferredBytes,
      batch.failedFiles,
      batch.jobId,
    );
  }
  async markExpanding(id: string): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET
          status = ?,
          started_at = ?
        WHERE id = ?
      `,
      JobStatus.PLANNING,
      new Date().toISOString(),
      id,
    );

    return this.findById(id);
  }

  async markRunning(id: string): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
      UPDATE transfer_jobs
      SET status = ?
      WHERE id = ?
    `,
      JobStatus.RUNNING,
      id,
    );

    return this.findById(id);
  }

  async markFailed(id: string, error: string): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET
          status = ?,
          error = ?,
          finished_at = ?
        WHERE id = ?
      `,
      JobStatus.FAILED,
      error,
      new Date().toISOString(),
      id,
    );

    return this.findById(id);
  }

  async setCurrentFile(
    id: string,
    filename: string,
  ): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET current_file = ?
        WHERE id = ?
      `,
      filename,
      id,
    );

    return this.findById(id);
  }

  async incrementCompleted(
    id: string,
    bytes: number,
  ): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET
          completed_files =
            completed_files + 1,
          transferred_bytes =
            transferred_bytes + ?
        WHERE id = ?
      `,
      bytes || 0,
      id,
    );

    return this.findById(id);
  }

  async incrementFailed(id: string): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET failed_files =
          failed_files + 1
        WHERE id = ?
      `,
      id,
    );

    return this.findById(id);
  }

  async updateTotals(
    id: string,
    totalFiles: number,
    totalBytes: number,
    totalFailed: number,
  ): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET
          total_files = ?,
          total_bytes = ?,
          failed_files = ?
        WHERE id = ?
      `,
      totalFiles,
      totalBytes,
      totalFailed,
      id,
    );

    return this.findById(id);
  }

  async finish(id: string, status: JobStatusType): Promise<TransferJob | null> {
    const db = getDatabase();

    await db.run(
      `
        UPDATE transfer_jobs
        SET
          status = ?,
          finished_at = ?,
          current_file = NULL
        WHERE id = ?
      `,
      status,
      new Date().toISOString(),
      id,
    );

    return this.findById(id);
  }

  async listNewest(): Promise<TransferJob[]> {
    const db = getDatabase();

    const rows = await db.all<TransferJobRow>(
      `
        SELECT *
        FROM transfer_jobs
        ORDER BY created_at DESC
      `,
    );

    return rows
      .map(toTransferJob)
      .filter((job): job is TransferJob => job !== null);
  }

  async deleteById(id: string): Promise<TransferJob | null> {
    const db = getDatabase();

    const row = await db.get<TransferJobRow>(
      `
        DELETE FROM transfer_jobs
        WHERE id = ?
        RETURNING *
      `,
      id,
    );

    return toTransferJob(row);
  }

  async findCompletedIds(): Promise<string[]> {
    const db = getDatabase();

    const rows = await db.all<IdRow>(
      `
        SELECT id
        FROM transfer_jobs
        WHERE status = ?
      `,
      JobStatus.COMPLETED,
    );

    return rows.map((row) => String(row.id));
  }

  async deleteByIds(ids: string[]): Promise<number> {
    if (!ids.length) {
      return 0;
    }

    const db = getDatabase();
    const normalizedIds = ids.map(String);
    const placeholders = normalizedIds.map(() => "?").join(", ");

    const result = await db.run(
      `
        DELETE FROM transfer_jobs
        WHERE id IN (${placeholders})
      `,
      ...normalizedIds,
    );

    return result.changes;
  }
}
