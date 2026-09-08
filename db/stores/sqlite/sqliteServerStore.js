const ServerStore = require("../serverStore");
const { getDatabase } = require("../../sqlite/database");
const crypto = require("crypto");

const toServer = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    host: row.host,
    port: row.port,
    username: row.username,
    authType: row.auth_type,

    credentials: {
      password:
        row.password_iv && row.password_content && row.password_tag
          ? {
              iv: row.password_iv,
              content: row.password_content,
              tag: row.password_tag,
            }
          : undefined,
    },

    keyId: row.key_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

class SqliteServerStore extends ServerStore {
  async find() {
    const db = getDatabase();

    return db
      .all(
        `
        SELECT *
        FROM servers
        ORDER BY host ASC
      `,
      )
      .map(toServer);
  }

  async listSummary() {
    const db = getDatabase();

    return db
      .all(
        `
      SELECT
        id AS _id,
        host
      FROM servers
      ORDER BY host ASC
    `,
      )
      .map((row) => ({
        _id: String(row._id),
        host: row.host,
      }));
  }

  async findById(id) {
    const db = getDatabase();

    return toServer(
      db.get(
        `
          SELECT *
          FROM servers
          WHERE id = ?
        `,
        String(id),
      ),
    );
  }

  async create(data) {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `
        INSERT INTO servers (
          id,
          host,
          port,
          username,
          auth_type,
          password_iv,
          password_content,
          password_tag,
          key_id,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      data.host,
      data.port ?? 22,
      data.username,
      data.authType,

      data.credentials?.password?.iv ?? null,
      data.credentials?.password?.content ?? null,
      data.credentials?.password?.tag ?? null,

      data.keyId != null ? String(data.keyId) : null,

      now,
      now,
    );

    return this.findById(id);
  }

  async findByIdAndUpdate(id, update) {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const merged = {
      ...existing,
      ...update,
      credentials: {
        ...existing.credentials,
        ...update.credentials,
      },
    };

    const db = getDatabase();

    db.run(
      `
        UPDATE servers
        SET
          host = ?,
          port = ?,
          username = ?,
          auth_type = ?,
          password_iv = ?,
          password_content = ?,
          password_tag = ?,
          key_id = ?,
          updated_at = ?
        WHERE id = ?
      `,
      merged.host,
      merged.port,
      merged.username,
      merged.authType,

      merged.credentials?.password?.iv ?? null,
      merged.credentials?.password?.content ?? null,
      merged.credentials?.password?.tag ?? null,

      merged.keyId != null ? String(merged.keyId) : null,

      new Date().toISOString(),
      String(id),
    );

    return this.findById(id);
  }

  async deleteById(id) {
    const db = getDatabase();

    return toServer(
      db.get(
        `
          DELETE FROM servers
          WHERE id = ?
          RETURNING *
        `,
        String(id),
      ),
    );
  }

  async findSummariesByIds(ids) {
    if (!ids.length) {
      return [];
    }

    const db = getDatabase();

    const normalizedIds = ids.map(String);
    const placeholders = normalizedIds.map(() => "?").join(", ");

    return db
      .all(
        `
          SELECT
            id,
            host
          FROM servers
          WHERE id IN (${placeholders})
        `,
        ...normalizedIds,
      )
      .map((row) => ({
        _id: String(row.id),
        host: row.host,
      }));
  }
}

module.exports = SqliteServerStore;
