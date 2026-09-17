import crypto from "node:crypto";

import {
  ActionStore,
  Action,
  ActionMode,
  CreateActionData,
  UpdateActionData,
} from "../actionStore";

import { getDatabase } from "../../sqlite/database";

interface ActionRow {
  id: string;
  name: string;
  description: string | null;
  server_id: string;
  command: string;
  mode: ActionMode;
  created_at: string;
  updated_at: string;
}

const toAction = (row: ActionRow | null): Action | null => {
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

export class SqliteActionStore extends ActionStore {
  async getAll(): Promise<Action[]> {
    const db = getDatabase();

    const rows = await db.all<ActionRow>(
      `
        SELECT *
        FROM actions
        ORDER BY created_at ASC
      `,
    );

    return rows.map((row) => {
      const action = toAction(row);

      if (!action) {
        throw new Error(`Failed to map action row ${row.id}`);
      }

      return action;
    });
  }

  async getById(id: string): Promise<Action | null> {
    const db = getDatabase();

    const row = await db.get<ActionRow>(
      `
        SELECT *
        FROM actions
        WHERE id = ?
      `,
      id,
    );

    return toAction(row);
  }

  async create(action: CreateActionData): Promise<Action> {
    const db = getDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
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
      action.serverId,
      action.command,
      action.mode ?? "capture",
      now,
      now,
    );

    const created = await this.getById(id);

    if (!created) {
      throw new Error("Failed to retrieve action after creation");
    }

    return created;
  }

  async update(id: string, updates: UpdateActionData): Promise<Action | null> {
    const existing = await this.getById(id);

    if (!existing) {
      return null;
    }

    const merged: Action = {
      ...existing,
      ...updates,
    };

    const db = getDatabase();

    await db.run(
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
      merged.description,
      merged.serverId,
      merged.command,
      merged.mode,
      new Date().toISOString(),
      id,
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<Action | null> {
    const db = getDatabase();

    const row = await db.get<ActionRow>(
      `
        DELETE FROM actions
        WHERE id = ?
        RETURNING *
      `,
      id,
    );

    return toAction(row);
  }
}
