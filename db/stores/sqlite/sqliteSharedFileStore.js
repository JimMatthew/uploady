const SharedFileStore = require("../sharedFileStore");
const { getDatabase } = require("../../sqlite/database");

const toSharedFile = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    fileName: row.file_name,
    filePath: row.file_path,
    link: row.link,
    token: row.token,
    isRemote: Boolean(row.is_remote),
    serverId: row.server_id ?? undefined,
    serverName: row.server_name ?? undefined,
    sharedAt: new Date(row.shared_at),
  };
};

class SqliteSharedFileStore extends SharedFileStore {
  async create(data) {
    const db = getDatabase();

    const row = db.get(
      `
        INSERT INTO shared_files (
          file_name,
          file_path,
          link,
          token,
          is_remote,
          server_id,
          server_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
      data.fileName,
      data.filePath,
      data.link,
      data.token,
      data.isRemote ? 1 : 0,
      data.serverId ?? null,
      data.serverName ?? null,
    );

    return toSharedFile(row);
  }

  async findByToken(token) {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE token = ?
      `,
      token,
    );

    return toSharedFile(row);
  }

  async deleteByToken(token) {
    const db = getDatabase();

    const row = db.get(
      `
        DELETE FROM shared_files
        WHERE token = ?
        RETURNING *
      `,
      token,
    );

    return toSharedFile(row);
  }

  async deleteByPath(filePath, fileName) {
    const db = getDatabase();

    const row = db.get(
      `
        DELETE FROM shared_files
        WHERE file_path = ?
          AND file_name = ?
        RETURNING *
      `,
      filePath,
      fileName,
    );

    return toSharedFile(row);
  }

  async findByFile(fileName, filePath) {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE file_name = ?
          AND file_path = ?
        LIMIT 1
      `,
      fileName,
      filePath,
    );

    return toSharedFile(row);
  }

  async list() {
    const db = getDatabase();

    const rows = db.all(`
      SELECT *
      FROM shared_files
      ORDER BY shared_at DESC
    `);

    return rows.map(toSharedFile);
  }

  async findRemoteShare(fileName, filePath, serverId) {
    const db = getDatabase();

    const row = db.get(
      `
        SELECT *
        FROM shared_files
        WHERE file_name = ?
          AND file_path = ?
          AND server_id = ?
          AND is_remote = 1
        LIMIT 1
      `,
      fileName,
      filePath,
      serverId,
    );

    return toSharedFile(row);
  }
}

module.exports = SqliteSharedFileStore;
