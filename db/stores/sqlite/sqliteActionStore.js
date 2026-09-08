const ActionStore = require("../actionStore");
const { getDatabase } = require("../../sqlite/database");
const crypto = require("crypto");

const toAction = (row) => {
  if (!row) {
    return null;
  }

  return {
    _id: String(row.id),
    name: row.name,
    description: row.description ?? "",
    serverId: String(row.server_id),
    command: row.command,
    mode: row.mode,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

class SqliteActionStore extends ActionStore {
  async getAll() {
    const db = getDatabase();

    return db
      .all(
        `
        SELECT *
        FROM actions
        ORDER BY created_at ASC
      `,
      )
      .map(toAction);
  }

  async getById(id) {
    const db = getDatabase();

    return toAction(
      db.get(
        `
          SELECT *
          FROM actions
          WHERE id = ?
        `,
        String(id),
      ),
    );
  }

  async create(action) {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `
        INSERT INTO actions (
          id,
          name,
          description,
          server_id,
          command,
          mode,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      action.name,
      action.description ?? null,
      String(action.serverId),
      action.command,
      action.mode,
      now,
      now,
    );

    return this.getById(id);
  }

  async update(id, updates) {
    const existing = await this.getById(id);

    if (!existing) {
      return null;
    }

    const merged = {
      ...existing,
      ...updates,
    };

    const db = getDatabase();

    db.run(
      `
        UPDATE actions
        SET
          name = ?,
          description = ?,
          server_id = ?,
          command = ?,
          mode = ?,
          updated_at = ?
        WHERE id = ?
      `,
      merged.name,
      merged.description ?? null,
      String(merged.serverId),
      merged.command,
      merged.mode,
      new Date().toISOString(),
      String(id),
    );

    return this.getById(id);
  }

  async delete(id) {
    const db = getDatabase();

    return toAction(
      db.get(
        `
          DELETE FROM actions
          WHERE id = ?
          RETURNING *
        `,
        String(id),
      ),
    );
  }
}

module.exports = SqliteActionStore;
