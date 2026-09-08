const crypto = require("crypto");
const TransferJobStore = require("../transferJobStore");
const { getDatabase } = require("../../sqlite/database");
const { JobStatus } = require("../../../controllers/jobs/jobConstants");

const toTransferJob = (row) => {
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
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
  };
};

class SqliteTransferJobStore extends TransferJobStore {
  async create(data) {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    return this.findById(id);
  }

  async findById(id) {
    const db = getDatabase();

    return toTransferJob(
      db.get(
        `
          SELECT *
          FROM transfer_jobs
          WHERE id = ?
        `,
        String(id),
      ),
    );
  }

  async markExpanding(id) {
    const db = getDatabase();

    db.run(
      `
      UPDATE transfer_jobs
      SET
        status = ?,
        started_at = ?
      WHERE id = ?
    `,
      JobStatus.PLANNING,
      new Date().toISOString(),
      String(id),
    );

    return this.findById(id);
  }

  async markRunning(id, totalFiles) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_jobs
        SET
          status = ?,
          total_files = ?
        WHERE id = ?
      `,
      JobStatus.RUNNING,
      totalFiles,
      String(id),
    );

    return this.findById(id);
  }

  async markFailed(id, error) {
    const db = getDatabase();

    db.run(
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
      String(id),
    );

    return this.findById(id);
  }

  async setCurrentFile(id, filename) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_jobs
        SET current_file = ?
        WHERE id = ?
      `,
      filename,
      String(id),
    );

    return this.findById(id);
  }

  async incrementCompleted(id, bytes) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_jobs
        SET
          completed_files = completed_files + 1,
          transferred_bytes = transferred_bytes + ?
        WHERE id = ?
      `,
      bytes || 0,
      String(id),
    );

    return this.findById(id);
  }

  async incrementFailed(id) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_jobs
        SET failed_files = failed_files + 1
        WHERE id = ?
      `,
      String(id),
    );

    return this.findById(id);
  }

  async updateTotals(id, totalFiles, totalBytes) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_jobs
        SET
          total_files = ?,
          total_bytes = ?
        WHERE id = ?
      `,
      totalFiles,
      totalBytes,
      String(id),
    );

    return this.findById(id);
  }

  async finish(id, status) {
    const db = getDatabase();

    db.run(
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
      String(id),
    );

    return this.findById(id);
  }

  async listNewest() {
    const db = getDatabase();

    return db
      .all(
        `
        SELECT *
        FROM transfer_jobs
        ORDER BY created_at DESC
      `,
      )
      .map(toTransferJob);
  }

  async deleteById(id) {
    const db = getDatabase();

    return toTransferJob(
      db.get(
        `
          DELETE FROM transfer_jobs
          WHERE id = ?
          RETURNING *
        `,
        String(id),
      ),
    );
  }

  async findCompletedIds() {
    const db = getDatabase();

    return db
      .all(
        `
          SELECT id
          FROM transfer_jobs
          WHERE status = ?
        `,
        JobStatus.COMPLETED,
      )
      .map((row) => String(row.id));
  }

  async deleteByIds(ids) {
    if (!ids.length) {
      return 0;
    }

    const db = getDatabase();

    const normalizedIds = ids.map(String);
    const placeholders = normalizedIds.map(() => "?").join(", ");

    const result = db.run(
      `
        DELETE FROM transfer_jobs
        WHERE id IN (${placeholders})
      `,
      ...normalizedIds,
    );

    return result.changes;
  }
}

module.exports = SqliteTransferJobStore;
