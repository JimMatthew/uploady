const crypto = require("crypto");
const TransferItemStore = require("../transferItemStore");
const { getDatabase } = require("../../sqlite/database");
const {
  ItemStatus,
  ItemKind,
} = require("../../../controllers/jobs/jobConstants");

const toTransferItem = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    jobId: String(row.job_id),
    sourceServerId: row.source_server_id ?? null,
    sourceType: row.source_type ?? undefined,
    filename: row.filename,
    sourcePath: row.source_path ?? undefined,
    destinationPath: row.destination_path ?? undefined,
    kind: row.kind,
    status: row.status,
    rootItem: row.root_item,
    size: row.size,
    bytesTransferred: row.bytes_transferred,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error ?? undefined,
  };
};

class SqliteTransferItemStore extends TransferItemStore {
  async createMany(items) {
    if (!items.length) {
      return [];
    }

    const db = getDatabase();
    const created = [];

    db.exec("BEGIN");

    try {
      for (const item of items) {
        const id = crypto.randomUUID();
        const jobId = String(item.jobId);

        const sourceServerId =
          item.sourceServerId != null ? String(item.sourceServerId) : null;

        const sourceType = item.sourceType ?? null;
        const sourcePath = item.sourcePath ?? null;
        const destinationPath = item.destinationPath ?? null;
        const kind = item.kind ?? ItemKind.FILE;
        const status = item.status ?? ItemStatus.PENDING;
        const size = item.size ?? 0;
        const bytesTransferred = item.bytesTransferred ?? 0;

        db.run(
          `
          INSERT INTO transfer_items (
            id,
            job_id,
            source_server_id,
            source_type,
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          id,
          jobId,
          sourceServerId,
          sourceType,
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
        );

        created.push({
          _id: id,
          jobId,
          sourceServerId,
          sourceType: sourceType ?? undefined,
          filename: item.filename,
          sourcePath: sourcePath ?? undefined,
          destinationPath: destinationPath ?? undefined,
          kind,
          status,
          rootItem: item.rootItem,
          size,
          bytesTransferred,
          startedAt: undefined,
          completedAt: undefined,
          error: undefined,
        });
      }

      db.exec("COMMIT");

      return created;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  async findById(id) {
    const db = getDatabase();

    return toTransferItem(
      db.get(
        `
          SELECT *
          FROM transfer_items
          WHERE id = ?
        `,
        String(id),
      ),
    );
  }

  async findByJobId(jobId) {
    const db = getDatabase();

    return db
      .all(
        `
          SELECT *
          FROM transfer_items
          WHERE job_id = ?
        `,
        String(jobId),
      )
      .map(toTransferItem);
  }

  async findFilesByJobId(jobId) {
    const db = getDatabase();

    return db
      .all(
        `
          SELECT *
          FROM transfer_items
          WHERE job_id = ?
            AND kind = ?
        `,
        String(jobId),
        ItemKind.FILE,
      )
      .map(toTransferItem);
  }

  async deleteById(id) {
    const db = getDatabase();

    return toTransferItem(
      db.get(
        `
          DELETE FROM transfer_items
          WHERE id = ?
          RETURNING *
        `,
        String(id),
      ),
    );
  }

  async markStarted(id) {
    const db = getDatabase();

    db.run(
      `
        UPDATE transfer_items
        SET
          status = ?,
          started_at = ?
        WHERE id = ?
      `,
      ItemStatus.IN_PROGRESS,
      new Date().toISOString(),
      String(id),
    );

    return this.findById(id);
  }

  async markCompleted(id, size) {
    const db = getDatabase();

    db.run(
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
      String(id),
    );

    return this.findById(id);
  }

  async markFailed(id, error) {
    const db = getDatabase();

    db.run(
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
      String(id),
    );

    return this.findById(id);
  }

  async getSourceServerIdsByJobIds(jobIds) {
    if (!jobIds.length) {
      return {};
    }

    const db = getDatabase();

    const ids = jobIds.map(String);
    const placeholders = ids.map(() => "?").join(", ");

    const rows = db.all(
      `
        SELECT DISTINCT
          job_id,
          source_server_id
        FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...ids,
    );

    const result = {};

    for (const row of rows) {
      if (!result[row.job_id]) {
        result[row.job_id] = [];
      }

      result[row.job_id].push(row.source_server_id ?? null);
    }

    return result;
  }

  async getSourcesByJobIds(jobIds) {
    if (!jobIds.length) {
      return {};
    }

    const db = getDatabase();

    const ids = jobIds.map(String);
    const placeholders = ids.map(() => "?").join(", ");

    const rows = db.all(
      `
        SELECT DISTINCT
          job_id,
          source_type,
          source_server_id
        FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...ids,
    );

    const result = {};

    for (const row of rows) {
      if (!result[row.job_id]) {
        result[row.job_id] = [];
      }

      result[row.job_id].push({
        sourceType: row.source_type ?? null,
        sourceServerId: row.source_server_id ?? null,
      });
    }

    return result;
  }

  async findPageByJobId(jobId, { status, page, limit }) {
    const db = getDatabase();

    const offset = (page - 1) * limit;

    let where = "job_id = ?";
    const params = [String(jobId)];

    if (status && status !== "all") {
      where += " AND status = ?";
      params.push(status);
    }

    const items = db
      .all(
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
      )
      .map(toTransferItem);

    const count = db.get(
      `
        SELECT COUNT(*) AS total
        FROM transfer_items
        WHERE ${where}
      `,
      ...params,
    );

    return {
      items,
      total: Number(count.total),
    };
  }

  async findFailedByJobId(jobId) {
    const db = getDatabase();

    return db
      .all(
        `
          SELECT *
          FROM transfer_items
          WHERE job_id = ?
            AND status = ?
        `,
        String(jobId),
        ItemStatus.FAILED,
      )
      .map(toTransferItem);
  }

  async deleteByJobId(jobId) {
    const db = getDatabase();

    return db.run(
      `
        DELETE FROM transfer_items
        WHERE job_id = ?
      `,
      String(jobId),
    ).changes;
  }

  async deleteByJobIds(jobIds) {
    if (!jobIds.length) {
      return 0;
    }

    const db = getDatabase();

    const ids = jobIds.map(String);
    const placeholders = ids.map(() => "?").join(", ");

    return db.run(
      `
        DELETE FROM transfer_items
        WHERE job_id IN (${placeholders})
      `,
      ...ids,
    ).changes;
  }
}

module.exports = SqliteTransferItemStore;
