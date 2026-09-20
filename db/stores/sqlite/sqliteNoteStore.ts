import { randomUUID } from "node:crypto";

import { NoteStore, Note, CreateNoteData, UpdateNoteData } from "../noteStore";

import { getDatabase } from "../../sqlite/database";

interface NoteRow {
  id: string;
  name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

const toNote = (row: NoteRow): Note => {
  return {
    _id: row.id,
    name: row.name,
    content: row.content,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export class SqliteNoteStore extends NoteStore {
  async getAll(): Promise<Note[]> {
    const db = getDatabase();

    const rows = await db.all<NoteRow>(
      `
      SELECT
        id,
        name,
        content,
        created_at,
        updated_at
      FROM notes
      ORDER BY updated_at DESC
    `,
    );

    return rows.map(toNote);
  }

  async getById(id: string): Promise<Note | null> {
    const db = getDatabase();

    const row = await db.get<NoteRow>(
      `
      SELECT
        id,
        name,
        content,
        created_at,
        updated_at
      FROM notes
      WHERE id = ?
    `,
      id,
    );

    return row ? toNote(row) : null;
  }

  async create(data: CreateNoteData): Promise<Note> {
    const db = getDatabase();

    const id = randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `
        INSERT INTO notes (
          id,
          name,
          content,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      id,
      data.name ?? null,
      data.content,
      now,
      now,
    );

    const note = await this.getById(id);

    if (!note) {
      throw new Error(`Failed to retrieve created note ${id}`);
    }

    return note;
  }

  async update(id: string, data: UpdateNoteData): Promise<Note | null> {
    const db = getDatabase();

    const existing = await this.getById(id);

    if (!existing) {
      return null;
    }

    const name = data.name !== undefined ? data.name : existing.name;

    const content =
      data.content !== undefined ? data.content : existing.content;

    const updatedAt = new Date().toISOString();

    await db.run(
      `
        UPDATE notes
        SET
          name = ?,
          content = ?,
          updated_at = ?
        WHERE id = ?
      `,
      name,
      content,
      updatedAt,
      id,
    );

    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();

    const result = await db.run(
      `
        DELETE FROM notes
        WHERE id = ?
      `,
      id,
    );

    return (result.changes ?? 0) > 0;
  }
}
